(function () {
  'use strict'
  const SDK = window.__HERMES_PLUGIN_SDK__
  const { React } = SDK
  const { useState, useEffect } = SDK.hooks
  const { Card, CardHeader, CardContent, Button } = SDK.components
  const h = React.createElement
  const base = '/api/plugins/super-artifacts'
  const call = (path, method = 'GET') => SDK.fetchJSON(base + path, { method })

  function Page() {
    const [status, setStatus] = useState(null)
    const [flow, setFlow] = useState(null)
    const [items, setItems] = useState([])
    const [loadingArtifacts, setLoadingArtifacts] = useState(false)
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [now, setNow] = useState(Date.now())
    const [notice, setNotice] = useState('')

    async function refresh() {
      const next = await call('/status')
      setStatus(next)
      if (next.connected) {
        setLoadingArtifacts(true)
        try {
          const data = await call('/artifacts')
          setItems((data.artifacts || []).slice(0, 20))
        } finally { setLoadingArtifacts(false) }
      } else setItems([])
    }
    useEffect(() => { refresh().catch(e => setError(e.message)) }, [])
    useEffect(() => {
      if (!flow) return
      let active = true
      let timer
      const tick = setInterval(() => setNow(Date.now()), 1000)
      async function poll() {
        try {
          const next = await call('/auth/status/' + flow.id)
          if (!active) return
          if (next.state === 'connected') {
            setFlow(null)
            setNotice(next.message || '')
            await refresh()
          } else timer = setTimeout(poll, next.interval * 1000)
        } catch (e) {
          if (active) { setFlow(null); setError(e.message) }
        }
      }
      timer = setTimeout(poll, flow.interval * 1000)
      return () => { active = false; clearTimeout(timer); clearInterval(tick) }
    }, [flow])

    async function act(fn) {
      setBusy(true); setError(''); setNotice('')
      try { await fn() } catch (e) { setError(e.message) } finally { setBusy(false) }
    }
    async function open(item) {
      try {
        const data = await call('/artifacts/' + encodeURIComponent(item.id) + '/open', 'POST')
        window.location.assign(data.url)
      } catch (e) { setError(e.message) }
    }
    const remaining = flow ? Math.max(0, Math.ceil(flow.expires_at - now / 1000)) : 0
    return h('div', { className: 'flex flex-col gap-6 max-w-3xl text-foreground' },
      h(Card, null,
        h(CardHeader, null, h('h2', { className: 'text-lg font-medium' }, 'Connection')),
        h(CardContent, { className: 'flex flex-col gap-4' },
          error && h('p', { role: 'alert', className: 'text-sm break-words' }, error),
          notice && h('p', { role: 'status', className: 'text-sm' }, notice),
          h('p', { className: 'text-sm', role: 'status' }, status ? (status.connected ? 'Connected as ' + (status.account || 'your account') : 'Not connected') : 'Checking connection…'),
          status?.connected && h('p', { className: 'text-sm text-muted-foreground' }, status.ready ? 'Dashboard ready: ' + status.tools + ' tools' : status.message),
          status?.connected && h('p', { className: 'text-sm text-muted-foreground' }, 'If tools are missing in your chat, run /reload-mcp and approve the reload.'),
          !status?.connected && !flow && h('p', { className: 'text-sm text-muted-foreground' }, 'Connect to publish private pages and read back what people submit.'),
          flow ? h('div', { className: 'flex flex-col gap-3' },
            h('p', null, 'Approve this code in your browser.'),
            h('strong', { className: 'text-2xl font-mono tracking-wide' }, flow.code),
            h('a', { href: flow.url, target: '_blank', rel: 'noreferrer', className: 'underline underline-offset-4' }, 'Approve sign-in'),
            h('p', { className: 'text-sm text-muted-foreground' }, 'Expires in ' + Math.floor(remaining / 60) + ':' + String(remaining % 60).padStart(2, '0')),
            h(Button, { variant: 'outline', disabled: busy, onClick: () => act(async () => { await call('/auth', 'DELETE'); setFlow(null) }) }, 'Cancel'),
          ) : h('div', { className: 'flex flex-wrap gap-3' },
            status?.connected ? h(Button, { variant: 'outline', disabled: busy, onClick: () => act(async () => { const data = await call('/disconnect', 'POST'); setStatus(data); setItems([]); setNotice(data.message) }) }, 'Disconnect') : h(Button, { disabled: busy, onClick: () => act(async () => setFlow(await call('/auth/start', 'POST'))) }, busy ? 'Connecting…' : 'Connect'),
            h(Button, { variant: 'outline', disabled: busy, onClick: () => act(refresh) }, 'Check connection'),
          ),
          h('p', { className: 'text-sm text-muted-foreground' }, 'Hosted by Super Artifacts. Your key stays in this Hermes profile. New artifacts are private by default.'),
        ),
      ),
      status?.connected && h('section', { className: 'flex flex-col gap-3', 'aria-label': 'Recent artifacts' },
        h('h2', { className: 'text-lg font-medium' }, 'Recent artifacts'),
        loadingArtifacts && h('p', { role: 'status', className: 'text-sm text-muted-foreground' }, 'Loading artifacts…'),
        !loadingArtifacts && !items.length && h('p', { className: 'text-sm text-muted-foreground' }, 'No artifacts yet. Ask Hermes to make a page.'),
        ...items.map(item => h('div', { key: item.id, className: 'flex items-center justify-between gap-4 border-b border-border py-3' },
          h('span', { className: 'min-w-0 break-words text-sm' }, item.title || item.metadata?.title || item.slug || item.id),
          h(Button, { variant: 'outline', onClick: () => open(item), 'aria-label': 'Open ' + (item.title || item.metadata?.title || item.slug || item.id) }, 'Open'),
        )),
      ),
    )
  }
  window.__HERMES_PLUGINS__.register('super-artifacts', Page)
})()
