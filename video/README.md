# Summary video

Motion-graphics summary of the website, shown behind "What we do" on the homepage.

- `blender/render_brain.py` renders the rotating Allen CCFv3 brain (hippocampus highlighted) with Blender Cycles into `public/plates/brain/` (`npm run plates`; needs `pip install bpy`).
- `src/` is a Remotion project. Scenes: title, brain plates, CA1 neurons firing (Three.js, illustrative), the lab's two-photon recording (real data), the synapse mechanism (illustrative, after Zott et al. 2019), the four methods, funders.
- `npm run render` copies the media from the website, renders `SummaryBg` (no captions, background loop) and `Summary` (with captions), and copies them to `../public/assets/video/` with a poster frame. The homepage picks the video up automatically when `summary-bg.mp4` exists.

Captions are in `src/Summary.tsx` (`scenes`).
