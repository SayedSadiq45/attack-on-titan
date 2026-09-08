# 進撃の巨人 | Attack on Titan

> A cinematic, scroll-driven tribute to the walls, the titan, and the will to move forward.

**Live experience:** [aura-attack-on-titan-sayed-sadiq.vercel.app](https://aura-attack-on-titan-sayed-sadiq.vercel.app/)

Created and designed by **Sayed Sadiq** under the **AURA** identity.

## The Experience

This is a dependency-free visual story built with plain HTML, CSS, and JavaScript. Scroll through three acts where image sequences, motion, light, and typography build the atmosphere of Attack on Titan.

### Act I: The Wall

71 scroll-scrubbed frames bring the Colossal Titan over Wall Maria. Steam, screen shake, chromatic ghosting, and a breach shockwave respond to the scroll position.

### Act II: Transform

32 frames capture the Attack Titan rising from Eren, accompanied by procedural lightning and flash moments tied directly to progress.

### Act III: Two Faces

A feathered spotlight moves across two aligned image plates, revealing the contrast between the boy and the titan beneath the same gaze.

Between the acts, the site adds velocity-driven typography, layered parallax, animated counters, and a WebGL aurora finale.

## Highlights

- No framework, build step, or external runtime dependency
- Responsive desktop and mobile frame sequences
- Canvas-based animation for smooth visual control
- WebGL aurora finale and procedural effects
- Reduced-motion support for a calmer static experience
- Japanese and English typography inspired by the source world

## Run Locally

From the repository root, start any static server:

```bash
npx serve .
```

Or use Python:

```bash
python -m http.server 5173
```

Then open the local URL shown in your terminal. A local server is recommended so image loading and caching behave consistently.

## Project Structure

```text
index.html                 Main experience and section structure
style.css                  Visual system, layout, and responsive styling
main.js                    Scroll choreography and canvas effects
assets/frames/wall         71 desktop Wall Maria frames
assets/frames/wall-sm      71 mobile Wall Maria frames
assets/frames/eren         32 desktop transformation frames
assets/frames/eren-sm      32 mobile transformation frames
assets/reveal/top.jpg      Foreground reveal plate
assets/reveal/bottom.jpg   Base reveal plate
```

For the strongest reveal effect, `top.jpg` and `bottom.jpg` should share the same framing and focal point. If the base plate is unavailable, the experience derives a tinted fallback from `top.jpg`.

## Customization

- Change the scroll distance for each act with the `data-vh` attribute on scrub sections.
- Adjust phase timing and shake onset through the `Scrub` options in `main.js`.
- Tune the reveal spotlight radius and trail length in the reveal effect configuration.

## Creator

**Sayed Sadiq**

- [GitHub](https://github.com/SayedSadiq45)
- [LinkedIn](https://www.linkedin.com/in/sayed-sadiq45/)

## License

Copyright (c) 2026 Sayed Sadiq.

Released under the [MIT License](LICENSE).
