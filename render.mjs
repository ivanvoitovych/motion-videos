#!/usr/bin/env node
// Renders a video page (<folder>/index.html) to MP4, frame by frame.
//
// The page is a function of time (see lib/stage.js): for every frame this seeks it to
// frame/fps, screenshots the stage in headless Chrome and pipes the PNG to ffmpeg. Nothing is
// captured in real time, so the frame rate is exact and a slow box only renders slower.
//
// Usage: node render.mjs <folder> [--format wide|tall|feed|all] [--fps 30] [--scale 1] [--blur 4]
//                               [--frames 12,60,149] [--cut yt] [--chrome /path/to/chrome]
//   <folder>   the folder that holds the page's index.html, for example examples/hello
//   --format   wide 1920x1080 (YouTube, landscape), tall 1080x1920 (TikTok, Reels, Shorts),
//              feed 1080x1350 (Instagram feed). The page lays itself out per format through
//              html[data-format]. Default wide. A page lists the shapes it is laid out for in
//              <html data-formats="wide tall">; asking for another one is refused.
//   --cut yt   a second edit of the same page (html[data-cut], see lib/stage.js); the output is
//              named <folder name>-<cut>-<format>
//   --scale 2  renders at twice the pixel size
//   --blur 4   motion blur: renders 4 moments per frame and averages them, so fast moves smear
//              the way a camera shutter would. 4x the render time. Off by default.
//   --frames   writes those frames as PNGs instead of encoding (to inspect a composition)
//   --jobs 2   renders the video in that many pieces at once, each in its own Chrome, and joins
//              them. EXPERIMENTAL and capped at 3: every piece is a whole Chrome plus an encoder,
//              and five of them on a video made from a recorded take ran an 8 GB machine out of
//              memory. Not yet shown to be faster. Leave it off unless measuring it.
//   --chrome   the Chrome or Chromium to use, when it is not in one of the usual places
// Output: out/<folder name>[-<cut>]-<format>.mp4, and next to it a .jpg of frame 0: the cover, to
//         upload as the thumbnail or preview image. Design frame 0 to be that picture. (git-ignored)

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { findChrome } from './lib/chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

// Keep in step with the [data-format] sizes in lib/stage.css.
const FORMATS = {
  wide: { width: 1920, height: 1080 },
  tall: { width: 1080, height: 1920 },
  feed: { width: 1080, height: 1350 },
};

const args = process.argv.slice(2);
const folder = !args[0] || args[0].startsWith('--') ? null : resolve(args[0]);
const name = folder && basename(folder);
const opt = (flag, def) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : def; };
const fps = Number(opt('--fps', 30));
const scale = Number(opt('--scale', 1));
const blur = Math.max(1, Number(opt('--blur', 1)));
const only = opt('--frames', '') ? opt('--frames', '').split(',').map(Number) : null;
const cut = opt('--cut', '');
// What the output files are called: hello-wide, or hello-yt-wide for a cut.
const base = cut ? `${name}-${cut}` : name;
const wanted = opt('--format', 'wide');
const formats = wanted === 'all' ? Object.keys(FORMATS) : [wanted];
const jobs = Math.min(3, Math.max(1, Number(opt('--jobs', 1))));
// Set by this script on the pieces it starts: "2/6" is the third of six.
const part = opt('--part', '') ? opt('--part', '').split('/').map(Number) : null;

const pagePath = join(folder || '', 'index.html');
const badFormat = formats.find(f => !FORMATS[f]);
if (badFormat) console.error(`Unknown format "${badFormat}". One of: ${Object.keys(FORMATS).join(', ')}, all`);
else if (folder && !existsSync(pagePath)) console.error(`No index.html in ${folder}`);
if (!folder || !existsSync(pagePath) || badFormat) {
  console.error('Usage: node render.mjs <folder> [--format wide|tall|feed|all] [--fps 30] [--scale 1] [--blur 4] [--frames 12,60] [--cut name]');
  process.exit(1);
}

const OUT = join(HERE, 'out');
mkdirSync(OUT, { recursive: true });

