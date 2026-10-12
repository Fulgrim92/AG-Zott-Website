#!/usr/bin/env python3
"""
Hippocampal slice drawing for the electrophysiology card, traced from the Allen CCFv3 coronal label section
(public/assets/atlas/sections, slice 13, ~1.98 mm posterior to bregma; left hippocampus).
Writes public/assets/ephys/slice.png (layers rendered with smoothed boundaries) and slice.json
(key positions in a 400×300 viewBox: stratum radiatum centre line, CA3/CA1 pyramidal layer points).
"""
import json, math
import numpy as np
from PIL import Image, ImageFilter
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sec = root / 'public/assets/atlas/sections'
K = 13
X0, Y0, W, H = 84, 38, 144, 108        # crop in atlas pixels (25 µm)
OUT_W, OUT_H = 800, 600                 # 2× the 400×300 viewBox
S = 400 / W

d = json.load(open(sec / 'sections.json'))
pal = d['slices'][K]['palette']
lab = np.array(Image.open(sec / f'l{K:03d}.png'))[Y0:Y0 + H, X0:X0 + W]
acr = {i: (p['acronym'] if p else '') for i, p in enumerate(pal)}
div = {i: (p['division'] if p else '') for i, p in enumerate(pal)}

# classes → colour (RGBA)
def cls(a, dv):
    if a in ('CA1sp', 'CA2sp', 'CA3sp'): return 1
    if a == 'DG-sg': return 2
    if a in ('CA1sr', 'CA2sr', 'CA3sr', 'CA3slu'): return 3
    if a in ('CA1so', 'CA2so', 'CA3so'): return 4
    if a in ('CA1slm', 'CA2slm', 'CA3slm', 'DG-mo'): return 5
    if a == 'DG-po': return 6
    if a == '' or a.startswith('VL') or a.startswith('V3'): return 0
    if dv in ('lfbs', 'fiber tracts') or a in ('fi', 'alv', 'df', 'ccb', 'cing', 'dhc', 'or', 'fp', 'ec', 'int'): return 7
    return 8
colors = {0: (11, 10, 16, 255), 1: (255, 120, 104, 255), 2: (176, 150, 230, 255), 3: (66, 46, 58, 255), 4: (52, 40, 52, 255),
          5: (44, 38, 60, 255), 6: (40, 34, 52, 255), 7: (58, 56, 64, 255), 8: (30, 27, 38, 255)}
C = np.vectorize(lambda v: cls(acr.get(int(v), ''), div.get(int(v), '')))(lab)

# smooth class boundaries: upsample each class mask, blur, argmax
stack = []
for c in range(9):
    m = Image.fromarray(((C == c) * 255).astype(np.uint8)).resize((OUT_W, OUT_H), Image.BILINEAR).filter(ImageFilter.GaussianBlur(3.2))
    stack.append(np.asarray(m, np.float32))
idx = np.argmax(np.stack(stack), 0)
rgba = np.zeros((OUT_H, OUT_W, 4), np.uint8)
for c, col in colors.items(): rgba[idx == c] = col
img = Image.fromarray(rgba, 'RGBA')
img.save(root / 'public/assets/ephys/slice.png', optimize=True)

# centre line of stratum radiatum (CA3 → CA2 → CA1), ordered by angle around the hippocampal curl
ys, xs = np.where(np.isin(C, [3]))
cx, cy = np.where(C == 2)[1].mean(), np.where(C == 2)[0].mean()
ang = np.arctan2(ys - cy, xs - cx)
bins = np.linspace(ang.min(), ang.max(), 26)
line = []
for a0, a1 in zip(bins[:-1], bins[1:]):
    sel = (ang >= a0) & (ang < a1)
    if sel.sum() > 3: line.append((float(xs[sel].mean() * S + S / 2), float(ys[sel].mean() * S + S / 2)))
def pts(names):
    m = np.isin(lab, [i for i, a in acr.items() if a in names]); y, x = np.where(m)
    return [(float(a * S + S / 2), float(b * S + S / 2)) for a, b in zip(x, y)]
json.dump({'viewBox': [400, 300], 'center': [float(cx * S), float(cy * S)], 'sr': line,
           'ca1sp': pts(['CA1sp'])[::3], 'ca3sp': pts(['CA3sp'])[::3],
           'source': f"Allen CCFv3 annotation, coronal section ~{-d['slices'][K]['bregma_mm_approx']:.2f} mm posterior to bregma"},
          open(root / 'public/assets/ephys/slice.json', 'w'))
print(len(line), 'centre-line points')
