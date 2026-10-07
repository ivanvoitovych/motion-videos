// Music and sound made in code: plucked-string models, sines and noise. No samples and no
// dependencies, so there is nothing to license and nothing a platform can claim.
//
// band(length, seed, LEVEL) gives one track's worth of instruments writing into one mix; the same
// seed gives the same audio, sample for sample. LEVEL holds the loudness of each instrument the
// track uses (piano, pad, bell, fx, kick, snare, hat, ...): it is the first thing to change when
// someone directs the music by ear. finish({ name, beat, bars, video, lufs }) adds the echo and the
// room and writes out/<name>.wav. With `video` (an MP4 that exists) it also writes out/<name>.mp4:
// that picture with the track under it, copied, not rendered again. Leave `video` out for the WAV
// alone. Call finish() once: for a second video, change `name` and `video` and run the script again.
//
// For a video that is read, use the quiet instruments (piano with soft = true, pad, bell, blip,
// thump, noise) and the rules in docs/playbook.md, section 6. The drum kit, the amplifier, the
// strings and the choir are here for videos that want a song; a distorted guitar is the weakest
// thing the string model does, clean or muted it is convincing. See examples/hello/music.mjs.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../out');
export const SR = 44100, TAU = Math.PI * 2;
export const hz = m => 440 * 2 ** ((m - 69) / 12);

