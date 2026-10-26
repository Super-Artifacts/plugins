---
name: super-artifacts
description: Publish a page, form, tracker, proof or plan to Super Artifacts as a live private URL, and read back what visitors submitted or commented. Use when the person names Super Artifacts or one of their artifacts, or asks to publish, update or read back something through it.
---

# Super Artifacts

The tools come from the `super-artifacts` MCP server. Hermes lists them as
`mcp__super_artifacts__<tool>`; below they are named by `<tool>` alone.

## Connect

Call `super_whoami` first and tell the person, once, which account it names.

No `super_*` tools, or a call refused as unauthorised, means the server is not
signed in. Do not edit Hermes config or run `hermes` commands to fix it: sign-in
needs the person's own consent in a browser. Give them these to type:

```
hermes mcp add super-artifacts --url https://superartifacts.app/mcp --auth oauth --connect-timeout 300
```

then `/reload-mcp` in the chat. To sign in again later with a short code
instead of a browser: `hermes mcp login super-artifacts --flow device`.

## Publish

- `super_publish {slug, title, html}`. The same slug publishes a new version at
  the same URL. Give the person the `url` from the result on a line of its own,
  every time.
- Images and video: stage them with `super_upload`, then publish with `uploads`.
- A page that collects answers declares a `policy` at publish. Read
  `super_help {topic: "data"}` before writing one: it has the page's write snippet.

## Private unless asked

Publish with `visibility: "private"`. Never widen who can open an artifact
(`super_artifact_set` visibility, `super_share`, a wider `super_project`) unless
the person asked for that artifact in this conversation. To look at a private
one, use `super_artifacts {artifact, open: true}`; never change visibility to look.

## Templates first

Before writing a page from nothing, try `super_templates {request: "<what they
want>"}`. A template with a runtime publishes as
`super_publish {template: {slug}, values}`; otherwise write the html and pass
`template: {slug}`. `super_help {topic: "templates"}` has the rest.

## Read back

`super_data {artifact}` returns rows, `super_data_query` totals,
`super_comments` the comments. Report what is there; never invent a row.

## Proofs and plans

A proof of a change, or a plan for someone to review, is an artifact like any
other: pictures and diagrams over prose, one stable slug per subject so each
update is a version, private. `super_templates {request: "proof"}` finds the
proof template.

`super_help {topic}` (`tools`, `data`, `templates`, `collections`, `projects`,
`batch`) answers anything else about how the tools fit together.
