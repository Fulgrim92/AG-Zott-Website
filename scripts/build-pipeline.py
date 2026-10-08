#!/usr/bin/env python3
"""
Build the data behind the homepage "From photons to findings" walkthrough.

Everything here is derived from the lab's own two-photon recording that is already on the site:

  public/assets/lab/2p/bl6.mp4      raw greyscale movie (60 s of recording, 600 frames → 10 frames/s)
  public/assets/lab/2p/bl6-roi.mp4  the lab's ROI figure movie (5 ROIs + their ΔF/F traces)

Outputs
  public/assets/lab/2p/pipeline/mean.jpg   mean projection of the movie
  public/assets/lab/2p/pipeline/corr.jpg   local temporal correlation image
  src/data/pipeline.json                   ROI ellipses, traces and detected events

Two kinds of traces are written, and the site labels them differently:

  * "lab"      — the ΔF/F traces from the lab's own analysis, digitised from the last frame of
                 bl6-roi.mp4 (one value per screen pixel column, ≈ 12.5 samples/s).
  * "computed" — this script re-runs the steps of the lab's analysis software (TwoPhotonAnalyzer,
                 METHODS.md: mean in ellipse → Savitzky–Golay + moving average → Gaussian smoothing →
                 rolling 20th-percentile F0 over 30 s → ΔF/F → MAD noise → peak detection, default
                 settings) on the web-compressed movie. It demonstrates the method; it is not the
                 lab's analysed dataset.

Usage: python3 scripts/build-pipeline.py   (needs ffmpeg, numpy, scipy, pillow)
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter, gaussian_filter1d, maximum_filter, percentile_filter
from scipy.signal import find_peaks, savgol_filter

ROOT = Path(__file__).resolve().parent.parent
LAB = ROOT / 'public/assets/lab/2p'
OUT_IMG = LAB / 'pipeline'
OUT_JSON = ROOT / 'src/data/pipeline.json'

SET_DIAM = 30  # expected soma diameter in pixels (lab default roi_diameter_px)
FPS = 10.0            # 600 frames span 60 s of recording (clip plays at 4× real time)
W, H = 502, 458       # bl6.mp4

# Lab analysis defaults (twophoton/model.py, Settings)
SET = dict(baseline_percentile=20.0, baseline_window_s=30.0, smoothing_s=0.15, threshold_sigma=3.0,
           min_amplitude=0.05, min_duration_s=0.1, min_distance_s=0.5, peak_prominence=0.1,
           savgol_window=5, moving_average_window=5)

# ROI figure geometry (bl6-roi.mp4, 1706×744): image panel and plot axes
IMG_BOX = (81, 30, 746, 636)          # x0, y0, x1, y1 of the movie inside the figure
AX_X0, AX_X1, AX_T1 = 877, 1625, 60.0  # t = 0 s and t = 60 s
AX_Y0, AX_PX = 584, 111.0              # y of ΔF/F = 0 and pixels per 1.0 (= 100 %) ΔF/F
# Colours of the lab's ROIs, bottom trace first (trace offset = index)
ROIS = [
    ('green', (130, 200, 120)),
    ('lavender', (190, 170, 215)),
    ('orange', (250, 190, 130)),
    ('blue', (60, 100, 170)),
    ('magenta', (225, 20, 120)),
]
# Burned-in overlays in bl6.mp4 (timestamp, scale bar) — excluded from images
OVERLAYS = [(0, 0, 140, 42), (8, 428, 82, 452)]


def frames(path, w, h):
    cmd = ['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'rawvideo', '-pix_fmt', 'gray', '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w)


def last_frame_rgb(path):
    cmd = ['ffmpeg', '-v', 'error', '-sseof', '-0.1', '-i', str(path), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-']
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(744, 1706, 3).astype(int)


def colour_mask(im, rgb, name):
    d = np.abs(im - np.array(rgb)).sum(2) < 60
    if name == 'lavender':  # separate from grey pixels of the movie
        r, g, b = im[..., 0], im[..., 1], im[..., 2]
        d &= (b - g > 15) & (r - g > 5)
    return d


def norm_img(a, lo=1, hi=99.7):
    p0, p1 = np.percentile(a, [lo, hi])
    return np.clip((a - p0) / (p1 - p0 + 1e-9), 0, 1)


def ellipse_mask(cx, cy, rx, ry):
    yy, xx = np.mgrid[0:H, 0:W]
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1


def dff_pipeline(f):
    """TwoPhotonAnalyzer 'peaks' pipeline with default settings."""
    f = savgol_filter(f, SET['savgol_window'], 2)
    k = SET['moving_average_window']
    f = np.convolve(np.pad(f, k // 2, mode='edge'), np.ones(k) / k, mode='valid')
    fs = gaussian_filter1d(f, SET['smoothing_s'] * FPS, mode='nearest')
    win = int(round(SET['baseline_window_s'] * FPS)) | 1
    f0 = percentile_filter(fs, SET['baseline_percentile'], size=min(win, len(fs) - (1 - len(fs) % 2)), mode='nearest')
    dff = (fs - f0) / f0
    return fs, f0, dff


def detect(dff, fps):
    d = np.diff(dff)
    sigma = 1.4826 * np.median(np.abs(d - np.median(d))) / np.sqrt(2)
    thr = max(SET['min_amplitude'], SET['threshold_sigma'] * sigma, 1e-12)
    prom = max(SET['peak_prominence'], SET['threshold_sigma'] * sigma, 1e-12)
    peaks, _ = find_peaks(dff, height=thr, prominence=prom, width=SET['min_duration_s'] * fps,
                          distance=max(1, int(np.ceil(SET['min_distance_s'] * fps))))
    return peaks, sigma, thr


def r3(a):
    return [round(float(x), 3) for x in a]


def main():
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    mov = frames(LAB / 'bl6.mp4', W, H).astype(np.float32)
    n = len(mov)
    print('frames', mov.shape)

    # ---- Projections -------------------------------------------------------------------------
    mean = mov.mean(0)
    z = (mov - mean) / (mov.std(0) + 1e-6)
    corr = np.zeros((H, W), np.float32)
    cnt = np.zeros((H, W), np.float32)
    for dy, dx in ((0, 1), (1, 0)):
        c = (z[:, : H - dy, : W - dx] * z[:, dy:, dx:]).mean(0)
        corr[: H - dy, : W - dx] += c; cnt[: H - dy, : W - dx] += 1
        corr[dy:, dx:] += c; cnt[dy:, dx:] += 1
    corr /= np.maximum(cnt, 1)
    corr = gaussian_filter(corr, 0.8)  # soften 8×8 compression blocks
    for img in (mean, corr):
        for x0, y0, x1, y1 in OVERLAYS:  # fill burned-in text with the mirrored tissue next to it
            img[y0:y1, x0:x1] = img[y1:y1 + (y1 - y0), x0:x1][::-1] if y0 == 0 else img[y0 - (y1 - y0):y0, x0:x1][::-1]

    # ---- Automatic soma proposals (as in the lab's fast detector: small-minus-large Gaussian contrast
    #      on the correlation image, local maxima one soma diameter apart, robust threshold)
    view = np.clip(corr, 0, None)
    dog = gaussian_filter(view, 5) - gaussian_filter(view, 16)
    med = np.median(dog); mad = 1.4826 * np.median(np.abs(dog - med))
    peaks_img = (dog == maximum_filter(dog, size=int(SET_DIAM))) & (dog > med + 3 * mad)
    margin = 12
    peaks_img[:margin] = peaks_img[-margin:] = False; peaks_img[:, :margin] = peaks_img[:, -margin:] = False
    py, px = np.where(peaks_img)
    order = np.argsort(-dog[py, px])
    proposals = [dict(x=int(px[i]), y=int(py[i])) for i in order[:30]]
    Image.fromarray((norm_img(mean) ** 0.9 * 255).astype(np.uint8)).save(OUT_IMG / 'mean.jpg', quality=88)
    Image.fromarray((norm_img(np.clip(corr, 0, None), 2, 99.8) * 255).astype(np.uint8)).save(OUT_IMG / 'corr.jpg', quality=88)

    # ---- The lab's ROIs and traces, from the figure movie ------------------------------------------
    fig = last_frame_rgb(LAB / 'bl6-roi.mp4')
    sx = W / (IMG_BOX[2] - IMG_BOX[0] + 1)
    sy = H / (IMG_BOX[3] - IMG_BOX[1] + 1)
    rois = []
    for i, (name, rgb) in enumerate(ROIS):
        m = colour_mask(fig, rgb, name)
        # ellipse outline inside the image panel
        mm = m.copy(); mm[:, IMG_BOX[2] - 2:] = False; mm[:IMG_BOX[1] + 2] = False
        ys, xs = np.where(mm)
        if name == 'lavender':  # keep the largest cluster (the outline), drop stray pixels
            cy0, cx0 = np.median(ys), np.median(xs)
            keep = (np.abs(ys - cy0) < 45) & (np.abs(xs - cx0) < 45)
            ys, xs = ys[keep], xs[keep]
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        cx = ((x0 + x1) / 2 - IMG_BOX[0]) * sx
        cy = ((y0 + y1) / 2 - IMG_BOX[1]) * sy
        rx = ((x1 - x0) / 2 - 2) * sx  # minus half the stroke width
        ry = ((y1 - y0) / 2 - 2) * sy

        # digitise the trace (mean y of the coloured pixels in each column)
        t, v = [], []
        for x in range(AX_X0, AX_X1 + 1):
            col = np.where(m[: AX_Y0 + 140, x])[0]
            col = col[(col > AX_Y0 - (i + 1.6) * AX_PX) & (col < AX_Y0 - (i - 0.9) * AX_PX)]
            if len(col):
                t.append((x - AX_X0) / (AX_X1 - AX_X0) * AX_T1)
                v.append((AX_Y0 - col.mean()) / AX_PX - i)
        t, v = np.array(t), np.array(v)
        lab_fps = len(t) / (t[-1] - t[0])
        lab_peaks, lab_sigma, lab_thr = detect(v, lab_fps)

        # recompute from the raw movie with the lab's pipeline
        mask = ellipse_mask(cx, cy, rx, ry)
        fraw = mov[:, mask].mean(1)
        fs, f0, dff = dff_pipeline(fraw)
        peaks, sigma, thr = detect(dff, FPS)
        # agreement with the lab's trace (resampled to the movie's frame times)
        tt = np.arange(n) / FPS
        lab_on_frames = np.interp(tt, t, v)
        r = float(np.corrcoef(lab_on_frames, dff)[0, 1])

        rois.append(dict(
            id=name, color=name, cx=round(cx, 1), cy=round(cy, 1), rx=round(rx, 1), ry=round(ry, 1),
            lab=dict(t=r3(t), dff=r3(v), events=r3(t[lab_peaks]), sigma=round(float(lab_sigma), 4),
                     threshold=round(float(lab_thr), 3),
                     ratePerMin=round(len(lab_peaks) / (t[-1] - t[0]) * 60, 1)),
            computed=dict(fraw=r3(fraw), fsmooth=r3(fs), f0=r3(f0), dff=r3(dff), events=[int(p) for p in peaks],
                          sigma=round(float(sigma), 4), threshold=round(float(thr), 3),
                          ratePerMin=round(len(peaks) / (n / FPS) * 60, 1), rLab=round(r, 3)),
        ))
        print(f'{name:9s} centre=({cx:5.1f},{cy:5.1f}) r=({rx:4.1f},{ry:4.1f})  lab events={len(lab_peaks)} '
              f'computed events={len(peaks)}  r(lab, computed)={r:.2f}')

    out = dict(
        _readme='Generated by scripts/build-pipeline.py from public/assets/lab/2p/bl6.mp4 and bl6-roi.mp4. Do not edit by hand.',
        recording='bl6', fps=FPS, frames=n, durationS=n / FPS, width=W, height=H,
        settings=SET,
        images=dict(mean='assets/lab/2p/pipeline/mean.jpg', corr='assets/lab/2p/pipeline/corr.jpg'),
        rois=rois,
        proposals=proposals,
    )
    OUT_JSON.write_text(json.dumps(out, separators=(',', ':'), ensure_ascii=False))
    print('proposals', len(proposals))
    print('wrote', OUT_JSON, f'{OUT_JSON.stat().st_size / 1024:.0f} KB')


if __name__ == '__main__':
    main()
