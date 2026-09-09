# Florida Brain regional atlas

This additive prototype lives at `?view=atlas`. The briefing remains the default route, and existing dashboard deep links retain their behavior. Optional `region` and `sector` parameters restore a selected view.

## Scope and content

- Eight curated regional views, 14 source-linked anchors and three detailed chapters: Space Coast, Orlando–Osceola and Tampa Bay.
- `src/atlas/data.ts` is the public content registry. Every anchor includes an official source, an approximate geographic location and an explicitly illustrative model.
- Sources were checked September 8, 2026. This is neither a complete business census nor an official cluster designation. Regions are editorial groupings.
- The guide line is a chapter route, not an asserted economic flow. Miniatures spread out in detailed chapters, connected to approximate map anchors by leaders. Animations are not telemetry.
- No CRM, private Vault dossiers, contact details or relationship intelligence are included.

## Interaction and accessibility

Regional buttons, sector filters, source profiles and tour controls are ordinary HTML. The Three.js scene loads only after the atlas route opens. Drag, wheel and pinch control the camera; miniature selection opens the corresponding profile. HTML controls also provide zoom and reset.

Motion respects the operating system's reduced-motion preference and can be paused. The renderer stops while the page is hidden. A 2D geography/list alternative is available manually and on WebGL failure. Resizing, listeners, geometry, materials and animation loops are cleaned up on unmount.

## Build and verification

Use the existing `npm run dev`, `npm run build`, `npm run lint` and `npm test` workflow. For the owner-only Sites preview, build with `VITE_BASE_PATH=/ npm run build`. The default build base for existing GitHub Pages is unchanged.

Unit tests cover public-source requirements, IDs, sector overlaps, guided-tour wrapping, deep-link validation, map orientation and camera framing at four viewport ratios. Build and lint cover all TypeScript. No screenshot or interactive browser QA was performed in this implementation pass; the live preview is available for design review.

The deployed browser dependencies passed the production-only dependency audit. Six inherited development-tool advisory entries were reported in the full audit; the atlas does not depend on those tools at runtime. No broad dependency upgrade was included.

The preview uses a separate owner-only Sites audience. This change does not push to the existing public GitHub Pages branch or publish private Vault content.
