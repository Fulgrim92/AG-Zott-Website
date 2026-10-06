# AG Zott — lab website

Static website for the AG Zott neuroscience research group (two-photon imaging in hippocampal CA1,
immunohistochemistry, electrophysiology, glymphatic system). Built with [Astro](https://astro.build),
Three.js, GSAP and OpenSeadragon. The design brief lives in [`docs/design-brief.md`](docs/design-brief.md).

```bash
npm install
npm run dev       # http://localhost:4321
npm run build     # static output in dist/
```

## Structure

- **Pinned sidebar navigation** (`src/components/Sidebar.astro`): full sidebar on desktop, icon rail on
  tablet (expand with the › button), top bar + drawer on mobile. The nine sections are deep-linkable pages.
- **Pages**: `src/pages/` — Home, Research (+ 4 topic pages), Team, Papers, News, Funding, Teaching, Alumni,
  Contact, plus Impressum, Datenschutz, Accessibility.
- **Interactive components** (`src/components/`):
  - `ImagingPlayer` — multi-channel two-photon player (channel toggles, intensity, scrubbing, speed)
  - `DeepZoom` — zoomable IHC viewer (channels, minimap, scale bar, hotspots)
  - `TraceViewer` — electrophysiology traces (zoom, pan, hover read-out, plain/expert annotations)
  - `GlymphaticFlow` — animated schematic of CSF/ISF flow with awake/asleep toggle
  - `CA1Layers` — interactive CA1 laminar schematic
  - Homepage hero (`src/scripts/hero.ts`) — scroll-driven brain → hippocampus → CA1 journey

## Editing content (no code needed)

All content lives in `src/data/`:

| File | Content |
|---|---|
| `site.json` | name, affiliation, mission, address, links, feature switches |
| `team.json`, `alumni.json` | people |
| `papers.json` | publications (`themes` + `grants` tags link them to research pages and funding) |
| `news.json` | news items (each gets its own page) |
| `grants.json` | ERC/DFG grants — set `"verified": true` once checked |
| `teaching.json` | courses and thesis topics |
| `assets.json` | **manifest of lab data** for the viewers (see below) |

### Content honesty rules

Every visual carries a label: **Lab data**, **Illustrative schematic**, or **Placeholder**.
Text in `[PLACEHOLDER …]` / `[… TO VERIFY]` brackets is rendered in amber so it can't be mistaken for
real content. Nothing on the site is invented lab data:

- The hero brain/hippocampus is a procedural **schematic** (replace with an atlas mesh, e.g. Allen CCF, if desired).
- The electrophysiology viewer shows a clearly labelled **synthetic demo signal** until a recording is configured.
- Two-photon and IHC viewers show placeholders until real files are added.

### Adding real data

Put files in `public/assets/lab/` and register them in `src/data/assets.json`:

- **Two-photon** (`twoPhoton.channels`): one greyscale video (`.mp4`/`.webm`) or image per channel,
  e.g. `{ "name": "GCaMP", "color": "green", "type": "video", "src": "assets/lab/ca1_gcamp.mp4" }`.
  Fill `meta` (indicator, species, depth, frameRate, scaleBar).
- **IHC** (`ihc.channels`): one image or Deep Zoom `.dzi` per channel (create tiles with
  `vips dzsave section.tif section`). Set `scaleBarMicronsPerPixel` for a live scale bar and add `hotspots`
  (`x`/`y` as fractions of image width/height).
- **Electrophysiology** (`ephys.src`): JSON `{ "dt_ms": 0.05, "unit": "mV", "y": [...], "annotations": [...] }`
  exported from ABF/NWB (e.g. with `pyabf` or `pynwb`).
- **Funder logos**: download the official files and save as `public/assets/logos/erc.svg`, `dfg.svg`,
  `eu-emblem.svg` — they replace the placeholders automatically.

Colour names map to the fluorophore palette: `green` (GCaMP), `red` (tdTomato), `blue` (DAPI), `magenta` (far-red).

### Glymphatic section

Shown when `site.json → features.glymphatic` is `true`. Until `glymphaticVerified` is `true`, the page
displays a “to verify” banner. Turn it off entirely if it is not part of the lab’s work.

## Accessibility, privacy, performance

- Keyboard navigation, skip link, focus trap in the mobile drawer, ARIA tabs/roles on interactive figures.
- `prefers-reduced-motion` respected; on-site **Motion** toggle disables the pinned scroll journey and animations.
- **CB-safe** toggle switches to a colour-blind-safe palette.
- No cookies, no trackers, fonts self-hosted (GDPR). Three.js and OpenSeadragon load only on pages that use them.

## Deployment

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on pushes to `main`
(enable *Settings → Pages → Source: GitHub Actions*). For other hosts, run
`SITE=https://your.domain BASE=/ npm run build` and upload `dist/`.
