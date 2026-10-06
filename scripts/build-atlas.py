#!/usr/bin/env python3
"""
Build the web-ready Allen Mouse Brain Atlas (CCFv3, 2017) meshes used by the homepage figure.

Source: the Allen Mouse Brain Common Coordinate Framework v3 (Wang et al., 2020, Cell 181:936),
structure meshes as packaged by MeshView for Brain Atlases (University of Oslo, MIT licence):
https://github.com/Neural-Systems-at-UIO/MeshView-for-Brain-Atlases  (folder AMBA_CCFv3_2017_full/)

Usage:
    python3 scripts/build-atlas.py <path-to-MeshView-checkout>

Writes public/assets/atlas/ccf.bin (uint16 quantised positions + uint16 indices) and ccf.json (manifest).
Coordinates are CCFv3 voxels (25 µm): x = medio-lateral, y = antero-posterior, z = dorso-ventral.
"""
import json, struct, sys
from pathlib import Path
import numpy as np
from PIL import Image

# (Allen structure id, label, display colour, clustering cell size in voxels)
STRUCTURES = [
    (997, 'Whole brain', '#5aa9ff', 6.5),
    (382, 'Field CA1', '#4dff9a', 1.9),
    (423, 'Field CA2', '#ffc857', 2.0),
    (463, 'Field CA3', '#ff4fd8', 2.0),
    (632, 'Dentate gyrus, granule cell layer', '#7aa7ff', 2.0),
    (10703, 'Dentate gyrus, molecular layer', '#5a7fd6', 2.4),
    (10704, 'Dentate gyrus, polymorph layer', '#5a7fd6', 2.4),
]


def decode(path):
    """Decode a MeshView PNG mesh (RGB bytes carry a big-endian binary mesh)."""
    im = Image.open(path).convert('RGBA')
    rgba = im.tobytes()
    raw = bytearray(len(rgba) * 3 // 4)
    raw[0::3], raw[1::3], raw[2::3] = rgba[0::4], rgba[1::4], rgba[2::4]
    idx = 4 + 24  # header + bounds
    chunks = raw[idx]; idx += 1
    verts, tris, base = [], [], 0
    for _ in range(chunks):
        nv = struct.unpack_from('>H', raw, idx)[0]; idx += 2
        v = np.frombuffer(bytes(raw[idx:idx + nv * 24]), dtype='>f4').reshape(nv, 6)[:, :3]; idx += nv * 24
        ni = struct.unpack_from('>I', raw, idx)[0]; idx += 4
        t = np.frombuffer(bytes(raw[idx:idx + ni * 2]), dtype='>u2').astype(np.int64).reshape(-1, 3); idx += ni * 2
        verts.append(v.astype(np.float64)); tris.append(t + base); base += nv
    return np.concatenate(verts), np.concatenate(tris)


def simplify(v, t, cell):
    """Vertex clustering: merge vertices per grid cell, drop degenerate/duplicate triangles."""
    keys = np.floor(v / cell).astype(np.int64)
    uniq, inv = np.unique(keys, axis=0, return_inverse=True)
    inv = inv.ravel()
    nv = np.zeros((len(uniq), 3)); cnt = np.bincount(inv, minlength=len(uniq))
    for k in range(3):
        nv[:, k] = np.bincount(inv, weights=v[:, k], minlength=len(uniq)) / cnt
    nt = inv[t]
    ok = (nt[:, 0] != nt[:, 1]) & (nt[:, 1] != nt[:, 2]) & (nt[:, 0] != nt[:, 2])
    nt = nt[ok]
    nt = np.unique(np.sort(nt, axis=1), axis=0, return_index=True)[1]
    nt = inv[t][ok][np.sort(nt)]
    used = np.unique(nt)
    remap = -np.ones(len(nv), dtype=np.int64); remap[used] = np.arange(len(used))
    return nv[used], remap[nt]


def main():
    src = Path(sys.argv[1]) / 'AMBA_CCFv3_2017_full'
    out = Path(__file__).resolve().parent.parent / 'public' / 'assets' / 'atlas'
    out.mkdir(parents=True, exist_ok=True)
    blob, manifest = bytearray(), []
    lo, hi = np.full(3, np.inf), np.full(3, -np.inf)
    meshes = []
    for sid, label, color, cell in STRUCTURES:
        v, t = decode(src / f'{sid}.png')
        v, t = simplify(v, t, cell)
        lo, hi = np.minimum(lo, v.min(0)), np.maximum(hi, v.max(0))
        meshes.append((sid, label, color, v, t))
    scale = 65535.0 / float((hi - lo).max())
    for sid, label, color, v, t in meshes:
        q = np.round((v - lo) * scale).astype('<u2')
        pos_off = len(blob); blob += q.tobytes()
        while len(blob) % 4: blob += b'\0'
        assert len(v) < 65536
        idx_off = len(blob); blob += t.astype('<u2').tobytes()
        while len(blob) % 4: blob += b'\0'
        manifest.append({'id': sid, 'name': label, 'color': color,
                         'positions': [pos_off, int(len(v))], 'indices': [idx_off, int(t.size)]})
        print(f'{sid:>6} {label:<36} {len(v):>6} verts {len(t):>6} tris')
    (out / 'ccf.bin').write_bytes(bytes(blob))
    (out / 'ccf.json').write_text(json.dumps({
        'source': 'Allen Mouse Brain Common Coordinate Framework v3 (2017), © Allen Institute for Brain Science. '
                  'Meshes via MeshView for Brain Atlases (University of Oslo, MIT licence).',
        'citation': 'Wang Q. et al. (2020) The Allen Mouse Brain Common Coordinate Framework: A 3D Reference Atlas. Cell 181:936–953.',
        'units': 'CCFv3 voxels (25 µm); x = medio-lateral, y = antero-posterior, z = dorso-ventral',
        'origin': lo.round(4).tolist(), 'scale': 1.0 / scale, 'structures': manifest,
    }, indent=1))
    print(f'wrote {len(blob) / 1e6:.2f} MB')


if __name__ == '__main__':
    main()