// ---- several pieces at once: start one copy of this script per piece, then join the pieces ----
if (jobs > 1 && !only && !part) {
  const run = (cmd, a) => new Promise((res, rej) => spawn(cmd, a, { stdio: ['ignore', 'inherit', 'inherit'] }).on('close', c => c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  for (const format of formats) {
    const started = Date.now();
    const pieces = Array.from({ length: jobs }, (_, i) => join(OUT, `${base}-${format}.part${i}.mp4`));
    const pass = args.filter((a, i) => !['--jobs', '--format'].includes(a) && !['--jobs', '--format'].includes(args[i - 1]));
    await Promise.all(pieces.map((_, i) => run(process.execPath, [fileURLToPath(import.meta.url), ...pass, '--format', format, '--part', `${i}/${jobs}`])));
    const list = join(OUT, `${base}-${format}.parts.txt`);
    writeFileSync(list, pieces.map(f => `file '${f}'\n`).join(''));
    const out = join(OUT, `${base}-${format}.mp4`);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
    for (const f of [...pieces, list]) rmSync(f, { force: true });
    console.log(`${out}  rendered in ${jobs} pieces in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  process.exit(0);
}

const browser = await puppeteer.launch({
  executablePath: findChrome(opt('--chrome', '')),
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--allow-file-access-from-files'],
});

for (const format of formats) {
  const size = FORMATS[format];
  const page = await browser.newPage();
  await page.setViewport({ ...size, deviceScaleFactor: scale });
  page.on('pageerror', e => console.error('page error:', String(e)));
  page.on('requestfailed', r => console.error('missing asset:', r.url()));
  await page.goto(`${pathToFileURL(pagePath).href}?render=1&format=${format}${cut ? `&cut=${cut}` : ''}`, { waitUntil: 'load' });
  await page.evaluate(() => window.__ready());
  // <html data-formats="wide tall"> lists the shapes a page has a layout for. Any other shape would
  // render, but as a broken picture, so it is refused.
  const laidOut = await page.evaluate(() => document.documentElement.dataset.formats || '');
  if (laidOut && !laidOut.split(/\s+/).includes(format)) {
    console.error(`${name} has no ${format} layout (its data-formats is "${laidOut}"). Add [data-format="${format}"] rules to the page and list "${format}" there.`);
    process.exitCode = 1;
    await page.close();
    continue;
  }

  const duration = await page.evaluate(() => window.__duration);
  const total = Math.round(duration / 1000 * fps);
  // A piece renders its own share of the frames, in whole output frames so the blur groups line up.
  const first = part ? Math.floor(total * part[0] / part[1]) : 0;
  const last = part ? Math.floor(total * (part[0] + 1) / part[1]) : total;
  const clip = { x: 0, y: 0, ...size };
  const frameAt = async (i, extra = {}) => {
    await page.evaluate(ms => window.__seek(ms), i * 1000 / fps);
    return page.screenshot({ type: 'png', clip, optimizeForSpeed: true, ...extra });
  };

  // The first screenshot of a page rasters large images differently from every later one (measured:
  // same moment, different pixels, only on the first capture). Take one and throw it away.
  await frameAt(total - 1);

  const started = Date.now();
  if (only) {
    for (const i of only) {
      if (i >= total) console.error(`frame ${i} is past the end: the video has ${total} frames (0 to ${total - 1}) at ${fps} fps`);
      const path = join(OUT, `${base}-${format}-${String(i).padStart(4, '0')}.png`);
      await frameAt(i, { path });
      console.log(path);
    }
  } else {
    // The cover: frame 0 as a picture, for the platforms that ask for a thumbnail.
    if (!part || part[0] === 0) await frameAt(0, { path: join(OUT, `${base}-${format}.jpg`), type: 'jpeg', quality: 92 });
    const out = join(OUT, part ? `${base}-${format}.part${part[0]}.mp4` : `${base}-${format}.mp4`);
    // With blur, every output frame is the average of `blur` moments spread across its own 1/fps.
    const ffmpeg = spawn('ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'image2pipe', '-framerate', String(fps * blur), '-i', '-',
      ...(blur > 1 ? ['-vf', `tmix=frames=${blur},framestep=${blur}`, '-r', String(fps)] : []),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
      out,
    ], { stdio: ['pipe', 'inherit', 'inherit'] });
    const done = new Promise((res, rej) => ffmpeg.on('close', code => code === 0 ? res() : rej(new Error(`ffmpeg exited ${code}`))));

    for (let i = first * blur; i < last * blur; i++) {
      const png = await frameAt(i / blur);
      if (!ffmpeg.stdin.write(png)) await new Promise(r => ffmpeg.stdin.once('drain', r));
    }
    ffmpeg.stdin.end();
    await done;
    if (!part) console.log(`${out}  ${size.width}x${size.height}, ${total} frames at ${fps} fps, rendered in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  }
  await page.close();
}

await browser.close();
