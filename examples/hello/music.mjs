#!/usr/bin/env node
// The sound for the hello video (9 s): a felt piano made to be ignored, and one short sound for
// each thing that happens on screen. The rules it follows are in docs/playbook.md, section 6: no
// tune, a slow tempo, no drums, a level well under the picture.
//
// F major: Fadd9, then Dm7, one soft chord a bar, a pad under it, then one wide chord and a bell
// under the closing line. Two bars fit before the closing line starts (7.4 s), which sets the
// tempo at about 65 BPM.
//
// Usage: node render.mjs examples/hello      (the picture, first)
//        node examples/hello/music.mjs
// Output: out/hello-music.wav, and out/hello-music.mp4: out/hello-wide.mp4 with the track under it
//         at -19 LUFS. Listen to the WAV first, then watch it with the picture.

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { band } from '../../lib/band.mjs';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../out');

// ---- The picture: the start times at the top of index.html's <style> ----
const TYPE = .5, STATS = 2.3, CHART = 3.5, TIP = 5.5, CLOSE = 7.4, LENGTH = 9;

// ---- The music: levels are the first thing to change when directing ----
const LEVEL = { piano: .7, pad: .1, pulse: .2, bell: .2, fx: .32 };
const BARS = 2, BAR = CLOSE / BARS, BEAT = BAR / 4;
const CHORDS = [
  { bass: 53, notes: [60, 65, 69, 79] },   // Fadd9
  { bass: 50, notes: [60, 65, 69, 77] },   // Dm7
];
const at = (bar, beat = 0) => bar * BAR + beat * BEAT;
const { piano, pad, bell, blip, noise, thump, finish } = band(LENGTH, 4711, LEVEL);

for (let bar = 0; bar < BARS; bar++) {
  const c = CHORDS[bar];
  // The chord, rolled from the bottom the way a hand plays it, left to ring for the bar.
  piano(at(bar), BAR * .95, c.bass, .8, 0, .45, true);
  c.notes.forEach((m, i) => piano(at(bar) + .02 * (i + 1), BAR * .95, m, .7, (i - 1.5) / 4, .45, true));
  // One note answers on the third beat.
  piano(at(bar, 2), BEAT * 1.8, c.notes[2], .35, .2, .5, true);
  for (const m of [c.bass, c.notes[0], c.notes[2]]) pad(at(bar), BAR, m, bar ? 1 : 1.3);
  // A soft low knock on each beat of the second bar, the first one a little firmer.
  if (bar >= 1) for (let i = 0; i < 4; i++) thump(at(bar, i), 72, 50, .03, .08, LEVEL.pulse * (i ? .6 : 1));
}

// The closing line: one wide chord, a bell, the pad holding under it.
[41, 53, 60, 65, 69, 72, 79].forEach((m, i) => piano(CLOSE + .03 * i, LENGTH - CLOSE, m, .85, (i - 3) / 6, .5, true));
bell(CLOSE + .4, 89, .7, .2);
for (const m of [53, 60, 65, 69]) pad(CLOSE, LENGTH - CLOSE - 1, m, 1.4);

// ---- Sounds on the picture: 30 to 150 ms each, all from the notes F G A C D ----
// Air across each change of scene.
for (const t of [STATS, CHART, CLOSE]) noise(t - .2, .45, { gain: LEVEL.fx * .55, f0: 900, f1: 4200, q: 1.1, shape: p => Math.sin(Math.PI * p) ** 2, pan0: -.6, pan1: .6, sendRoom: .3 });
// A key for each of the 33 characters typed over 1.5 s.
for (let i = 0; i < 33; i++) blip(TYPE + i * 1.5 / 33, 101 + (i % 3 === 2 ? 2 : 0), .01, .22, .15);
// The two numbers land, then count up.
blip(STATS, 77, .05, .5, -.3, .5); blip(STATS + .12, 81, .05, .5, .3, .5);
for (let i = 0; i < 8; i++) blip(STATS + .25 + i * .1, 77 + i * 1.3, .02, .26, -.4);
// The click on the peak, and the tooltip opening.
blip(TIP + .75, 93, .03, .6, .1, .5);
bell(TIP + .85, 93, .5, .2);

// name: what the files in out/ are called. video: the MP4 to put the track under (leave it out for
// the WAV alone). For the portrait video, change both and run this again.
finish({ name: 'hello-music', beat: BEAT, bars: BARS, video: join(OUT, 'hello-wide.mp4'), lufs: -19 });
