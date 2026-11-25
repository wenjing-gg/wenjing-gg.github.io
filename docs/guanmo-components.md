# Guanmo components

The site uses components from [Guanmo Studio](https://github.com/guanmo-ai/guanmo-studio), [Awesome Agent MCP](https://github.com/guanmo-ai/awesome-agent-mcp), and [Awesome AI Motion](https://github.com/guanmo-ai/awesome-ai-motion). The sections below identify their source and local adaptations.

## Header controls

- Navigation pills, segmented language controls, and icon button styling are adapted from `.nav-links a`, `.seg`, and `.icon-btn` in [`awesome-agent-mcp/web/app.css`](https://github.com/guanmo-ai/awesome-agent-mcp/blob/95702f3b1cf610336ccd885090fcac251ece912a/web/app.css).
- Local header styling is in `_sass/include/_guanmo-header.scss`. Translucent gradients, backdrop blur, fine highlights, and inset reflections adapt these components to the site's liquid-glass header. Existing navigation destinations and language persistence remain in place; narrow screens show the navigation on a second row.
- License: [MIT — Awesome Agent MCP](licenses/awesome-agent-mcp-MIT.txt).

## Header music icons

- Upstream music, play, and pause paths: `ICONS.music`, `ICONS.play`, and `ICONS.pause` in [`awesome-ai-motion/assets/gallery.mjs`](https://github.com/guanmo-ai/awesome-ai-motion/blob/8c6f51d9a4d3ee7be573cc2bcfc065bdd33ae7df/assets/gallery.mjs).
- The management button uses `ICONS.all` from the same file (four tiles representing the control panel); the language globe comes from `#language` in [`awesome-ai-motion/index.html`](https://github.com/guanmo-ai/awesome-ai-motion/blob/8c6f51d9a4d3ee7be573cc2bcfc065bdd33ae7df/index.html). They are integrated in `profile-render.js` and `locale-toggle.js`, respectively.
- Local code: `musicIconPaths` and `musicIcon` in `assets/js/cursor-effects.js`.
- The next-track icon is a local adaptation of the play triangle: the triangle is narrowed and a vertical skip bar is added. It is not an upstream next-track icon.
- Icons keep the upstream 24 × 24 view box, unfilled paths, rounded stroke ends and joins, and 1.5 stroke width. Local classes and `focusable="false"` integrate them with the header. Buttons retain bilingual text and accessible labels, and the expanded controls support Escape and outside-click dismissal.
- License: [MIT — Awesome AI Motion](licenses/awesome-ai-motion-MIT.txt). Only code and UI icon paths are reused; the repository's third-party video, audio, cover, prompt, and brand assets are not included.

## Pointer glow

- Upstream files: [`web/atlas/pointer-glow.js`](https://github.com/guanmo-ai/guanmo-studio/blob/68f26a4978fea4c9f1d918fda2a96b409a47843a/web/atlas/pointer-glow.js), [`web/atlas/pointer-glow.css`](https://github.com/guanmo-ai/guanmo-studio/blob/68f26a4978fea4c9f1d918fda2a96b409a47843a/web/atlas/pointer-glow.css), and pointer tokens in [`web/atlas/tokens.css`](https://github.com/guanmo-ai/guanmo-studio/blob/68f26a4978fea4c9f1d918fda2a96b409a47843a/web/atlas/tokens.css).
- Local files: `assets/js/magic-bento.js` and `_sass/include/_magic-bento.scss`.
- Adaptations: existing card selectors and `profile:rendered` lifecycle, teal/purple/orange colors for published papers, papers under review, and patents, plus a stronger edge on the light card background. The original card layout is retained. Pointer effects respect hover capability and reduced-motion preferences.
- License: [MIT — Guanmo Studio](licenses/guanmo-studio-MIT.txt).

## SVG icons

- Upstream: `ICON.out` and `ICON.x` in [`web/render.mjs`](https://github.com/guanmo-ai/awesome-agent-mcp/blob/95702f3b1cf610336ccd885090fcac251ece912a/web/render.mjs); line styling from [`web/app.css`](https://github.com/guanmo-ai/awesome-agent-mcp/blob/95702f3b1cf610336ccd885090fcac251ece912a/web/app.css).
- Local files: `GUANMO_ICON` in `assets/js/profile-render.js` and `.guanmo-icon` in `_sass/include/_magic-bento.scss`.
- Adaptations: local class, `focusable="false"`, and sizing to match the paper links and lightbox close button. Existing text and bilingual accessible labels are retained.
- License: [MIT — Awesome Agent MCP](licenses/awesome-agent-mcp-MIT.txt).
