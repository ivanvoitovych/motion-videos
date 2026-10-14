// Records the REAL app being used, for a video: a scenario moves the mouse, clicks and types, and
// every frame of it is saved, with a timeline of where the cursor and the camera were. A video page
// then plays those frames back through lib/clip.js, so the result is rendered by the same
// render.mjs as everything else.
//
// How the frame rate stays exact without capturing in real time: the whole page runs in slow motion.
// CSS animations and transitions play at 1/slow speed, the page's own timers (toasts, debounces) are
// stretched by the same factor, and the scenario's mouse and keyboard are paced to match. One frame
// is taken every slow/fps seconds, which leaves time for the screenshot. Network answers are not
// slowed, so loading looks faster in the video than it is; do not use a take as evidence of speed.
//
// The cursor is NOT in the frames. Its position per frame goes into the timeline and the video page
// draws it, so it stays sharp when the camera zooms and can be restyled without a new take.
//
// Usage, from a scenario file:
//   import { record } from '../../lib/recorder.mjs';
//   await record('tour', { base: 'http://127.0.0.1:3000', start: '/orders' }, async t => {
//     await t.click({ text: 'Orders', in: 'nav a' });
//     await t.hold(1);
//   });
//
// Options:
//   base      the app's address. Or `serve`: a folder of static files, served for the take.
//   start     the path the take opens on.
//   login     async (page, base) => {}  runs first, at full speed and unrecorded: sign in through
//             the form, or set a cookie or a localStorage key, whatever your app needs.
//   setup     async (page, base) => {}  runs after login and before the take, unrecorded: put the
//             demo data in a known state (fixed names, dates and counts), so every take starts
//             the same and a difference between two takes is a UI change, not a data change.
//   cleanup   async (page, base) => {}  runs after the take, still signed in: delete what it made,
//             so the take can be shot again and again.
//   forbid    words that must never be readable on the page (a staging host, a real customer's
//             name). One hit fails the take, and a dry run, naming the frame.
//   block     parts of addresses the take must not request, for example your analytics endpoint,
//             so that a recording of a live site is not counted as a visit.
//   width, height, scale, fps, slow, localStorage, chrome, chromeArgs: see the code below.
//
// `--dry` after the scenario file runs it at full speed with no frames, to check that every step
// still finds its target. Output: out/<name>-take/ (frames/NNNNN.jpg, timeline.js).

import { createServer } from 'node:http';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { findChrome } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', 'out');

const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
// A folder of static files on a free local port, for an app that needs no backend.
const serveFolder = folder => new Promise(done => {
  const root = resolve(folder);
  const server = createServer((req, res) => {
    let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
    if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) { res.writeHead(404).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    createReadStream(file).pipe(res);
  });
  server.listen(0, '127.0.0.1', () => done({ server, base: `http://127.0.0.1:${server.address().port}` }));
});

const sleep = ms => new Promise(r => setTimeout(r, ms));
const ease = p => p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

