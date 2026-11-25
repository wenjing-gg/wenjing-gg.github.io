# Guanmo components

The publications cards use the pointer glow from [Guanmo Studio](https://github.com/guanmo-ai/guanmo-studio). Paper links and the figure lightbox use SVG icons from [Awesome Agent MCP](https://github.com/guanmo-ai/awesome-agent-mcp).

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
