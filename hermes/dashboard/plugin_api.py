"""Profile-scoped sign-in. Credentials never cross the dashboard's JS boundary."""
import asyncio
import json
import time
import secrets
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, HTTPException

router = APIRouter()
KEY = "SUPER_ARTIFACTS_KEY"
_flows = {}
_locks = {}


def host():
    try:
        from hermes_constants import get_hermes_home
        from hermes_cli.config import get_env_value, save_env_value, remove_env_value
        from tools.mcp_tool_loop import reconnect_mcp_server
        return get_hermes_home, get_env_value, save_env_value, remove_env_value, reconnect_mcp_server
    except ImportError:
        raise HTTPException(503, "Update Hermes to 0.23.0 or later.") from None


def profile():
    return str(host()[0]().resolve())


def origin():
    # Resolve the package's effective server so local tests exercise the same code.
    from tools.mcp_tool_config import _load_mcp_config
    from hermes_cli.plugins import discover_plugins
    discover_plugins()
    url = _load_mcp_config().get("super-artifacts", {}).get("url", "https://superartifacts.app/mcp")
    parsed = urlparse(url)
    if parsed.scheme != "https" and not (parsed.scheme == "http" and parsed.hostname in ("localhost", "127.0.0.1")):
        raise HTTPException(400, "The server must use HTTPS.")
    return url.removesuffix("/mcp").rstrip("/")


async def request(method, path, **kwargs):
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=False) as client:
            response = await client.request(method, origin() + path, **kwargs)
        data = response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(502, "Cannot reach Super Artifacts. Try again.") from None
    return response.status_code, data


def bearer():
    key = host()[1](KEY)
    if not key:
        raise HTTPException(401, "Connect your Super Artifacts account.")
    return {"Authorization": "Bearer " + key}


async def api(method, path):
    status, data = await request(method, path, headers=bearer())
    if status == 401:
        raise HTTPException(401, "This key no longer works. Disconnect and connect again.")
    if status >= 400:
        raise HTTPException(502, "Super Artifacts could not complete that request. Try again.")
    return data


def mcp_canary(expected_account):
    # Use Hermes's transport, resolution and tool discovery, rather than a fabricated count.
    from tools.mcp_tool_config import _load_mcp_config
    from hermes_cli.mcp_config import _resolve_mcp_server_config
    from tools.mcp_tool_loop import _ensure_mcp_loop, _run_on_mcp_loop
    from tools.mcp_tool_discovery import _connect_server
    from tools.mcp_oauth import suppress_interactive_oauth

    async def probe():
        server = await asyncio.wait_for(_connect_server("super-artifacts", _resolve_mcp_server_config(_load_mcp_config()["super-artifacts"])), 25)
        try:
            result = await server.session.list_tools()
            who = await server.session.call_tool("super_whoami", {})
            if getattr(who, "isError", False):
                raise RuntimeError("whoami failed")
            identity = json.loads("".join(getattr(part, "text", "") for part in who.content))
            if identity.get("handle") != expected_account:
                raise RuntimeError("MCP is connected to a different account")
            return len(result.tools)
        finally:
            await server.shutdown()
    _ensure_mcp_loop()
    with suppress_interactive_oauth():
        return _run_on_mcp_loop(probe(), timeout=35)


async def reload_gateway():
    """Ask the existing profile owner; never start a gateway or approve a cache rebuild."""
    guidance = "In your chat, run /reload-mcp and approve the reload."
    try:
        from hermes_cli.gateway_runtime import discover_gateway_endpoint
        from hermes_cli.gateway_client import connect_gateway
        async with asyncio.timeout(15):
            found = await asyncio.to_thread(discover_gateway_endpoint, host()[0]())
            if found.state != "ready" or found.endpoint is None:
                return {"status": "unavailable", "message": guidance}
            async with connect_gateway(endpoint=found.endpoint) as client:
                result = await client.rpc("reload.mcp", _timeout=10)
        if result.get("status") == "reloaded":
            return {"status": "reloaded", "message": "Chat tools reloaded."}
        return {"status": "confirm_required", "message": guidance}
    except Exception:
        # A saved key is still usable; report the failed cross-process sync instead of claiming chat readiness.
        return {"status": "unavailable", "message": guidance}


