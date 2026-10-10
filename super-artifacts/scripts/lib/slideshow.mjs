/**
 * R3 — the fallback tier, and the one that has to be honest about what it is.
 *
 * When there is no browser to drive, or nothing runnable to point one at, the
 * plugin still has the agent's own account of the change: the same tour spec,
 * minus anything that needed a page. This turns it into an auto-advancing,
 * captioned deck that watches like a video and renders anywhere.
 *
 * **It is labelled a slideshow, published as `kind: slideshow`, and never
 * described as a recording.** The globally-installed `/video` skill that
 * preceded this plugin built exactly this and called it a video overview, which
 * is why somebody could follow the documentation exactly and be surprised that
 * no video appeared. A fallback that hides being a fallback is how that happens.
 *
 * No speech synthesis. `docs/harness/README.md` argues the trade for the real
 * recorder and it applies identically here: captions survive muted autoplay —
 * which is how this is actually watched — they need no voice model, and they
 * diff as text in review.
 */

/**
 * HTML-escape, applied to everything the agent wrote.
 *
 * The deck is built by string concatenation, so a caption containing `<` or a
 * quote is a broken page or worse. This is the same class of failure
 * `injectManifest` guards: the deploy succeeds and the artifact is wrong.
 */
export const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Every caption in the spec, flattened into slides that know their change. */
export function slidesFrom(spec) {
  const slides = []
  for (const change of spec?.changes ?? []) {
    const captions = (change.steps ?? [])
      .map((step) => (typeof step?.say === 'string' ? step.say.trim() : ''))
      .filter((text) => text !== '')

    captions.forEach((text, index) => {
      slides.push({ change: change.title ?? 'Change', text, first: index === 0 })
    })
  }
  return slides
}

/**
 * The deck.
 *
 * Everything inline — no CDN, no external font, no build step. Those are blocked
 * on the serving plane and fail silently, which is the worst way for a
 * stylesheet to be missing.
 */
export function buildSlideshow(spec, { title, subtitle } = {}) {
  const slides = slidesFrom(spec)
  if (slides.length === 0) {
    throw new Error('there are no captions in the spec, so there is nothing to show.')
  }

  const heading = escapeHtml(title ?? 'Walkthrough')
  const sub = subtitle === undefined ? '' : `<p class="sub">${escapeHtml(subtitle)}</p>`

  const markup = slides
    .map(
      (slide, index) => `
    <section class="slide" data-index="${index}"${index === 0 ? ' data-active' : ''}>
      <p class="eyebrow">${escapeHtml(slide.change)}</p>
      <p class="say">${escapeHtml(slide.text)}</p>
    </section>`,
    )
    .join('')

  // Dwell scales with reading length, the same way the recorder holds a caption.
  const dwell = slides.map((slide) =>
    Math.max(2600, Math.round((slide.text.split(/\s+/).length / 3.2) * 1000)),
  )

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${heading}</title>
<style>
  :root { color-scheme: light dark; --ink:#12131a; --paper:#fbfbfd; --muted:#6b6f80; --line:#e4e5ec; }
  @media (prefers-color-scheme: dark) {
    :root { --ink:#f2f3f7; --paper:#101116; --muted:#9aa0b4; --line:#2a2c38; }
  }
  * { box-sizing: border-box; }
  body { margin:0; min-height:100vh; background:var(--paper); color:var(--ink);
         font:400 17px/1.6 ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;
         display:flex; flex-direction:column; }
  header { padding:24px 24px 0; }
  h1 { margin:0; font-size:19px; font-weight:600; letter-spacing:-0.01em; }
  .sub { margin:4px 0 0; color:var(--muted); font-size:15px; }
  .note { margin:12px 24px 0; padding:10px 14px; border:1px solid var(--line);
          border-radius:10px; color:var(--muted); font-size:13px; }
  main { flex:1; display:grid; place-items:center; padding:24px; }
  .slide { display:none; max-width:44rem; text-align:center; }
  .slide[data-active] { display:block; animation:rise 180ms ease both; }
  @keyframes rise { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  .eyebrow { margin:0 0 12px; color:var(--muted); font-size:13px; font-weight:600; }
  .say { margin:0; font-size:clamp(20px,3.4vw,30px); line-height:1.4; letter-spacing:-0.015em; }
  footer { display:flex; gap:12px; align-items:center; justify-content:center;
           padding:16px 24px 28px; border-top:1px solid var(--line); }
  button { font:inherit; font-size:14px; padding:8px 14px; border-radius:9px;
           border:1px solid var(--line); background:transparent; color:var(--ink); cursor:pointer; }
  button:hover { border-color:var(--muted); }
  .count { color:var(--muted); font-size:13px; font-variant-numeric:tabular-nums; }
  .bar { height:3px; background:var(--line); }
  .bar > i { display:block; height:100%; width:0; background:var(--ink); transition:width 200ms linear; }
  @media (prefers-reduced-motion: reduce) {
    .slide[data-active] { animation:none; }
    .bar > i { transition:none; }
  }
</style>
</head>
<body>
<header>
  <h1>${heading}</h1>
  ${sub}
</header>
<p class="note">A narrated slideshow, not a screen recording — this project had no browser the recorder could drive. Each beat advances on a timer; use the controls or the arrow keys to go at your own pace.</p>
<div class="bar"><i id="bar"></i></div>
<main id="deck">${markup}</main>
<footer>
  <button type="button" id="prev" aria-label="Previous">&larr;</button>
  <button type="button" id="play">Pause</button>
  <button type="button" id="next" aria-label="Next">&rarr;</button>
  <span class="count" id="count"></span>
</footer>
<script>
  const DWELL = ${JSON.stringify(dwell)}
  const slides = [...document.querySelectorAll('.slide')]
  const bar = document.getElementById('bar')
  const count = document.getElementById('count')
  const play = document.getElementById('play')
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  let at = 0
  let timer = null
  // Auto-advance is what makes it watch like a video rather than read like a
  // deck — but it is off under reduced motion, where it is the opposite of what
  // the setting asks for.
  let running = !reduced

  function show(next) {
    at = (next + slides.length) % slides.length
    slides.forEach((s, i) => s.toggleAttribute('data-active', i === at))
    count.textContent = (at + 1) + ' / ' + slides.length
    bar.style.width = (((at + 1) / slides.length) * 100) + '%'
    // The URL names the slide, so "slide 4 is wrong" is a link.
    history.replaceState(null, '', '#' + (at + 1))
    schedule()
  }
  function schedule() {
    clearTimeout(timer)
    if (running) timer = setTimeout(() => show(at + 1), DWELL[at] ?? 3000)
  }
  play.onclick = () => { running = !running; play.textContent = running ? 'Pause' : 'Play'; schedule() }
  document.getElementById('next').onclick = () => show(at + 1)
  document.getElementById('prev').onclick = () => show(at - 1)
  addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); show(at + 1) }
    if (e.key === 'ArrowLeft') show(at - 1)
  })
  play.textContent = running ? 'Pause' : 'Play'
  show(Math.max(0, (parseInt(location.hash.slice(1), 10) || 1) - 1))
</script>
</body>
</html>
`
}