export function band(LENGTH, seed, LEVEL) {
  const N = Math.ceil(LENGTH * SR);
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

  const mono = () => new Float32Array(N);
  const bus = () => [mono(), mono()];
  const mix = bus(), room = bus(), echo = bus();
  const put = (b, i, v, pan = 0) => { if (i >= 0 && i < N) { b[0][i] += v * Math.min(1, 1 - pan); b[1][i] += v * Math.min(1, 1 + pan); } };

  // ---- A plucked string (Karplus-Strong), written into a mono track before any amplifier ----
  // `damp` is how fast the top end dies (a palm-muted string is heavily damped), `hold` how much of
  // the string's energy survives each trip round.
  function pluck(track, t, len, midi, o = {}) {
    const { gain = 1, damp = .5, hold = .996, bright = .6, cents = 0 } = o;
    const delay = SR / (hz(midi) * 2 ** (cents / 1200)) - damp, size = Math.ceil(delay) + 2;
    const line = new Float32Array(size), start = Math.round(t * SR), total = Math.round((len + .04) * SR);
    let lp = 0;
    for (let i = 0; i < size; i++) { lp += bright * (rnd() - lp); line[i] = lp; }
    let w = 0, prev = 0;
    for (let i = 0; i < total && start + i < N; i++) {
      const rp = w - delay + size * 2, i0 = Math.floor(rp), f = rp - i0;
      const cur = line[i0 % size] * (1 - f) + line[(i0 + 1) % size] * f;
      const s = (1 - damp) * cur + damp * prev;
      prev = cur;
      line[w] = s * hold;
      w = (w + 1) % size;
      const fade = i / SR < len ? 1 : Math.max(0, 1 - (i / SR - len) / .04);
      track[start + i] += cur * gain * fade;
    }
  }

  // ---- The amplifier: tighten the low end, distort, then a speaker that rolls off the fizz ----
  // A distortion makes quiet playing as loud as hard playing, so `ride` turns the result down where
  // the arrangement is meant to be smaller (a hand on the fader).
  function amp(track, drive, level, pan, sendRoom = .12, sendEcho = 0, ride = () => 1) {
    let hpIn = 0, lp1 = 0, lp2 = 0, hpOut = 0;
    const kIn = 1 - Math.exp(-TAU * 110 / SR), kLp = 1 - Math.exp(-TAU * 4200 / SR), kOut = 1 - Math.exp(-TAU * 70 / SR);
    for (let i = 0; i < N; i++) {
      hpIn += kIn * (track[i] - hpIn);
      const x = (track[i] - hpIn) * drive;
      const d = Math.tanh(x) + .15 * Math.tanh(x * x * Math.sign(x) * .5);
      lp1 += kLp * (d - lp1); lp2 += kLp * (lp1 - lp2);
      hpOut += kOut * (lp2 - hpOut);
      const v = (lp2 - hpOut) * level * ride(i / SR);
      put(mix, i, v, pan);
      if (sendRoom) put(room, i, v * sendRoom, pan);
      if (sendEcho) put(echo, i, v * sendEcho, pan);
    }
  }

  // Noise through a band-pass whose centre moves from f0 to f1 (hp takes the high-pass output).
  function noise(t, len, o) {
    const { gain = .2, f0 = 2000, f1 = f0, q = 1.2, shape = () => 1, pan0 = 0, pan1 = pan0, hp = false, sendRoom = 0 } = o;
    const start = Math.round(t * SR), total = Math.round(len * SR);
    let low = 0, band = 0;
    for (let i = 0; i < total; i++) {
      const p = i / total, fc = f0 * (f1 / f0) ** p, k = 2 * Math.sin(Math.PI * Math.min(.2, fc / SR / 2));
      const x = rnd();
      let high = 0;
      for (let pass = 0; pass < 2; pass++) { low += k * band; high = x - low - band / q; band += k * high; }
      const v = (hp ? high : band) * shape(p) * gain, pan = pan0 + (pan1 - pan0) * p;
      put(mix, start + i, v, pan);
      if (sendRoom) put(room, start + i, v * sendRoom, pan);
    }
  }
  // A sine whose pitch falls from f0 to f1: the body of every drum.
  function thump(t, f0, f1, fall, decay, gain, pan = 0, sendRoom = 0) {
    const start = Math.round(t * SR), total = Math.round(decay * 6 * SR);
    let ph = 0;
    for (let i = 0; i < total; i++) {
      const s = i / SR;
      ph += (f1 + (f0 - f1) * Math.exp(-s / fall)) / SR;
      const v = Math.sin(TAU * ph) * Math.exp(-s / decay) * Math.min(1, s / .001) * gain;
      put(mix, start + i, v, pan);
      if (sendRoom) put(room, start + i, v * sendRoom, pan);
    }
  }

  // ---- The kit ----
  const kick = (t, v = 1) => {
    thump(t, 150, 50, .028, .13, LEVEL.kick * v, 0, .05);
    noise(t, .012, { gain: LEVEL.kick * v * .5, f0: 3200, q: .9, shape: p => 1 - p });
  };
  const snare = (t, v = 1) => {
    thump(t, 240, 185, .02, .07, LEVEL.snare * v * .7, 0, .3);
    thump(t, 420, 330, .02, .04, LEVEL.snare * v * .3, 0, .3);
    noise(t, .22, { gain: LEVEL.snare * v * .75, f0: 4200, q: .6, shape: p => Math.exp(-p * 6), sendRoom: .45 });
  };
  const tom = (t, f, v = 1, pan = 0) => {
    thump(t, f * 1.7, f, .04, .2, LEVEL.tom * v, pan, .35);
    noise(t, .03, { gain: LEVEL.tom * v * .3, f0: 2200, q: .8, shape: p => 1 - p, pan0: pan });
  };
  const hat = (t, v = 1, open = false) => noise(t, open ? .3 : .055, { gain: LEVEL.hat * v, f0: 8500, q: .8, hp: true, shape: p => Math.exp(-p * (open ? 4 : 6)), pan0: .3 });
  // A crash: a long wash of bright noise over a cluster of tones that are not in tune with each other.
  function crash(t, v = 1, pan = -.25) {
    noise(t, 2.2, { gain: LEVEL.crash * v, f0: 6500, q: .5, hp: true, shape: p => Math.exp(-p * 5.5), pan0: pan, sendRoom: .5 });
    const start = Math.round(t * SR), total = Math.round(1.6 * SR), tones = [2051, 3217, 4129, 5387, 6841, 8123].map(f => [f, Math.abs(rnd())]);
    for (let i = 0; i < total; i++) {
      const s = i / SR;
      let x = 0;
      for (const [f, ph] of tones) x += Math.sign(Math.sin(TAU * (f * s + ph)));
      put(mix, start + i, x * Math.exp(-s / .35) * LEVEL.crash * v * .05, pan);
    }
  }

  // ---- Strings: many slightly detuned saws a note, slow bow in, darker than the guitars ----
  function strings(t, len, midi, gain) {
    const start = Math.round(t * SR), total = Math.round((len + .5) * SR);
    for (const cents of [-11, -4, 5, 12]) {
      const f = hz(midi) * 2 ** (cents / 1200), pan = cents / 14;
      let ph = Math.abs(rnd()), lp = 0;
      const k = 1 - Math.exp(-TAU * 2400 / SR);
      for (let i = 0; i < total; i++) {
        const s = i / SR;
        ph += f * (1 + .003 * Math.sin(TAU * 5.2 * s + cents)) / SR; if (ph >= 1) ph -= 1;
        lp += k * (2 * ph - 1 - lp);
        const env = Math.min(1, s / .35) * (s < len ? 1 : Math.max(0, 1 - (s - len) / .5));
        put(mix, start + i, lp * env * gain / 4, pan);
        put(room, start + i, lp * env * gain / 4 * .6, pan);
      }
    }
  }

  // ---- Piano: each note is a dozen partials, slightly sharp of the harmonics as real strings are,
  //      the high ones dying first, with the knock of the hammer at the front. `soft` is a felt
  //      piano: far fewer overtones, no knock, a slower start ----
  function piano(t, len, midi, gain = 1, pan = 0, sendRoom = .35, soft = false) {
    const f = hz(midi), start = Math.round(t * SR), total = Math.round((Math.min(len, 5) + .9) * SR), parts = [];
    for (let n = 1; n <= 12 && f * n < 9000; n++) parts.push([f * n * Math.sqrt(1 + .0004 * n * n), 1 / n ** (soft ? 2 : 1.2), 2.6 / n ** .65 * (220 / f) ** .35, Math.abs(rnd()) * TAU]);
    let knock = 0;
    for (let i = 0; i < total; i++) {
      const s = i / SR;
      let x = 0;
      for (const [pf, a, tau, ph] of parts) x += a * Math.exp(-s / tau) * (Math.sin(TAU * pf * s + ph) + .5 * Math.sin(TAU * pf * 1.0005 * s));
      knock += .25 * (rnd() - knock);
      if (!soft && s < .006) x += knock * 2 * (1 - s / .006);
      const v = x * Math.min(1, s / (soft ? .012 : .002)) * (s < len ? 1 : Math.exp(-(s - len) / .14)) * gain * LEVEL.piano * .3;
      put(mix, start + i, v, pan);
      put(room, start + i, v * sendRoom, pan);
    }
  }

  // ---- A small bell (a music box, a celesta): a few partials that are not harmonics ----
  function bell(t, midi, gain = 1, pan = 0) {
    const f = hz(midi), start = Math.round(t * SR), total = Math.round(2.2 * SR);
    for (let i = 0; i < total; i++) {
      const s = i / SR;
      let x = 0;
      for (const [ratio, a, tau] of [[1, 1, .9], [2.76, .45, .5], [5.4, .22, .28], [8.93, .1, .16]]) x += a * Math.exp(-s / tau) * Math.sin(TAU * f * ratio * s);
      const v = x * Math.min(1, s / .001) * gain * LEVEL.bell * .4;
      put(mix, start + i, v, pan);
      put(room, start + i, v * .6, pan);
      put(echo, start + i, v * .3, pan);
    }
  }

  // ---- Choir: a crowd of saws sung through the three resonances of the vowel "ah" ----
  function choir(t, len, notes, gain = 1) {
    const start = Math.round(t * SR), total = Math.round((len + .8) * SR), dry = new Float32Array(total);
    for (const m of notes) for (const cents of [-9, -3, 4, 10]) {
      const f = hz(m) * 2 ** (cents / 1200);
      let ph = Math.abs(rnd());
      for (let i = 0; i < total; i++) {
        const s = i / SR;
        ph += f * (1 + .004 * Math.sin(TAU * 4.8 * s + cents)) / SR; if (ph >= 1) ph -= 1;
        dry[i] += (2 * ph - 1) * Math.min(1, s / .5) * (s < len ? 1 : Math.max(0, 1 - (s - len) / .8));
      }
    }
    for (const [fc, q, weight] of [[650, 5, 1], [1080, 6, .55], [2650, 7, .25]]) {
      const k = 2 * Math.sin(Math.PI * fc / SR);
      let low = 0, bandv = 0;
      for (let i = 0; i < total; i++) {
        low += k * bandv;
        bandv += k * (dry[i] - low - bandv / q);
        const v = bandv / q * weight * gain * LEVEL.choir * .12;
        put(mix, start + i, v);
        put(room, start + i, v * .8, fc > 1000 ? .5 : -.5);
      }
    }
  }

  // ---- A plain sine with soft edges: the sub under the electronic beat ----
  function sub(t, len, midi, gain = 1) {
    const f = hz(midi), start = Math.round(t * SR), total = Math.round((len + .08) * SR);
    for (let i = 0; i < total; i++) {
      const s = i / SR;
      put(mix, start + i, Math.sin(TAU * f * s) * Math.min(1, s / .02) * (s < len ? 1 : Math.max(0, 1 - (s - len) / .08)) * gain * LEVEL.sub);
    }
  }

  // ---- A pad with no edge to it: near-sines that take most of a second to arrive and to leave ----
  function pad(t, len, midi, gain = 1, pan = 0) {
    const start = Math.round(t * SR), total = Math.round((len + 1) * SR);
    for (const cents of [-6, 0, 7]) {
      const f = hz(midi) * 2 ** (cents / 1200), ph = Math.abs(rnd()) * TAU;
      for (let i = 0; i < total; i++) {
        const s = i / SR, w = TAU * f * s + ph;
        const v = (Math.sin(w) + .18 * Math.sin(2 * w)) * Math.min(1, s / .8) * (s < len ? 1 : Math.max(0, 1 - (s - len))) * gain * LEVEL.pad / 3;
        put(mix, start + i, v, pan + cents / 20);
        put(room, start + i, v * .5, pan + cents / 20);
      }
    }
  }

  // ---- A blip: a very short sine, optionally falling in pitch. The interface sounds are made of these. ----
  function blip(t, midi, len = .03, gain = 1, pan = 0, fall = 0) {
    const f = hz(midi), start = Math.round(t * SR), total = Math.round(len * 6 * SR);
    let ph = 0;
    for (let i = 0; i < total; i++) {
      const s = i / SR;
      ph += f * (1 + fall * Math.exp(-s / .012)) / SR;
      const v = Math.sin(TAU * ph) * Math.exp(-s / len) * Math.min(1, s / .001) * gain * LEVEL.fx;
      put(mix, start + i, v, pan);
      put(room, start + i, v * .25, pan);
    }
  }

  // ---- Mixdown. `beat` is the length of a beat in seconds, `video` the saved MP4 to lay it under,
  //      `lufs` how loud the track is in that MP4 (-14 is the level YouTube plays everything at). ----
  function finish({ name, beat: BEAT, bars: BARS, video, lufs = -14 }) {
    // Echo on the lead: dotted eighths, crossing from side to side.
    {
      const d = Math.round(.75 * BEAT * SR), l = mono(), r = mono();
      for (let i = 0; i < N; i++) {
        l[i] = echo[0][i] + (i >= d ? r[i - d] * .35 : 0);
        r[i] = echo[1][i] + (i >= d ? l[i - d] * .35 : 0);
        if (i >= d) { mix[0][i] += r[i - d] * .5; mix[1][i] += l[i - d] * .5; }
      }
    }
    // The room the band is in.
    for (const c of [0, 1]) {
      const wet = mono();
      for (const ms of [31.3, 37.9, 43.1, 47.3, 53.9, 61.7]) {
        const d = Math.round((ms + c * 1.7) / 1000 * SR), buf = mono();
        let damp = 0;
        for (let i = 0; i < N; i++) {
          const back = i >= d ? buf[i - d] : 0;
          damp = back * .65 + damp * .35;
          buf[i] = room[c][i] + damp * .86;
          wet[i] += back * .18;
        }
      }
      for (const ms of [5, 1.7]) {
        const d = Math.round(ms / 1000 * SR), y = mono();
        for (let i = 0; i < N; i++) { const xd = i >= d ? wet[i - d] : 0, yd = i >= d ? y[i - d] : 0; y[i] = -.5 * wet[i] + xd + .5 * yd; }
        wet.set(y);
      }
      for (let i = 0; i < N; i++) mix[c][i] += wet[i] * .6;
    }
    // Fade the tail out, soften the peaks, bring the loudest one to -1 dB.
    let peak = 0;
    for (const ch of mix) for (let i = 0; i < N; i++) {
      const s = i / SR;
      ch[i] = Math.tanh(ch[i] * 1.1) * Math.min(1, Math.max(0, (LENGTH - .05 - s) / 2.2));
      peak = Math.max(peak, Math.abs(ch[i]));
    }
    const wav = Buffer.alloc(44 + N * 4);
    wav.write('RIFF', 0); wav.writeUInt32LE(36 + N * 4, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22); wav.writeUInt32LE(SR, 24); wav.writeUInt32LE(SR * 4, 28);
    wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(N * 4, 40);
    for (let i = 0; i < N; i++) for (const c of [0, 1]) wav.writeInt16LE(Math.round(mix[c][i] / peak * .89 * 32767), 44 + i * 4 + c * 2);

    mkdirSync(OUT, { recursive: true });
    const wavPath = join(OUT, `${name}.wav`);
    writeFileSync(wavPath, wav);
    console.log(`${wavPath}  ${LENGTH} s, ${(60 / BEAT).toFixed(1)} BPM, ${BARS} bars`);

    if (video && existsSync(video)) {
      const out = join(OUT, `${name}.mp4`);
      // -14 LUFS is the level YouTube plays everything at.
      const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', wavPath, '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
        '-af', `loudnorm=I=${lufs}:TP=-1.5:LRA=11`, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
      if (r.status === 0) console.log(out);
    } else if (video) {
      console.log(`No video at ${video}: only the WAV was written. Render the picture first, or fix the path.`);
    }
  }

  return { N, rnd, mono, bus, mix, room, echo, put, pluck, amp, noise, thump, kick, snare, tom, hat, crash, strings, piano, bell, choir, sub, pad, blip, finish };
}
