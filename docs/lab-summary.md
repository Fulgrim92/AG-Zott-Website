# AG Zott — lab summary (website text)

Draft text for the website, written from the lab's publications. The short version is already in
`src/data/site.json` (`mission` + `summary`). Please review before publishing.

## Short version (homepage)

**Understanding why brain circuits become hyperactive early in Alzheimer’s disease — and how to stop it.**

Years before memory fails, neurons in the Alzheimer’s brain become abnormally active. We showed that
soluble β-amyloid causes this by blocking the reuptake of the neurotransmitter glutamate: glutamate
lingers at synapses, overexcites already active neurons and drives a self-reinforcing cycle of
hyperactivity (Science, 2019). Capturing β-amyloid monomers with an engineered binding protein, an
anticalin, prevents this hyperactivity in mouse models (Nature Communications, 2024). With in vivo
two-photon imaging, glutamate imaging, histology and electrophysiology, we now ask how these early
circuit failures develop and whether they can be reversed.

## Long version (About / Research page)

### About the lab

The Zott lab studies how brain circuits are organised and how they break down in neuropsychiatric
disease, with a focus on Alzheimer’s disease. We are based at the Department of Neuroradiology and the
Institute of Neuroscience at the Technical University of Munich (TUM). As clinician scientists, we
connect what we see at the level of single neurons in the mouse brain with network changes seen in
patients.

### The question: why do neurons become hyperactive?

Alzheimer’s disease starts long before the first symptoms. Imaging studies in people and cellular
recordings in mice show the same early sign: parts of the brain, in particular the hippocampus, become
abnormally active (*Annual Review of Neuroscience*, 2018). This hyperactivity is not just a side effect.
It disturbs the circuits that support memory, and it may speed up the disease.

### What we found

- **β-amyloid blocks glutamate clearance.** Soluble β-amyloid, especially small dimers and oligomers,
  stops synapses from taking glutamate back up after it is released. The glutamate stays around active
  neurons for too long and overexcites them. The effect depends on activity, so neurons that are
  already active are hit hardest, which starts a vicious cycle of hyperactivation (*Science*, 2019).
- **Hyperactivity can be prevented.** Together with protein engineers, we used an anticalin, a small
  engineered protein that binds β-amyloid monomers before they can form toxic aggregates. In mouse
  models of Alzheimer’s disease, this prevented neuronal hyperactivity (*Nature Communications*, 2024).
- **Glutamate as a common thread.** We have reviewed how impaired glutamatergic transmission may link
  early β-amyloid buildup to neuronal hyperactivation and, later, to neuronal damage
  (*Seminars in Cell & Developmental Biology*, 2023).

### How we work

- **In vivo two-photon calcium imaging** of hundreds of neurons in hippocampal CA1 and cortex.
- **Glutamate imaging** with genetically encoded sensors, to watch synaptic glutamate release and
  clearance directly (method published in *STAR Protocols*, 2021).
- **Histology and confocal microscopy**, to map β-amyloid pathology around the cells we record.
- **Electrophysiology**, to measure network excitability and synaptic plasticity.

### Funding

The group was founded with a TUM IAS Albrecht Struppler Clinician Scientist Scholarship (2021) and is
funded by an ERC Starting Grant (2025).

## Selected publications

1. Zott B, Nästle L, Grienberger C, Unger F, Knauer MM, Wolf C, Keskin-Dargin A, Feuerbach A,
   Busche MA, Skerra A, Konnerth A. β-amyloid monomer scavenging by an anticalin protein prevents
   neuronal hyperactivity in mouse models of Alzheimer’s Disease. *Nature Communications* 15, 5819 (2024).
2. Zott B, Konnerth A. Impairments of glutamatergic synaptic transmission in Alzheimer’s disease.
   *Seminars in Cell & Developmental Biology* 139, 24–34 (2023).
3. Unger F, Konnerth A, Zott B. Population imaging of synaptically released glutamate in mouse
   hippocampal slices. *STAR Protocols* 2, 100877 (2021).
4. Zott B, Simon MM, Hong W, Unger F, Chen-Engerer HJ, Frosch MP, Sakmann B, Walsh DM, Konnerth A.
   A vicious cycle of β amyloid–dependent neuronal hyperactivation. *Science* 365, 559–565 (2019).
5. Zott B, Busche MA, Sperling RA, Konnerth A. What happens with the circuit in Alzheimer’s disease in
   mice and humans? *Annual Review of Neuroscience* 41, 277–297 (2018).

## To check before publishing

- The ResearchGate profile could not be opened from this environment. The list above was put together
  from TUM, journal and library pages. Any papers since 2024 that only appear on ResearchGate are missing.
- ERC grant acronym, title and dates (`src/data/grants.json`).
- Whether “clinician scientists” and the glymphatic topic fit how the lab describes itself.
