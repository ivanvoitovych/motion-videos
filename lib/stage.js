// Shared by every video page. A video is a plain HTML page whose motion is ordinary CSS animations
// (delays are offsets from the start of the video). That makes it a function of time:
// window.__seek(ms) pauses every animation and puts it at that moment, so render.mjs can screenshot
// it frame by frame at a constant rate, however slow the machine is.
//
// Opened in a normal browser the page just plays; a scrubber at the bottom seeks by hand.
// <html data-duration="5000"> gives the length in ms. ?format=wide|tall|feed picks the frame shape
// (default wide) and lands on <html data-format>, which the page's CSS lays itself out by.
// ?cut=<name> lands on <html data-cut>: a second edit of the same page (other timing, fewer scenes),
// done in the page's CSS. Its length is data-duration-<cut>-<format>, else data-duration-<cut>.
//
// A page can show other video pages inside it (the tour is built from the short cuts):
//   <iframe src="../hello/index.html?embed&format=tall" data-at="24" data-from="0" data-to="10.8">
// plays that page's seconds from..to starting at second `at` of this one. ?embed hides the inner
// page's own headlines and closing card (see stage.css). Parent and child talk by postMessage,
// because pages opened from file:// cannot reach into each other.
//
// A page can also play a take of the real app recorded by lib/recorder.mjs: see lib/clip.js, which
// sets window.__onSeek so the right frame is on screen at every moment.
(function () {
  const query = new URLSearchParams(location.search);
  const root = document.documentElement;
  const embedded = query.has('embed');
  root.dataset.format = query.get('format') || 'wide';
  const cut = query.get('cut');
  if (cut) root.dataset.cut = cut;
  const duration = Number((cut && (root.getAttribute(`data-duration-${cut}-${root.dataset.format}`) || root.getAttribute(`data-duration-${cut}`)))
    || root.dataset.duration || 5000);
  if (embedded) root.dataset.embed = '';

  const seekSelf = ms => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = ms;
    }
  };
  const readySelf = async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(i => i.decode().catch(() => {})));
  };
  const nextFrame = () => new Promise(r => requestAnimationFrame(() => r()));

  // ---- As a child: do what the parent says, and say when it is done. ----
  if (embedded) {
    window.addEventListener('message', async e => {
      const m = e.data || {};
      if (m.type === 'ping') {
        await readySelf();
        e.source.postMessage({ type: 'ready', id: m.id }, '*');
      } else if (m.type === 'seek') {
        seekSelf(m.ms);
        await nextFrame();
        e.source.postMessage({ type: 'sought', id: m.id }, '*');
      }
    });
    return;
  }

  // ---- As a parent: forward to the inner pages that are on screen at that moment. ----
  const inner = () => [...document.querySelectorAll('iframe[data-at]')];
  let nextId = 0;
  const waiting = new Map();
  window.addEventListener('message', e => {
    const done = waiting.get(e.data && e.data.id);
    if (done && (e.data.type === 'ready' || e.data.type === 'sought')) { waiting.delete(e.data.id); done(); }
  });
  const ask = (frame, message) => new Promise(resolve => {
    const id = ++nextId;
    waiting.set(id, resolve);
    frame.contentWindow.postMessage({ ...message, id }, '*');
  });
  // A page that is still loading does not hear the first ping, so keep asking until it answers.
  const whenReady = frame => new Promise(resolve => {
    let done = false;
    const attempt = () => {
      if (done) return;
      ask(frame, { type: 'ping' }).then(() => { done = true; resolve(); });
      setTimeout(attempt, 150);
    };
    attempt();
  });

  window.__duration = duration;
  window.__seek = async function (ms) {
    seekSelf(ms);
    // A page with a recorded take (lib/clip.js) shows the frame for this moment itself.
    if (window.__onSeek) await window.__onSeek(ms);
    const jobs = [];
    for (const f of inner()) {
      const at = Number(f.dataset.at) * 1000, from = Number(f.dataset.from || 0) * 1000, to = Number(f.dataset.to) * 1000;
      // Half a second either side, so the inner page is already in place while its panel fades.
      if (ms < at - 500 || ms > at + (to - from) + 500) continue;
      jobs.push(ask(f, { type: 'seek', ms: Math.min(to, Math.max(from, from + ms - at)) }));
    }
    await Promise.all(jobs);
  };
  window.__ready = async function () {
    await readySelf();
    await Promise.all(inner().map(whenReady));
  };

  if (query.has('render')) return;

  // Preview: a scrubber outside the stage, never in a rendered frame. Inner pages have no clock of
  // their own, so while previewing this one drives them from the time since load.
  window.addEventListener('DOMContentLoaded', () => {
    // Shrink the stage to fit the window, so a 1920x1080 or 1080x1920 video can be watched whole
    // on any screen. Preview only: a render always uses the real size.
    const SIZE = { wide: [1920, 1080], tall: [1080, 1920], feed: [1080, 1350] }[root.dataset.format] || [1920, 1080];
    const fit = () => { document.body.style.zoom = Math.min(1, window.innerWidth / SIZE[0], (window.innerHeight - 44) / SIZE[1]); };
    fit();
    window.addEventListener('resize', fit);

    const bar = document.createElement('input');
    bar.type = 'range';
    bar.min = 0;
    bar.max = duration;
    bar.value = 0;
    bar.style.cssText = 'position:fixed;left:16px;right:16px;bottom:12px;width:calc(100% - 32px);z-index:9999';
    let scrubbed = false;
    bar.addEventListener('input', () => { scrubbed = true; window.__seek(Number(bar.value)); });
    document.body.appendChild(bar);

    if (!inner().length && !window.__onSeek) return;
    const started = performance.now();
    const tick = async () => {
      if (scrubbed) return;
      const ms = performance.now() - started;
      if (ms > duration) return;
      if (window.__onSeek) await window.__onSeek(ms);
      const jobs = [];
      for (const f of inner()) {
        const at = Number(f.dataset.at) * 1000, from = Number(f.dataset.from || 0) * 1000, to = Number(f.dataset.to) * 1000;
        if (ms >= at - 500 && ms <= at + (to - from) + 500) jobs.push(ask(f, { type: 'seek', ms: Math.min(to, Math.max(from, from + ms - at)) }));
      }
      await Promise.all(jobs);
      requestAnimationFrame(tick);
    };
    window.__ready().then(tick);
  });
})();
