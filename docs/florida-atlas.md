# Florida Brain regional atlas

This additive prototype lives at `?view=atlas`. The briefing remains the default route, and existing dashboard deep links retain their behavior. Optional `region` and `sector` parameters restore a selected view.

## Scope and content

- Eight contiguous regional pieces of Florida, eight bespoke miniatures, 15 source-linked anchors and an eight-chapter guided journey.
- `src/atlas/data.ts` is the public content registry. Every anchor includes an official source, an approximate geographic location and an explicitly illustrative model.
- Sources were checked September 8, 2026. This is neither a complete business census nor an official cluster designation. Regions are editorial groupings.
- The overview starts with an assembled Florida. Clear regional seams divide the existing coastline into eight editorial nearest-anchor cells. These are not official regions or county boundaries. `regional-geography.ts` uses [polygon-clipping](https://github.com/mfogel/polygon-clipping) to retain the exact coast and islands; shared vertices are canonicalized at 1e-9 scene-unit precision.
- Generic platforms and rectangular water tiles have been removed. Each miniature is grounded at an interior point of its land piece. Minimum readable miniature sizes can overhang a narrow shoreline; their positions and scale do not assert surveyed building locations. Animations are not telemetry.
- No CRM, private Vault dossiers, contact details or relationship intelligence are included.

## Interaction and accessibility

Regional buttons, sector filters, source profiles and tour controls are ordinary HTML. The Three.js scene loads only after the atlas route opens. Selection first lifts and enlarges the geographic piece, then brings the camera closer to its strengths. Other land pieces remain visible as geographic context. Whole Florida reverses the transformation and restores the state. Rapid region changes interpolate from the current piece positions. Drag, wheel and pinch control the camera; miniature selection opens the corresponding profile. HTML controls also provide zoom and reset. Next/previous navigation reaches all eight regions. The 2D fallback uses the same partitions and stable region numbering.

Motion respects the operating system's reduced-motion preference and can be paused. The renderer stops while the page is hidden. A 2D geography/list alternative is available manually and on WebGL failure. Resizing, listeners, geometry, materials and animation loops are cleaned up on unmount.

## Build and verification

Use the existing `npm run dev`, `npm run build`, `npm run lint` and `npm test` workflow. For the owner-only Sites preview, build with `VITE_BASE_PATH=/ VITE_PUBLIC_URL=https://florida-brain-atlas.jose2289.chatgpt.site/ npm run build`. The default build base for existing GitHub Pages is unchanged.

Unit tests cover public-source requirements, IDs, sector overlaps, eight-region guided-tour wrapping, deep-link validation, map orientation, generated geometry, asset-to-profile mappings, reversible lift/expand transforms, area conservation, pairwise non-overlap, coastline coverage, and camera framing at five viewport ratios (0.42–2.0). Both the regional breakout and strengths close-up are tested, including moving miniature bounds. Rendering uses full 2× Retina density, with a 2.5× cap, and physical-pixel-snapped labels. Build and lint cover all TypeScript. No screenshot or interactive browser QA was performed in this implementation pass; the live preview is available for design review.

The deployed browser dependencies passed the production-only dependency audit. Six inherited development-tool advisory entries were reported in the full audit; the atlas does not depend on those tools at runtime. No broad dependency upgrade was included.

The preview uses a separate owner-only Sites audience. This change does not push to the existing public GitHub Pages branch or publish private Vault content.

## Regional art direction

`regional-identity.ts` is the editorial art-direction registry; `regional-worlds.ts` builds original Three.js geometry. The design is a dark, voxel-built miniature atlas, with different silhouettes, colors, environmental context and motion for every region:

- Space Coast: launch tower, multi-stage rocket, orbital satellite and recovery harbor.
- Orlando–Osceola: patterned silicon wafer, suspended chip, cleanroom and stepped simulation dome.
- Tampa Bay: cargo gantries, container ship, block-built defense pavilion and university research building.
- South Florida: tropical waterfront skyline, stepped architecture, palms, cargo vessel and rotating global-trade motif.
- Jacksonville: cable-stayed bridge, river channel, vehicle yard and moving freight train.
- Gainesville–Tallahassee: brick research campus, rotating DNA helix, superconducting magnet and shaded grove.
- Northwest: humanoid walking platform, articulated robot arm, coastal laboratory and trees.
- Southwest: elevated water lab, solar roof, mangrove roots, skiff, sensors and tidal ripples.

The eight scenes intentionally avoid using one generic asset icon for unrelated institutions. Shared components are limited to genuine repeated infrastructure such as cargo vessels, trees and cranes.

### Yamauchi No.10 direction, September 9

TJ clarified that the visual reference is [Yamauchi No.10 Family Office](https://y-n10.com/), whose [mount inc. case study](https://www.mount.jp/projects/yamauchi-no-10-family-office/) describes a miniature game-world journey. This supersedes the earlier rounded cartoon treatment. The reference informs the art direction, not the content: no characters, buildings, artwork, logos or assets from that site have been copied, and no claim is made about Packy's production tools or inspiration.

Original voxel geometry now supplies stepped trees, palms, rocket towers, vapor, robotics, mangroves and science motifs. Buildings have square edges; rings have restrained angular facets. Four-band flat lighting, saturated citrus/cyan accents, slate-green geographic pieces, pale regional seams, a near-black ocean and square controls support the game-world feel. The close-up camera uses a stronger oblique angle; the opening view retains a gentler tilt and the exact Florida coastline. Expressive rocket vapor, blinking robot eyes and the eight regional animations remain intact.

`voxel-geometry.ts` emits one exterior-face mesh per voxel object, culling shared internal faces instead of creating a mesh for every cube. Full Retina density and antialiasing are retained: the geometry is block-built, not the rendered image. No downloaded illustration, image asset, external runtime request or new package was introduced. Unit tests cover face winding, normal direction, internal-face culling, deduplication, orb/tower bounds, finite path geometry, material-ramp disposal, profile ownership, expressive motion and a per-region triangle budget, alongside the existing geographic and camera tests. All 139 tests and lint pass. No screenshot or interactive browser QA was performed in this pass.
