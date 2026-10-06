#!/usr/bin/env python3
"""
Build coronal reference sections through the hippocampus from the Allen Mouse Brain
Common Coordinate Framework v3 (25 µm), as distributed by the Allen Brain Cell Atlas:

  https://allen-brain-cell-atlas.s3.us-west-2.amazonaws.com/image_volumes/Allen-CCF-2020/20250331/average_template_25.nii.gz
  https://allen-brain-cell-atlas.s3.us-west-2.amazonaws.com/image_volumes/Allen-CCF-2020/20250331/annotation_25.nii.gz
  https://allen-brain-cell-atlas.s3.us-west-2.amazonaws.com/metadata/Allen-CCF-2020/20230630/views/parcellation_to_parcellation_term_membership_{acronym,name,color}.csv

Usage:
    python3 scripts/build-atlas-sections.py <folder-with-the-downloaded-files>

Writes public/assets/atlas/sections/: s###.jpg (template), l###.png (8-bit label index per slice)
and sections.json (slice positions + per-slice region palette).
"""
import csv, gzip, json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

STEP = 4                 # every 4th 25-µm slice = 100 µm spacing
BREGMA_AP_VOXEL = 216    # commonly used approximation of bregma in CCFv3 (5.40 mm); for orientation only


def load_nii(path):
    raw = gzip.open(path).read()
    e = '<' if struct.unpack('<i', raw[:4])[0] == 348 else '>'
    dim = struct.unpack(e + '8h', raw[40:56])
    code = struct.unpack(e + 'h', raw[70:72])[0]
    off = int(struct.unpack(e + 'f', raw[108:112])[0])
    dt = {2: 'u1', 4: 'i2', 8: 'i4', 16: 'f4', 512: 'u2', 768: 'u4'}[code]
    shape = dim[1:1 + dim[0]]
    return np.frombuffer(raw, dtype=e + dt, offset=off, count=int(np.prod(shape))).reshape(shape[::-1]).T  # (AP, DV, ML)


def read_view(folder, kind):
    with open(folder / f'parcellation_to_parcellation_term_membership_{kind}.csv') as f:
        return {int(r['parcellation_index']): r for r in csv.DictReader(f)}


def main():
    src = Path(sys.argv[1])
    out = Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'atlas' / 'sections'
    out.mkdir(parents=True, exist_ok=True)
    tmpl = load_nii(src / 'average_template_25.nii.gz').astype(np.float32)
    ann = load_nii(src / 'annotation_25.nii.gz')
    acr, name, col = read_view(src, 'acronym'), read_view(src, 'name'), read_view(src, 'color')

    hpf = np.array([acr.get(int(i), {}).get('division') == 'HPF' and acr[int(i)]['structure'] in ('CA1', 'CA2', 'CA3', 'DG')
                    for i in range(int(ann.max()) + 1)])
    ap_has = np.where(hpf[ann].any(axis=(1, 2)))[0]
    ap0, ap1 = int(ap_has.min()), int(ap_has.max())
    lo, hi = np.percentile(tmpl[tmpl > 0], [1, 99.7])

    slices = []
    for k, ap in enumerate(range(ap0 + STEP // 2, ap1, STEP)):
        img = np.clip((tmpl[ap] - lo) / (hi - lo), 0, 1) ** 0.85          # (DV, ML)
        Image.fromarray((img * 255).astype(np.uint8)).save(out / f's{k:03d}.jpg', quality=88)
        lab = ann[ap]
        ids = [int(i) for i in np.unique(lab)]
        assert len(ids) < 256
        lut = {i: n for n, i in enumerate(ids)}
        Image.fromarray(np.vectorize(lut.get)(lab).astype(np.uint8)).save(out / f'l{k:03d}.png', optimize=True)
        palette = []
        for i in ids:
            a, n, c = acr.get(i), name.get(i), col.get(i)
            palette.append(None if i == 0 or a is None else {
                'acronym': a['substructure'], 'structure': a['structure'], 'division': a['division'],
                'name': n['substructure'], 'color': c['substructure_color'],
            })
        slices.append({'file': k, 'ap_voxel': ap, 'ccf_ap_mm': round(ap * 0.025, 3),
                       'bregma_mm_approx': round((BREGMA_AP_VOXEL - ap) * 0.025, 2), 'palette': palette})
    (out / 'sections.json').write_text(json.dumps({
        'source': 'Allen Mouse Brain Common Coordinate Framework v3 (CCFv3), 25 µm average template and annotation, '
                  '© Allen Institute for Brain Science; distributed via the Allen Brain Cell Atlas.',
        'citation': 'Wang Q. et al. (2020) Cell 181:936–953.',
        'width': int(ann.shape[2]), 'height': int(ann.shape[1]), 'step_um': STEP * 25, 'slices': slices,
    }, separators=(',', ':')))
    size = sum(p.stat().st_size for p in out.iterdir())
    print(f'{len(slices)} sections, AP voxels {ap0}-{ap1}, {size / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
