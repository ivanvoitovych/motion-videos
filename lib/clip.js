// Plays a take made by lib/recorder.mjs inside a video page. Load the take's timeline first, then
// this, then stage.js:
//   <div class="clip" data-take="../../out/tour-take" data-at="2"></div>
//   <script src="../../out/tour-take/timeline.js"></script>
//   <script src="../../lib/clip.js"></script>
//   <script src="../../lib/stage.js"></script>
// data-at: the second of the video at which the take starts; data-skip: seconds of the take to leave
// out at its start. The clip fills its box; give the box
// the take's aspect ratio. For every moment it shows the right frame, moves the camera, and draws
// the cursor, the click rings and the captions from the timeline. Positions between two frames are
// interpolated, so motion blur (render.mjs --blur) works on camera and cursor moves.
(function () {
  const T = window.TIMELINE;
  const box = document.querySelector('.clip');
  if (!T || !box) return;
  const at = Number(box.dataset.at || 0) * 1000, take = box.dataset.take;
  const skip = Number(box.dataset.skip || 0) * T.fps;   // frames of the take left out at its start

  box.innerHTML =
    '<div class="clip-world"><img class="clip-frame" alt="">' +
    '<div class="clip-rings"></div>' +
    '<svg class="clip-cursor" viewBox="0 0 28 38"><path d="M2 2v29l7.5-7 5 12 5-2-5-11.5H25z" fill="#14181F" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"/></svg>' +
    '</div><div class="clip-caption"></div>';
  const world = box.querySelector('.clip-world'), img = box.querySelector('.clip-frame'),
    cursor = box.querySelector('.clip-cursor'), rings = box.querySelector('.clip-rings'),
    // The captions show in the clip's own chip, or in any element marked data-clip-caption (a headline).
    caption = document.querySelector('[data-clip-caption]') || box.querySelector('.clip-caption');
  img.style.width = T.width + 'px';
  // Fixed windows onto the same take: <div data-clip-view="x,y,w,h"> always shows that part of the
  // page, whatever the camera does (the QR code stays in view while the controls are filmed).
  const views = [...document.querySelectorAll('[data-clip-view]')].map(el => {
    const [x, y, w, h] = el.dataset.clipView.split(',').map(Number);
    const pic = document.createElement('img');
    el.style.overflow = 'hidden';
    el.appendChild(pic);
    const k = el.clientWidth / w;
    pic.style.cssText = `position:absolute;left:0;top:0;width:${T.width}px;transform-origin:0 0;transform:scale(${k}) translate(${-x}px,${-y}px)`;
    return pic;
  });

  const lerp = (a, b, p) => a + (b - a) * p;
  const between = (list, f) => {
    const i = Math.max(0, Math.min(T.frames - 1, Math.floor(f))), j = Math.min(T.frames - 1, i + 1), p = Math.max(0, Math.min(1, f - i));
    return list[i].map((v, n) => lerp(v, list[j][n], p));
  };
  let shown = -1;

  // The whole video, in ms, including what comes before and after the take.
  window.__clipDuration = at + (T.frames - skip) / T.fps * 1000;

  window.__onSeek = async function (ms) {
    const f = Math.max(0, Math.min(T.frames - 1, (ms - at) / 1000 * T.fps + skip));
    const whole = Math.floor(f);
    if (whole !== shown) {
      shown = whole;
      const src = `${take}/frames/${String(whole).padStart(5, '0')}.jpg`;
      img.src = src;
      for (const v of views) v.src = src;
      await Promise.all([img, ...views].map(i => i.decode().catch(() => {})));
    }
    // Everything inside .clip-world is in the take's own pixels; one transform is the camera.
    // The box need not have the take's shape: the camera's point lands in the middle of the box.
    const [cx, cy, s] = between(T.camera, f);
    const z = box.clientWidth / T.width * s;
    world.style.transform = `scale(${z}) translate(${box.clientWidth / 2 / z - cx}px, ${box.clientHeight / 2 / z - cy}px)`;

    const [mx, my] = between(T.cursor, f);
    cursor.style.transform = `translate(${mx}px, ${my}px)`;

    // A ring grows and fades for a third of a second after each press.
    let html = '';
    for (const c of T.clicks) {
      const p = (f - c) / (T.fps * .4);
      if (p < 0 || p > 1) continue;
      const [x, y] = T.cursor[Math.min(T.frames - 1, c)];
      html += `<i style="left:${x}px;top:${y}px;transform:translate(-50%,-50%) scale(${.3 + p * 1.3});opacity:${.9 * (1 - p)}"></i>`;
    }
    rings.innerHTML = html;

    // As a headline (data-clip-caption) a caption stays until the next one starts, so the top of the
    // frame is never empty; as the chip inside the clip it keeps the length t.say() gave it.
    const held = caption.dataset.clipCaption !== undefined;
    const list = held
      ? T.captions.map((c, i) => ({ ...c, to: i + 1 < T.captions.length ? T.captions[i + 1].from - 1 : T.frames + T.fps }))
      : T.captions;
    const now = list.find(c => f >= c.from && f <= c.to);
    if (now) {
      const edge = Math.min(f - now.from, now.to - f) / (T.fps * .25);
      caption.textContent = now.text;
      caption.style.opacity = Math.max(0, Math.min(1, edge));
      caption.style.transform = caption.dataset.clipCaption === undefined ? `translate(-50%, ${(1 - Math.min(1, edge)) * 14}px)` : `translateY(${(1 - Math.min(1, edge)) * 14}px)`;
    } else {
      caption.style.opacity = 0;
    }
  };
})();