export async function record(name, opts, scenario) {
  const dry = process.argv.includes('--dry');
  const fps = opts.fps || 30;
  const slow = dry ? 1 : (opts.slow || 10);
  const W = opts.width || 1600, H = opts.height || 900;
  const dir = join(OUT, `${name}-take`);
  if (!dry) { rmSync(dir, { recursive: true, force: true }); mkdirSync(join(dir, 'frames'), { recursive: true }); }

  if (!opts.base && !opts.serve) throw new Error('record(): give `base` (the app\'s address) or `serve` (a folder of static files)');
  const served = opts.serve ? await serveFolder(opts.serve) : null;
  const BASE = served ? served.base : opts.base.replace(/\/$/, '');
  const browser = await puppeteer.launch({
    executablePath: findChrome(opts.chrome), headless: 'new',
    // The blink flag makes headless Chrome report a mouse, so hover-only menus render as on a desktop.
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--blink-settings=primaryHoverType=2,availableHoverTypes=2,primaryPointerType=4,availablePointerTypes=4',
      ...(opts.chromeArgs || [])],
  });
  await browser.defaultBrowserContext().overridePermissions(BASE, ['clipboard-read', 'clipboard-write']).catch(() => {});
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: opts.scale || 2 });
  const cdp = await page.createCDPSession();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  // Requests the take must not make: your analytics, so a recording is not counted as a visit.
  if ((opts.block || []).length) {
    await page.setRequestInterception(true);
    page.on('request', r => opts.block.some(part => r.url().includes(part)) ? r.abort() : r.continue());
  }

  // Signing in is not part of the video: it runs first, at full speed, before slow motion is set up.
  if (opts.login) await opts.login(page, BASE);
  // So is putting the demo data in a known state.
  if (opts.setup) await opts.setup(page, BASE);

  // Slow motion: timers stretched, the text caret hidden (it blinks on the system clock, which
  // cannot be slowed, so it would flicker). Runs before any page script, on every document.
  await page.evaluateOnNewDocument((K, initial) => {
    const st = window.setTimeout, si = window.setInterval;
    window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) * K, ...a);
    window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) * K, ...a);
    for (const [k, v] of Object.entries(initial || {})) try { localStorage.setItem(k, v); } catch (e) {}
    document.addEventListener('DOMContentLoaded', () => {
      const s = document.createElement('style');
      s.textContent = '* { caret-color: transparent !important; } ::-webkit-scrollbar { display: none; }';
      document.head.appendChild(s);
    });
    // No red squiggle under a typed address. Setting it on <html> is not enough in Chrome: the
    // field itself has to say so, and it must happen before the first character lands.
    document.addEventListener('focusin', e => {
      if (e.target && 'spellcheck' in e.target) e.target.spellcheck = false;
    }, true);
  }, slow, opts.localStorage || {});
  const slowAnimations = async () => {
    await cdp.send('Animation.enable').catch(() => {});
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / slow }).catch(() => {});
  };

  // ---- the clock: one tick is one frame of video ----
  let frame = 0, mouse = { x: W * .7, y: H * .75 };
  const cursor = [], clicks = [], cameraKeys = [], captions = [], marks = [];
  const t0 = Date.now();
  // Words that must never be readable in a video: a local or staging address by default, plus
  // whatever the scenario lists. Checked against the visible text every few frames; one hit fails
  // the take (and a dry run), naming the frame.
  const forbid = ['127.0.0.1', 'localhost', ...(opts.forbid || [])];
  const leaks = new Map();
  const tick = async (n = 1) => {
    for (let i = 0; i < n; i++) {
      cursor.push([Math.round(mouse.x * 10) / 10, Math.round(mouse.y * 10) / 10]);
      if (frame % 6 === 0) {
        // A closed <select> shows only its chosen option, but innerText lists them all: leave the
        // others out, or a forbidden word among the options of a picker would fail every take.
        const seen = await page.evaluate(list => {
          let text = document.body.innerText;
          for (const sel of document.querySelectorAll('select')) for (const o of sel.options) if (!o.selected) text = text.split(o.textContent.trim()).join('');
          return list.filter(w => text.includes(w));
        }, forbid).catch(() => []);
        for (const w of seen) if (!leaks.has(w)) leaks.set(w, frame);
      }
      if (!dry) {
        await page.screenshot({ path: join(dir, 'frames', String(frame).padStart(5, '0') + '.jpg'), type: 'jpeg', quality: 92, optimizeForSpeed: true });
        const due = t0 + (frame + 1) * slow / fps * 1000;
        if (Date.now() < due) await sleep(due - Date.now());
      }
      frame++;
    }
  };
  const frames = seconds => Math.max(1, Math.round(seconds * fps));

  // ---- finding things: a CSS selector, { text, in } for "the element in `in` with this text", or
  //      { label } for the field a label names ----
  let lastHandle = null;
  const find = async target => {
    const deadline = Date.now() + 15000 * (dry ? 1 : 2);
    for (;;) {
      const handle = typeof target === 'string'
        ? await page.$(target)
        : target.label
          // the control that belongs to a label: inside it, or next to it in the same block
          ? (await page.evaluateHandle((text, kind) => {
              const label = [...document.querySelectorAll('label')].find(l => l.textContent.trim().replace(/\s+/g, ' ').startsWith(text));
              return label ? (label.querySelector(kind) || label.parentElement.querySelector(kind)) : null;
            }, target.label, target.kind || 'select, input, textarea')).asElement()
          : (await page.evaluateHandle((sel, text) => [...document.querySelectorAll(sel)].find(e => e.textContent.trim().replace(/\s+/g, ' ') === text || (e.getAttribute('aria-label') || '') === text) || null, target.in || '*', target.text)).asElement();
      lastHandle = handle;
      const box = handle && await handle.boundingBox();
      if (box && box.width > 0) return box;
      if (Date.now() > deadline) throw new Error('not found: ' + JSON.stringify(target));
      await tick();
      if (dry) await sleep(50);
    }
  };
  const pointOf = (box, at) => ({ x: box.x + box.width * (at ? at[0] : .5), y: box.y + box.height * (at ? at[1] : .5) });

  const t = {
    page, frame: () => frame,
    /** Do nothing for a while (the viewer reads, or the page settles). */
    hold: seconds => tick(frames(seconds)),
    /** Full page load. */
    async goto(route) {
      await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 });
      await slowAnimations();
      await page.mouse.move(mouse.x, mouse.y);
    },
    /** Keep recording until the target is on the page. */
    waitFor: target => find(target),
    /** Keep recording until the page says so. */
    async until(fn, arg, seconds = 20) {
      const deadline = Date.now() + seconds * 1000 * (dry ? 1 : 2);
      while (!(await page.evaluate(fn, arg))) {
        if (Date.now() > deadline) throw new Error('until() gave up: ' + fn.toString().slice(0, 80));
        await tick();
        if (dry) await sleep(50);
      }
    },
    /** Move the mouse to the target along a slightly bent, eased path; longer for longer trips. */
    async moveTo(target, at, seconds) {
      const to = pointOf(await find(target), at), from = { ...mouse };
      const dist = Math.hypot(to.x - from.x, to.y - from.y);
      const n = frames(seconds || (.3 + dist / 2200));
      const bend = Math.min(60, dist * .12), nx = -(to.y - from.y) / (dist || 1), ny = (to.x - from.x) / (dist || 1);
      for (let i = 1; i <= n; i++) {
        const p = ease(i / n), arc = Math.sin(p * Math.PI) * bend;
        mouse = { x: from.x + (to.x - from.x) * p + nx * arc, y: from.y + (to.y - from.y) * p + ny * arc };
        await page.mouse.move(mouse.x, mouse.y);
        await tick();
      }
    },
    /** Move there, settle, press and release. */
    async click(target, at) {
      if (target) await t.moveTo(target, at);
      await tick(frames(.15));
      clicks.push(frame);
      await page.mouse.down();
      await tick(2);
      await page.mouse.up();
      await tick(frames(.2));
    },
    /** Type into whatever has the focus, a key every `per` seconds. */
    async type(text, per = .06) {
      for (const ch of text) {
        await page.keyboard.type(ch);
        await tick(frames(per));
      }
    },
    async press(key) { await page.keyboard.press(key); await tick(2); },
    /** Empty the field that has the focus (select all, delete), as a person replacing its text would. */
    async clear() {
      await page.keyboard.down('Control'); await page.keyboard.press('KeyA'); await page.keyboard.up('Control');
      await tick(frames(.25));
      await page.keyboard.press('Backspace');
      await tick(frames(.2));
    },
    /** Choose an option of a native <select> by its text. The browser's own list is not part of the
     *  page, so it cannot be filmed: the cursor clicks the field and the value changes. */
    async select(target, option) {
      await t.click(target, [.8, .5]);
      await lastHandle.evaluate((el, text) => {
        const o = [...el.options].find(x => x.textContent.trim() === text);
        if (!o) throw new Error('no option ' + text);
        el.value = o.value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, option);
      await tick(frames(.35));
    },
    /** Set a colour field (the system colour picker cannot be filmed either). */
    async colour(target, hex) {
      await t.moveTo(target);
      await tick(frames(.15));
      clicks.push(frame);
      await lastHandle.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, hex);
      await tick(frames(.4));
    },
    /** Paste into a field: the text is there at once, as after Ctrl+V. */
    async paste(target, text) {
      await t.click(target, [.4, .3]);
      await lastHandle.evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, text);
      await tick(frames(.5));
    },
    /** Scroll the page smoothly until the target sits at this fraction of the window height. */
    async scrollTo(target, at = .4, seconds = .9) {
      const box = await find(target);
      const total = box.y + box.height / 2 - H * at, n = frames(seconds);
      let done = 0;
      for (let i = 1; i <= n; i++) {
        const want = total * ease(i / n);
        await page.evaluate(dy => window.scrollBy(0, dy), want - done);
        done = want;
        await tick();
      }
    },
    /** Tick or untick a checkbox, radio or switch with a real click. */
    async check(target) { await t.click(target, [.5, .5]); },
    /** Drag across the target, from and to given as fractions of its width (a range slider). */
    async drag(target, from, to, seconds = .9) {
      const box = await find(target);
      await t.moveTo(target, [from, .5]);
      await tick(frames(.15));
      clicks.push(frame);
      await page.mouse.down();
      const n = frames(seconds);
      for (let i = 1; i <= n; i++) {
        mouse = { x: box.x + box.width * (from + (to - from) * ease(i / n)), y: box.y + box.height / 2 };
        await page.mouse.move(mouse.x, mouse.y);
        await tick();
      }
      await page.mouse.up();
      await tick(frames(.2));
    },
    /** Point the camera: at a target (zoom = how much closer), or back to the whole page with no target. */
    async cam(target, zoom = 1, seconds = .9, at, fix = {}) {
      // fix.x / fix.y pin one coordinate (keep a centred dialog centred while following a field down it)
      const p = { ...(target ? pointOf(await find(target), at) : { x: W / 2, y: H / 2 }), ...fix };
      cameraKeys.push({ frame, frames: frames(seconds), to: [Math.round(p.x), Math.round(p.y), target ? zoom : 1] });
    },
    /** A caption on screen from now, for this many seconds. */
    say(text, seconds = 3) { captions.push({ from: frame, to: frame + frames(seconds), text }); },
    mark(label) { marks.push({ frame, label }); console.log(`  ${String(frame).padStart(5)}  ${(frame / fps).toFixed(1).padStart(6)}s  ${label}`); },
  };

  let failed = null;
  try {
    await t.goto(opts.start);
    await tick(frames(.5));
    await scenario(t);
  } catch (e) {
    failed = e;
    // What the page looked like when a step gave up.
    mkdirSync(OUT, { recursive: true });
    await page.screenshot({ path: join(OUT, `${name}-failed.png`) }).catch(() => {});
  }
  // Put back whatever the take created, while the page is still signed in.
  if (opts.cleanup) {
    try { await opts.cleanup(page, BASE); } catch (e) { console.error('cleanup failed:', e.message); process.exitCode = 1; }
  }
  await browser.close();
  if (served) served.server.close();
  if (failed) { console.error('\nscenario stopped at frame', frame, '-', failed.message); process.exitCode = 1; }
  for (const e of errors) console.error('page error:', e);
  for (const [word, at] of leaks) { console.error(`FORBIDDEN WORD ON SCREEN: "${word}" first readable at frame ${at} (${(at / fps).toFixed(1)} s). Do not use this take.`); process.exitCode = 1; }
  if (dry) { console.log(`dry run: ${frame} frames (${(frame / fps).toFixed(1)} s)${failed ? ', FAILED' : ', every step found its target'}`); return; }

  // The camera per frame: each key eases from wherever the camera was to its target. Clamped so the
  // view never leaves the page.
  const camera = [];
  let cur = [W / 2, H / 2, 1], k = 0, moving = null;
  for (let f = 0; f < frame; f++) {
    while (k < cameraKeys.length && cameraKeys[k].frame <= f) { moving = { ...cameraKeys[k], from: cur.slice() }; k++; }
    if (moving) {
      const p = ease(Math.min(1, (f - moving.frame + 1) / moving.frames));
      cur = moving.from.map((v, i) => v + (moving.to[i] - v) * p);
    }
    const s = cur[2], hw = W / s / 2, hh = H / s / 2;
    camera.push([Math.round(Math.min(W - hw, Math.max(hw, cur[0]))), Math.round(Math.min(H - hh, Math.max(hh, cur[1]))), Math.round(s * 1000) / 1000]);
  }
  const timeline = { name, fps, frames: frame, width: W, height: H, cursor, clicks, camera, captions, marks };
  writeFileSync(join(dir, 'timeline.js'), 'window.TIMELINE = ' + JSON.stringify(timeline) + ';\n');
  console.log(`${dir}  ${frame} frames (${(frame / fps).toFixed(1)} s of video), recorded in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
}
