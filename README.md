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

- **Top navigation** (`src/components/Header.astro`): plain, professional header with dropdowns for Research and Lab
  pages, a drawer on tablets and phones. Footer: `src/components/Footer.astro` (display toggles live there).
- **Homepage** (`src/pages/index.astro`), two layers:
  1. *First impression* — dark hero with the Allen CCFv3 mouse brain as a cloud of light (`src/scripts/heroBrain.ts`),
     then light sections: what we do, approach (real media), team carousel, latest findings.
  2. *For the curious* (`#methods`, dark) — a scroll-driven **graphical abstract** (`GraphicalAbstract.astro` +
     `src/scripts/abstract.ts`: synapse → β-amyloid blocks reuptake → vicious cycle → CA1 circuit → two-photon imaging,
     every chapter linked to its references) that hands off to a **real recording** walked through the lab's analysis
     pipeline (`DataPipeline.astro` + `src/scripts/pipeline.ts`).
- **Pages**: `src/pages/` — Research (+ 4 topic pages), Team, Papers, News, Funding, Teaching, Alumni, Contact,
  Impressum, Datenschutz, Accessibility.
- **Interactive components** (`src/components/`): `ImagingPlayer`, `RoiFigure`, `DeepZoom`, `SignalExplorer`
  (illustrative simulations), `GlymphaticFlow`, `CA1Layers`, `EphysProcedure`, `AtlasSections`.
- **Ambient detail**: `NeuralBackdrop.astro` (slow drifting network, pauses off-screen), line icons that draw
  themselves, magnetic primary buttons, scroll progress line. All motion respects `prefers-reduced-motion` and the
  on-site *Reduce motion* toggle (the graphical abstract then becomes tabbed still frames).

## Editing content (no code needed)

All content lives in `src/data/`:

| File | Content |
|---|---|
| `home.json` | **every text on the homepage** — hero, cards, deep-dive chapters, pipeline steps, references |
| `team.json` | **people** (homepage carousel + Team page), in display order; the `PI` entry is the group leader |
| `site.json` | name, affiliation, address, social links, feature switches |
| `alumni.json` | former members |
| `papers.json` | publications (`summary` makes a paper eligible for “Latest findings”; `journalShort` for cards) |
| `news.json` | news items (each gets its own page) |
| `grants.json` | ERC/DFG grants — set `"verified": true` once checked |
| `teaching.json` | courses and thesis topics |
| `assets.json` | manifest of lab data for the viewers (see below) |
| `pipeline.json` | generated — do not edit (see *Methods walkthrough data*) |

**Adding a person**: copy a block in `team.json`, set `name`, `role` (PI, Postdoc, PhD student, Staff, Student — used for
the filter), `position` (shown), `focus` (list), optional `photo` (path under `public/`, e.g. `assets/team/jane.jpg`),
`email`, `orcid`, and `"placeholder": false`. Without a photo a neutral monogram card is shown (never a generated face).

### Editing text in the preview

A build with `PUBLIC_EDIT_MODE=1 npm run build` adds an **Edit text** button (bottom left) to every page. Click it,
then click any outlined text and type; changes save when you click elsewhere. Inside claude.ai the edits are shared by
everyone who opens the same preview, elsewhere they stay in that browser. **Copy edits** puts them on the clipboard as
JSON; save that as `edits.json` and run `npm run apply-edits -- edits.json` to write them into `home.json`, `team.json`
and `site.json` (only the edited strings change). Normal builds contain none of this.

### Methods walkthrough data

`python3 scripts/build-pipeline.py` (needs ffmpeg, numpy, scipy, pillow) derives everything in the “data, for real”
section from the BL6 recording already on the site: mean and local-correlation images, automatic soma proposals, and for
the five ROIs of the lab's figure both the **lab's own ΔF/F traces** (digitised from `bl6-roi.mp4`) and traces
**recomputed** from `bl6.mp4` with the default settings of the lab's analysis software (rolling 20th-percentile F₀ over
30 s, MAD noise, 3σ peaks). The two agree at r = 0.92–0.99; the site shows both and says which is which.

### Content honesty rules

Every visual carries a label: **Lab data**, **Illustrative schematic**, or **Placeholder**.
Text in `[PLACEHOLDER …]` / `[… TO VERIFY]` brackets is rendered in amber so it can't be mistaken for
real content. Nothing on the site is invented lab data:

- The hero brain is the Allen CCFv3 atlas mesh; the flashes on CA1 are illustrative.
- The graphical abstract is an **illustrative schematic** built on the cited literature (references in `home.json`).
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

## Allen Mouse Brain Atlas data

- **3D homepage figure** — Allen CCFv3 (2017) structure meshes (whole brain, CA1, CA2, CA3, dentate gyrus),
  taken from the MIT-licensed [MeshView for Brain Atlases](https://github.com/Neural-Systems-at-UIO/MeshView-for-Brain-Atlases)
  packaging and simplified by `python3 scripts/build-atlas.py <MeshView checkout>` → `public/assets/atlas/ccf.{bin,json}`.
- **Reference sections (Immunohistochemistry page)** — 25 µm CCFv3 average template + annotation from the
  [Allen Brain Cell Atlas](https://allen-brain-cell-atlas.s3.us-west-2.amazonaws.com/index.html) bucket, cut into coronal
  sections through the hippocampus by `python3 scripts/build-atlas-sections.py <download folder>` →
  `public/assets/atlas/sections/`. The source URLs are listed at the top of the script.
- Attribution: Allen Mouse Brain Common Coordinate Framework v3, © Allen Institute for Brain Science;
  Wang Q. et al. (2020) *Cell* 181:936–953.
