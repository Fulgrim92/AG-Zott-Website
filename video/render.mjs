// Render both compositions: node render.mjs [--frames=0-60] [--only=SummaryBg]
// Needs the Blender plates first (npm run plates). Media is copied from the website's public folder.
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { cpSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const site = path.resolve(here, '..');
const media = path.join(here, 'public/media');
mkdirSync(media, { recursive: true });
for (const [from, to] of [['public/assets/lab/2p/bl6.mp4', 'bl6.mp4'], ['public/assets/lab/ihc/app23xps45-8.0mo.jpg', 'ihc.jpg'], ['public/assets/logos/erc.png', 'erc.png'], ['public/assets/logos/dfg.png', 'dfg.png']]) {
  if (existsSync(path.join(site, from))) cpSync(path.join(site, from), path.join(media, to));
}
const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
const frameRange = arg('frames') ? arg('frames').split('-').map(Number) : null;
const only = arg('only');
const browserExecutable = process.env.CHROME ?? (existsSync('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell') ? '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' : null);
const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.ts'), publicDir: path.join(here, 'public') });
const outDir = path.join(here, 'out');
for (const id of ['SummaryBg', 'Summary']) {
  if (only && only !== id) continue;
  const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: 'swiftshader' } });
  const out = path.join(outDir, `${id}.mp4`);
  await renderMedia({
    composition, serveUrl, codec: 'h264', outputLocation: out, browserExecutable, crf: id === 'SummaryBg' ? 30 : 23,
    chromiumOptions: { gl: 'swiftshader' }, frameRange, concurrency: 3, muted: true,
    onProgress: ({ progress }) => process.stdout.write(`\r${id} ${(progress * 100).toFixed(0)}%   `),
  });
  console.log('\nwrote', out);
}

// Publish to the website (skipped for partial renders)
if (!frameRange) {
  const dest = path.join(site, 'public/assets/video');
  mkdirSync(dest, { recursive: true });
  for (const [id, name] of [['SummaryBg', 'summary-bg.mp4'], ['Summary', 'summary.mp4']]) {
    const src = path.join(outDir, `${id}.mp4`);
    if (!existsSync(src)) continue;
    cpSync(src, path.join(dest, name));
    // VP9 copy for browsers without H.264
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', src, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', id === 'SummaryBg' ? '40' : '34', '-row-mt', '1', '-cpu-used', '4', '-an', path.join(dest, name.replace('.mp4', '.webm'))]);
  }
  const bg = path.join(outDir, 'SummaryBg.mp4');
  if (existsSync(bg)) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', bg, '-frames:v', '1', '-q:v', '4', path.join(dest, 'summary-poster.jpg')]);
  console.log('copied to', dest);
}
