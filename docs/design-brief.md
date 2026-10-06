# AG Zott Website — Design & Build Brief (v2)

> Improved version of the original design prompt. Copy everything below the line into your design/build tool or hand it to a developer.

---

## 1. Goal

Build the website for **AG Zott**, a neuroscience research group working on **two-photon imaging in hippocampal CA1**, **immunohistochemistry (IHC)**, and **electrophysiology** — and, *only if supported by the lab's published or ongoing work*, the **glymphatic system** and its role in brain function.

The site must help four audiences find what they need fast:

| Audience | Primary need |
|---|---|
| Scientists / reviewers | Research questions, methods, publications, funding |
| Prospective students & postdocs | Open positions, teaching, team, contact |
| Funders & institution | Funded projects, acknowledgments, outputs |
| Public / press | Plain-language explanation of what the lab discovers |

Quality bar: a polished, scientifically honest experience that feels like exploring a microscope, not a marketing page. Visual ambition must never cost clarity, accessibility, or speed.

## 2. Layout & navigation (core requirement)

### Pinned side navigation
A **classical, always-visible sidebar** that lets visitors jump directly to any section from anywhere on the site.

- **Desktop (≥ 1200 px):** fixed left sidebar, ~260 px wide, full viewport height, does not scroll with content.
  - Top: AG Zott wordmark + institute affiliation *(placeholder until confirmed)*.
  - Middle: the nine navigation items, in this exact order and wording:
    **HOME · RESEARCH · TEAM · PAPERS · NEWS · FUNDING · TEACHING · ALUMNI · CONTACT**
  - Research item expands to sub-links: *Two-photon CA1 · Immunohistochemistry · Electrophysiology · Glymphatic system (if applicable)*.
  - Bottom: compact funder marks (ERC · DFG), language toggle **DE / EN**, quick links (email, ORCID/Google Scholar, institute page).
  - Active item is highlighted (scroll-spy within a page, route-match across pages) with a thin fluorescent accent bar — not just colour, also weight/indicator for accessibility.
- **Tablet (768–1199 px):** sidebar collapses to an icon rail (with labels on hover/focus and a pin-to-expand button).
- **Mobile (< 768 px):** slim top bar with logo + menu button opening a full-height drawer containing the same items; *Contact* and *Papers* also reachable as persistent shortcuts.
- Content area sits to the right of the sidebar; immersive full-bleed visuals fill the content area only, never sit underneath the nav.
- Include a **"Skip to content"** link, visible focus states, and full keyboard operation (Tab / Enter / Esc to close drawer).

### Information architecture
- Each nav item is its **own deep-linkable page/route** (e.g. `/papers`, `/funding`) so items can be shared and indexed; the homepage additionally previews each section.
- Footer on every page: contact address, funding acknowledgment line, **Impressum** and **Datenschutz** (legally required for German sites), accessibility statement, last-updated date.

## 3. Visual identity

- **Background:** near-black, slightly blue (`#07090d`–`#0b0f17`), not pure black, to mimic a darkened imaging room.
- **Accent palette derived from real fluorophores** and used consistently as a semantic code across the site:
  - GCaMP / GFP green — two-photon / activity
  - tdTomato / Alexa 568 red-orange — structure
  - DAPI blue — nuclei / IHC context
  - Alexa 647 magenta — secondary label / glymphatic tracer
  - Provide a **colour-blind-safe mode** (e.g. green→cyan, red→magenta) as a toggle, and never encode meaning with colour alone.
- **Typography:** an elegant serif or high-contrast grotesk for headings, a highly legible sans for body text, and a monospace for data labels, units and grant IDs. **Self-host all fonts** (no Google Fonts CDN — GDPR).
- **Spacing:** generous whitespace, max ~70 characters per line for body text, an 8-pt spacing grid.
- **Motifs:** scale bars, channel labels, timestamps and recording metadata as real UI elements — the visual language comes from the lab's own data.

## 4. Homepage — immersive introduction

1. **Hero:** an interactive **Three.js** brain → hippocampus → CA1 journey. Scrolling (or clicking "Enter CA1") zooms from a whole-brain model into the hippocampus and CA1 layers (stratum oriens, pyramidale, radiatum, lacunosum-moleculare), ending on a **real two-photon sequence** from the lab.
   - Use an anatomically sourced mesh (e.g. Allen Brain Atlas / Scalable Brain Atlas, licence credited) — not an invented shape.
   - Fallback: a static poster image or short looping video if WebGL is unavailable, on low-power devices, or with reduced motion enabled.