@router.get("/status")
async def status():
    if not host()[1](KEY):
        return {"connected": False}
    who = await api("GET", "/v1/whoami")
    try:
        count = await asyncio.to_thread(mcp_canary, who.get("handle"))
    except ImportError:
        raise HTTPException(503, "Update Hermes to 0.23.0 or later.") from None
    except Exception:
        return {"connected": True, "account": who.get("handle"), "ready": False,
                "message": "Key saved. MCP is unavailable. Try again."}
    return {"connected": True, "account": who.get("handle"), "ready": True, "tools": count}


def public_flow(flow):
    return {"id": flow["id"], "code": flow["user_code"], "url": flow["verification_uri_complete"],
            "expires_at": flow["expires"], "interval": flow["interval"], "state": "pending"}


@router.post("/auth/start")
async def start():
    p = profile()
    lock = _locks.setdefault(p, asyncio.Lock())
    async with lock:
        flow = _flows.get(p)
        if flow and flow["expires"] > time.time():
            return public_flow(flow)
        status, client = await request("POST", "/oauth/register", json={
            "client_name": "Hermes Super Artifacts", "redirect_uris": ["http://localhost/callback"],
            "grant_types": ["urn:ietf:params:oauth:grant-type:device_code"],
            "token_endpoint_auth_method": "none"})
        if status >= 400 or not client.get("client_id"):
            raise HTTPException(502, "Cannot start sign-in. Try again.")
        status, data = await request("POST", "/oauth/device_authorization", data={"client_id": client["client_id"]})
        if status >= 400 or not data.get("device_code"):
            raise HTTPException(502, "Cannot get a sign-in code. Try again.")
        flow = {**data, "id": secrets.token_urlsafe(20), "client_id": client["client_id"],
                "expires": time.time() + data["expires_in"], "interval": max(1, data.get("interval", 5)), "next": 0}
        _flows[p] = flow
        return public_flow(flow)


@router.get("/auth/status/{flow_id}")
async def poll(flow_id: str):
    p = profile()
    async with _locks.setdefault(p, asyncio.Lock()):
        flow = _flows.get(p)
        if not flow or flow["id"] != flow_id:
            raise HTTPException(404, "Sign-in was cancelled. Connect again.")
        if flow["expires"] <= time.time():
            del _flows[p]
            raise HTTPException(410, "Code expired. Connect again for a new code.")
        if time.time() < flow["next"]:
            return public_flow(flow)
        flow["next"] = time.time() + flow["interval"]
        code, data = await request("POST", "/oauth/token", data={
            "grant_type": "urn:ietf:params:oauth:grant-type:device_code",
            "client_id": flow["client_id"], "device_code": flow["device_code"]})
        if data.get("error") in ("authorization_pending", "slow_down"):
            if data["error"] == "slow_down":
                flow["interval"] += 5
                flow["next"] = time.time() + flow["interval"]
            return public_flow(flow)
        if code >= 400 or not data.get("access_token"):
            del _flows[p]
            message = "Sign-in denied. Connect again when ready." if data.get("error") == "access_denied" else "Code expired. Connect again for a new code."
            raise HTTPException(400, message)
        host()[2](KEY, data["access_token"])
        host()[4]("super-artifacts")
        del _flows[p]
        reload = await reload_gateway()
        return {"state": "connected", "gateway_reload": reload["status"], "message": reload["message"]}


@router.delete("/auth")
async def cancel():
    p = profile()
    async with _locks.setdefault(p, asyncio.Lock()):
        _flows.pop(p, None)
    return {"cancelled": True}


@router.post("/disconnect")
async def disconnect():
    p = profile()
    async with _locks.setdefault(p, asyncio.Lock()):
        _flows.pop(p, None)
        host()[3](KEY)
        host()[4]("super-artifacts")
    reload = await reload_gateway()
    return {"connected": False, "gateway_reload": reload["status"],
            "message": "Key removed from this profile. Existing chats may stay connected. Revoke the key at superartifacts.app/agents."}


@router.get("/artifacts")
async def artifacts():
    data = await api("GET", "/v1/artifacts")
    items = sorted(data.get("artifacts", []), key=lambda item: item.get("updatedAt", ""), reverse=True)
    return {"artifacts": items[:20]}


@router.post("/artifacts/{artifact}/open")
async def open_artifact(artifact: str):
    data = await api("POST", "/v1/artifacts/" + artifact + "/open")
    return {"url": data["url"]}
