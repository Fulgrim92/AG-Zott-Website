import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import path from 'node:path';
const here = path.dirname(new URL(import.meta.url).pathname);
const browserExecutable = '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell';
const serveUrl = await bundle({ entryPoint: path.join(here, 'src/index.ts'), publicDir: path.join(here, 'public') });
const id = process.argv[2] ?? 'Summary';
const composition = await selectComposition({ serveUrl, id, browserExecutable, chromiumOptions: { gl: 'swiftshader' } });
for (const f of process.argv.slice(3).map(Number)) {
  await renderStill({ composition, serveUrl, frame: f, output: path.join(here, `out/still-${id}-${f}.png`), browserExecutable, chromiumOptions: { gl: 'swiftshader' } });
  console.log('still', f);
}