2. **One-sentence mission** + 2–3 sentence plain-language summary of the lab's central question.
3. **Three method cards** (Two-photon · IHC · Electrophysiology) each previewing a real asset and linking to its research section.
4. **Latest news** (3 items) and **latest papers** (3 items).
5. **Concise funding acknowledgment** with ERC and DFG logos linking to the Funding page.
6. **Call to action:** open positions / contact.

## 5. Research sections (interactive)

Each section follows the same pattern: **Question → Method → Interactive data → What we found → Related papers → Funding source.**

### 5.1 Two-photon imaging in CA1
- Player for real imaging sequences with play/pause, frame scrubber, speed control.
- **Channel toggles** (e.g. GCaMP / structural channel / merge) and adjustable opacity per channel.
- **Layer / depth slider** for z-stacks.
- Optional overlay of ROI outlines with linked ΔF/F traces when hovering a cell.
- Always show scale bar, frame rate, imaging depth, indicator and species metadata.

### 5.2 Immunohistochemistry
- **Deep-zoom viewer** (e.g. OpenSeadragon with tiled images) for high-resolution sections.
- Channel on/off controls, annotation hotspots explaining cell types/structures, minimap, scale bar that updates with zoom.
- Antibody / marker legend for each image.

### 5.3 Electrophysiology
- Interactive traces rendered from **real recording files** (exported to CSV/JSON from ABF/NWB) — zoom, pan, hover for time/voltage values.
- Annotated features (e.g. action potential, sharp-wave ripple, theta) with short explanations, toggleable between **expert** and **plain-language** explanations.
- Units and axes always visible.

### 5.4 Glymphatic system — *conditional*
- **Only include if the lab has publications, preprints, grants or ongoing projects on this topic.** If not, omit the nav sub-item entirely.
- If included: an animated, clearly labelled **schematic** of CSF influx along periarterial spaces, interstitial exchange, and perivenous clearance, with a sleep/wake toggle if relevant to the lab's work.
- Mark as **"Illustrative schematic"**; link each claim to a citation.

## 6. Other pages

- **TEAM:** grid of profiles (photo, name, role, research focus, ORCID, email). Filter by role. Click opens a detail panel. Missing photos use a neutral labelled placeholder — never AI-generated faces.
- **PAPERS:** searchable and filterable list (year, topic, method, funder, type). Source data from a BibTeX/ORCID/PubMed export. Each entry: authors (lab members highlighted), journal, year, DOI link, PDF/preprint, data/code links, funding tags.
- **NEWS:** reverse-chronological cards with date, category tags (paper, award, event, people), and individual article pages.
- **FUNDING:** see §7.
- **TEACHING:** courses, semester, level, short description, downloadable materials, thesis topics for BSc/MSc/PhD.
- **ALUMNI:** name, role while in lab, years, current position — with a filter by former role.
- **CONTACT:** address, building/room, map (privacy-friendly, e.g. static map or click-to-load), email, phone, how to reach us, open positions.

## 7. Funding (ERC & DFG)

