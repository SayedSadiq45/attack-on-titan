# 進撃の巨人 — ATTACK ON TITAN

Website Link

https://aura-attack-on-titan-sayed-sadiq.vercel.app/

A scroll-driven tribute site. No build step, no dependencies — plain HTML/CSS/JS.

## Run it

```
cd site
npx serve .          # or: python -m http.server 5173
```

Then open the printed URL. (Opening `index.html` directly with `file://` also works,
but a local server is better — image decoding and caching behave properly.)

## The three acts

| # | Section | Effect |
|---|---------|--------|
| I  | `#wall`   | 71-frame scroll-scrub — the Colossal Titan rising behind Wall Maria. Screen shake, chromatic ghosting, steam, and a shockwave at the breach. |
| II | `#eren`   | 32-frame scroll-scrub — the Attack Titan standing up out of Eren. Procedural lightning bolts and flash frames tied to scroll progress. |
| III| `#reveal` | Two stacked plates (`assets/reveal/bottom.jpg` + `top.jpg`) with a trailing, feathered spotlight that carves one out of the other. |

Between them: a scroll-velocity marquee, a four-layer parallax wall field,
a counted-up stat ledger, and a WebGL aurora finale.

## bottom.jpg

`assets/reveal/top.jpg` is the image you supplied (revealed under the cursor).
`assets/reveal/bottom.jpg` is the always-visible base plate — **drop it in and refresh.**

Until it exists the site derives a desaturated, blood-tinted stand-in from `top.jpg`
so the act still reads, and shows a small note on the section. Best results if
`bottom.jpg` matches `top.jpg`'s framing (1600×900, same crop and focal point) —
the reveal is most convincing when the two plates are pixel-aligned.

## reactbits.dev components

Ported to dependency-free vanilla JS in `main.js` (each marked with a banner comment):

`Aurora` (raw WebGL) · `ScrollVelocity` · `DecryptedText` · `SplitText`
`CountUp` · `ClickSpark` · `Magnet` · `TiltedCard` · `SpotlightCard`

## Assets

```
assets/frames/wall     71 × 1280×720   desktop
assets/frames/wall-sm  71 ×  720×405   < 820px viewports
assets/frames/eren     32 × 1280×720
assets/frames/eren-sm  32 ×  720×405
assets/reveal/top.jpg
assets/reveal/bottom.jpg   ← you supply
```

Regenerate from the source PNG zips with `../tools/convert.ps1` if you re-render frames.

## Tuning

- Scroll length per act: the `data-vh` attribute on each `<section class="scrub">`.
- Phase caption cut points and shake onset: the `phases` / `shakeFrom` options
  passed to `new Scrub(...)` in `main.js`.
- Spotlight size and trail length: `radius` / `TRAIL` in the reveal block.

`prefers-reduced-motion` removes the scrubbing, shake, cursor, lightning, and dust,
and renders each sequence's final frame statically.
