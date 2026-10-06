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
  - `ImagingPlayer` — two-photon recordings (genotype tabs, synced side-by-side compare, frame stepping, display LUTs)
  - `RoiFigure` — ROI → ΔF/F trace movie
  - `DeepZoom` — zoomable confocal/IHC viewer (sections, minimap, numbered hotspots)
  - `SignalExplorer` — EEG / LTP / LFP explorer (zoom hours → ms, plain/expert notes); **illustrative simulations** from `src/scripts/signals.ts`
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
- The EEG / LTP / LFP signals are clearly labelled **illustrative simulations** modelled on the lab's paradigms.
- Two-photon movies are real lab recordings (`public/assets/lab/2p/`); confocal images are from
  Zott et al. 2024, *Nat Commun*, Suppl. Fig. S13A (CC BY 4.0), extracted at low resolution — replace with originals.

### Adding real data

Put files in `public/assets/lab/` and register them in `src/data/assets.json`:

- **Two-photon** (`twoPhoton.recordings`): greyscale `.mp4` + poster `.jpg` per recording. Encode with
  `ffmpeg -i in.mp4 -an -c:v libx264 -crf 28 -tune grain -movflags +faststart out.mp4`. Fill `meta`.
- **Confocal / IHC** (`ihc.sections`): one image or Deep Zoom `.dzi` per section (create tiles with
  `vips dzsave section.tif section`), with `hotspots` (`x`/`y` as fractions of image width/height).
- **Electrophysiology**: currently illustrative (`src/scripts/signals.ts`). Real traces can be added later as
  additional datasets in the same format.
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