- **Homepage:** one concise acknowledgment line plus logos.
- **Dedicated FUNDING page** with one card per grant:
  - Funder logo (official, unaltered, per the funder's brand guidelines)
  - Grant title and acronym
  - Grant identifier (ERC grant agreement no. / DFG project number)
  - Funding programme (e.g. ERC Starting Grant, DFG Sachbeihilfe, SFB/SPP/FOR)
  - Award period
  - Principal investigator(s)
  - Linked research theme(s) and linked publications (automatically via funding tags)
- **Official acknowledgment wording** (fill in verified values only):
  - ERC, Horizon Europe: *"Funded by the European Union (ERC, ACRONYM, project number). Views and opinions expressed are however those of the author(s) only and do not necessarily reflect those of the European Union or the European Research Council Executive Agency. Neither the European Union nor the granting authority can be held responsible for them."* — shown with the EU emblem and ERC logo.
  - ERC, Horizon 2020: *"This project has received funding from the European Research Council (ERC) under the European Union's Horizon 2020 research and innovation programme (grant agreement No XXXXXX)."*
  - DFG: *"Funded by the Deutsche Forschungsgemeinschaft (DFG, German Research Foundation) – Project number XXXXXXXX."* / DE: *"Gefördert durch die Deutsche Forschungsgemeinschaft (DFG) – Projektnummer XXXXXXXX."*
  - Verify wording against the current funder guidelines before launch.
- Any unverified field is rendered as a visible placeholder badge, e.g. `[GRANT NO. — TO VERIFY]`.

## 8. Content & data integrity

- **No invented content.** Do not fabricate microscopy images, traces, people, publications, grants, quotes or numbers.
- The lab will supply assets. Maintain an **asset manifest** (file, source, figure/paper, licence, caption, alt text, owner).
- Every visual carries one of three labels: **Lab data**, **Illustrative schematic**, or **Placeholder**.
- Placeholders are visually distinct (dashed outline + label) so they cannot be mistaken for real content at launch.
- All content (team, papers, news, grants) lives in editable Markdown/JSON/BibTeX files so the lab can update it without touching code.

## 9. Motion

- **GSAP + ScrollTrigger** for section transitions, pinned scroll sequences in the hero, and subtle micro-interactions (hover glow, channel fade-ins, counter reveals).
- Motion supports understanding (e.g. zooming *into* CA1) — no decorative motion that delays reading.
- **`prefers-reduced-motion`:** disable scroll-jacking, parallax and auto-play; show static frames with manual controls. Also provide an on-site motion toggle.
- Never hijack native scrolling speed; sidebar navigation must always work instantly.

## 10. Accessibility, performance, privacy

- **WCAG 2.2 AA:** contrast ≥ 4.5:1 for text on dark backgrounds, alt text and long descriptions for scientific images, captions/transcripts for video, ARIA labels for viewers and players, accessible data tables as alternatives to charts.
- **Performance budgets:** LCP < 2.5 s, CLS < 0.1, INP < 200 ms on mid-range mobile; Lighthouse ≥ 90 in all categories. Lazy-load Three.js, the deep-zoom viewer and imaging sequences only when needed; use AVIF/WebP and video (AV1/H.264) instead of GIFs.
- **Privacy/GDPR:** no third-party trackers by default, self-hosted fonts and libraries, cookie-less analytics if any, Impressum and Datenschutzerklärung pages.
- **Bilingual:** English primary, German secondary (or vice versa), with `hreflang` and language toggle.
- **SEO:** semantic HTML, structured data (`ResearchOrganization`, `Person`, `ScholarlyArticle`), Open Graph images from real lab data.

## 11. Suggested tech stack

- Static site generator (e.g. **Astro**) for speed and content collections; islands for interactive components.
- **Three.js** (hero), **GSAP/ScrollTrigger** (motion), **OpenSeadragon** (deep zoom), lightweight canvas/WebGL plotting (e.g. uPlot) for ephys traces, **Pagefind** or Fuse.js for client-side search.
- Deploy as a static site (institute server, GitHub Pages, or similar).

## 12. Information needed from the lab

- [ ] Institute/university affiliation, address, logo usage rules
- [ ] Mission statement and research summary (EN/DE)
- [ ] Two-photon sequences (raw or exported), with metadata
- [ ] IHC images at full resolution, with marker/antibody info
- [ ] Ephys recordings (ABF/NWB or CSV) with annotations
- [ ] Confirmation whether glymphatic research is part of the lab's work (+ references)
- [ ] Team list, photos, roles, ORCID; alumni list
- [ ] Publication list (BibTeX/ORCID)
- [ ] Grant details: funder, programme, title, acronym, ID, period, PI
- [ ] Teaching courses and materials
- [ ] News items
- [ ] Impressum / data-protection details from the institute

## 13. Deliverables & acceptance criteria

- Responsive site with pinned sidebar navigation working on desktop, tablet and mobile.
- All nine sections present in the specified order and wording.
- Every image/trace labelled as lab data, schematic or placeholder; no unlabelled illustrative content.
- Funding page with verified details or clearly marked placeholders; acknowledgment on homepage and in footer.
- Reduced-motion and no-WebGL fallbacks verified.
- Accessibility (axe/Lighthouse) and performance budgets met.
- Content editable via files documented in a short README.
