---
name: promo-video
description: Make or change a product or demo video with the motion-videos kit - an interface drawn in HTML and animated with CSS, or the real app recorded by a scripted scenario, rendered frame by frame to MP4 with headless Chrome and ffmpeg. Use when asked for a product video, reel, TikTok or Shorts cut, YouTube edit, tour, demo recording, a thumbnail for one, music for one, or to re-shoot a video after a UI change.
---

# Making a product video

## Project settings

Fill this table in once for the project, with the person, by editing this file. Everything below
reads from it. The defaults are right when Claude Code was started inside the kit's own folder.
For a drawn video only the brand, formats and claims rows matter; the app address and sign-in rows
are for recorded takes. No app running yet? Use the sample app: `examples/tour/record.mjs` serves
`examples/sample-app` by itself through `serve:`, with no address to set.

| Setting | Value |
|---|---|
| Kit folder (where `render.mjs` is) | `.` (this repo) |
| Where video pages live | `videos/<name>/` |
| App address for recorded takes | `http://localhost:3000` |
| How a scenario signs in | through the sign-in form, as the demo user below |
| Demo account and demo data | a made-up user and made-up customers; never a real account |
| Words that must never be readable on screen | staging and local host names, real customer names |
| Brand: colours, fonts, logo file | the tokens at the top of `lib/stage.css`; no logo file yet |
| Formats wanted | wide (16:9) and tall (9:16) |
| Where approved videos are kept | `final/`, made when the first one is approved (`out/` is scratch and ignored) |
| Claims may be checked against | the pricing page, the live product |

Before the first video, run `npm run check` in the kit folder. If something is missing, say what
and how to install it; do not work around it.

The why (what holds attention, hooks, safe zones, music under text, sources) is `docs/playbook.md`.
Read it before planning a new video. This file is the how. `ADAPT.md` is the same ground written
for the person; point them to it when they want to edit by hand.

## Tell the person how this goes

Say this once, at the start, in your own words:

- The first version will most likely not be what they expect. That is normal. The result gets
  good through their corrections, a few rounds of them.
- You look at still frames. You do not see the video move and you cannot hear music. Shaking text,
  a dull rhythm, a distracting track: only they can catch those, so they must watch and listen.
- They can watch without waiting for a render: open the video's `index.html` in Chrome. It plays,
  and a scrubber at the bottom seeks by hand; `?format=tall` and `?cut=<name>` work there. Motion
  blur and music are not in that preview, because ffmpeg adds them afterwards.
- They direct with notes, in any words: "too many pauses", "this reads as our bug", "I expected
  the chart first". When they cannot describe what they want, offer three to five directions in a
  table and let them pick. `PROMPTS.md` has prompts they can paste.

After every change, say what you changed and how to see it (the page to reload, or the file to
play). Never call a video finished: they decide that.

## Scenario first

Do not build anything until the person has agreed to a scenario. Write it as a table:

| Time | What happens on screen | Caption |
|---|---|---|
| 0.0 to 1.8 s | Cover: the headline, the product name | "Every link, in its place." |
| 1.8 to 5.5 s | A long address is pasted, Shorten is pressed, the short link appears | "Paste. Shorten." |

Give each scenario a hook for the first two seconds and a closing line. Say which parts are made
up (demo names, numbers). Expect it to come back changed, usually towards "cut the dead air".
Build after that.

## Pick the kind

| Kind | Use it for | Example in the kit |
|---|---|---|
| **Drawn**: the interface rebuilt in HTML and animated with CSS | one idea, 5 to 25 s; a story, a "before and after", one action shown clearly and larger than life | `examples/hello` (no app in it), `examples/new-order` (an app screen) |
| **Recorded**: the real app driven by a scenario | the product as it really is, several screens in a row: menus, lists, forms, settings | `examples/tour` |
| **Compilation**: other video pages shown in panels (`<iframe data-at data-from data-to>`) | a longer 16:9 overview assembled from short videos; fixing a short one fixes the overview | none in the kit; the header of `lib/stage.js` explains it |
| **Walkthrough**: drawn, many short scenes in one page | the fast "everything" video, with a wide and a tall layout in the same page | none in the kit; each scene is a `.drift` block with its own `--s` and `--d` |

When either drawn or recorded would do: drawn if the video is for a feed (it can be designed for
the frame and for portrait), recorded if the point is "this is the real thing".

A "one thing, several outcomes" story works best as a diagram: wires between boxes, dots travelling
along them with `offset-path`.

## Commands

Run from the kit folder. `<folder>` is `videos/<name>` or `examples/<name>`.

```bash
node render.mjs <folder> --frames 0,60,150              # still frames, to inspect a composition
node render.mjs <folder> --blur 2                       # 16:9 MP4
node render.mjs <folder> --format tall --blur 4         # portrait MP4
node render.mjs <folder> --cut slow                     # a second edit of the same page
node <folder>/record.mjs --dry                          # recorded kind: check every step, seconds
node <folder>/record.mjs                                # recorded kind: the take, about 10x video length
node <folder>/music.mjs                                 # the track as a WAV, and the MP4 with it underneath
```

- `--frames` takes frame numbers; at the default 30 fps, frame 60 is second 2. The files are
  `out/<name>-<format>-0060.png`.
- A sheet of them to look at in one go:
  `ffmpeg -y -pattern_type glob -i 'out/<name>-wide-0*.png' -vf "scale=960:-1,tile=2x3" -frames:v 1 out/sheet.png`
- Formats: `wide` 1920x1080, `tall` 1080x1920, `feed` 1080x1350, or `all`. A page only looks right
  in a format it has a layout for. List them in `<html data-formats="wide tall">`: the renderer
  refuses any other. Add a format to the list only after writing its `[data-format="..."]` rules
  and looking at its frames.
- Also: `--fps 30`, `--scale 2` (twice the pixels), `--chrome /path`, and `--jobs 2` (experimental,
  at most 3).
- An MP4 comes with `out/<name>[-<cut>]-<format>.jpg`, frame 0.

## A drawn video page

Copy the nearest existing page. The shape is always:

- `<html data-duration="14000">`, `lib/stage.css`, one `.stage`, `lib/stage.js` last.
- Start times as CSS variables at the top of `<style>`; all words in the HTML, marked `COPY`.
- Motion is CSS animations whose delays are offsets from the start of the video. `stage.js` seeks
  them per frame, so nothing may be driven by a timer or by `requestAnimationFrame`.
- Portrait: everything that matters inside x 120 to 888, y 288 to 1248. The lower third is under
  the platforms' own buttons.
- A tall layout is a block of `[data-format="tall"]` overrides in the same page. Positions set
  inline need `!important` there; an SVG wire can be redrawn with CSS `d: path()`.
- To loop, the last frame must equal the first: long keyframes in % of the duration bring the
  opening state back.

Techniques proven with this renderer: counters with an integer `@property` and `counter()`; a chart
line with `stroke-dashoffset` on a `pathLength="1"` line; typing with `width` and `steps()`; a
cursor that glides, a ring on the click; rows that arrive one after another; dots on wires with
`offset-path`; a slow zoom on a scene with `.drift`.

## Drawing your app's screen

Start from `examples/new-order`: it rebuilds one screen of the sample app and animates an order
being added. The steps, and what bites:

- **Use the product's own stylesheet**, linked after `lib/stage.css`, and copy the screen's HTML.
  The drawn interface then matches the real one.
- **Its CSS was written for a whole page; undo that.** Rules on `body`, `header`, `main` apply to
  the video page too: override `body`, and put the screen in one wrapper. `position: fixed`
  (dialogs, toasts) escapes the drawn window: make it `absolute`.
- **Colour names collide.** If the product also defines `--bg`, `--ink`, `--accent` on `:root`, the
  last stylesheet wins and recolours the stage. Decide which, and say so in a comment.
- **Transitions cannot be seeked. Only CSS animations can.** Anything the app does with
  `transition` (a dialog opening, a toast) has to be rewritten as a `@keyframes` animation with a
  delay, and the transition switched off (`transition: none`).
- **The app's own entrance animations run at frame 0** and leave the cover half faded in. Switch
  them off (`animation: none`).
- **Put it in a window**: `.browser`, `.browser-bar`, `.browser-view` in `lib/stage.css`.
- **Make it big enough to read.** Build the screen at the app's own size and enlarge the wrapper
  (`zoom: 1.5`); 15 px text in a 1920 px frame is unreadable on a phone.
- **Typing in a normal font**: one element per letter, each appearing at its own delay. The
  `width` and `steps()` trick only works in a monospace font.
- **A row arriving in a table**: animate the cells from no padding, no line height, no font size.
- **Two cursor moves**: one wrapper element per move, because two transforms on one element do not
  add up.
- **Keep text inside the safe margins**: `--safe-top`, `--safe-bottom`, `--safe-side` (and
  `--safe-right` in portrait) are set on `.stage` per format.
- **Portrait is a different design, not a smaller one.** A wide app screen scaled into the 768 px
  safe column has unreadable text. Crop to the part that matters (the dialog, the list) and stack.
  If the video is mainly for feeds, design the tall layout first. `examples/new-order` has one:
  no sidebar, four columns in place of six, and the cursor's trips measured again.

## Frame 0 is the cover

Platforms show the first frame, or ask for a thumbnail. So frame 0 must be a finished picture: the
headline readable, the product recognisable, nothing half-faded-in. Start the first scene already
on screen and let it move from there, not fade in from an empty page. An opening title must have
no entrance animation: at frame 0 it would be invisible. In `examples/hello` the cover is a layer
that is complete at frame 0 and lifts away after half a second.

`render.mjs` writes frame 0 as a JPG next to every MP4. Upload that as the thumbnail. Check it at
the size of a phone thumbnail: if the headline cannot be read there, it is too small.

## A second edit of the same page (cuts)

A feed wants pace; someone who chose to watch wants time to read. Do not copy the page: add a cut.
`--cut slow` (and `?cut=slow` in the browser) puts `data-cut="slow"` on `<html>`, and the page's
CSS changes only timing and which scenes play. `examples/hello` has one:

```css
[data-cut="slow"] .stage { --type: .8s; --stats: 3.4s; --chart: 5.4s; --tip: 8.2s; --close: 11.2s; }
[data-cut="slow"][data-format="tall"] .extra { display: none; }   /* a cut may also drop a scene */
```

with `<html data-duration="9000" data-duration-slow="13000">`. The cut's length is
`data-duration-<cut>-<format>`, else `data-duration-<cut>`. The name is yours (`slow`, `yt`, `ad`).

For this to work, start times must be CSS variables set in the stylesheet, not inline `style`
attributes: a rule cannot override an inline value. A track written for one cut does not fit
another; the times at the top of `music.mjs` change with the cut.

## A recorded video

`lib/recorder.mjs` runs the page in slow motion (animations at 1/10 speed, timers stretched 10
times), takes one frame per tick and writes `timeline.js` (cursor, clicks, camera, captions). The
video page plays it with `lib/clip.js`. The cursor, click rings, camera and captions are drawn at
render time, so they can change without a new take.

Scenario steps (`at` is where on the target, as fractions of its width and height, `[.5, .5]` by
default):

| Step | What it does |
|---|---|
| `t.click(target, at)`, `t.moveTo(target, at, seconds)` | move the cursor there, and click |
| `t.type(text, perKey)`, `t.press(key)`, `t.clear()` | type into the focused field; one key; empty the field |
| `t.paste(target, text)`, `t.select(target, option)`, `t.colour(target, hex)` | set a field, a dropdown, a colour input |
| `t.check(target)`, `t.drag(target, from, to, seconds)` | a checkbox or switch; a slider, from and to as fractions of its width |
| `t.scrollTo(target, at, seconds)` | scroll until the target sits at that fraction of the window height |
| `t.hold(seconds)`, `t.waitFor(target)`, `t.until(fn)` | wait: for a time, for an element, for a condition in the page |
| `t.goto(path)` | a full page load |
| `t.cam(target, zoom, seconds, at)`, `t.cam(null)` | point the camera at the target; back to the whole page |
| `t.say(caption, seconds)`, `t.mark(label)` | a caption; a label printed with its frame number, for you |

Targets are a CSS selector, `{ text, in }` or `{ label }` (the field a label names). The options of
`record()` are listed at the top of `lib/recorder.mjs`. When a step fails,
`out/<name>-failed.png` shows the page.

- Sign in inside `login`, which is not filmed. Record as the demo account from Project settings.
- The scenario deletes what it creates in `cleanup`, so a take can be repeated.
- Click a field before typing into it, as a person would; do not rely on autofocus.
- Pick the window size (`width`, `height`) so the interface fills the frame: 1280x720 reads better
  in a 1920x1080 video than 1600x900.
- A take is not evidence of speed: the network is not slowed, so loading looks instant.
- Record a local or staging copy, not production. A scenario clicks and types for real: on a live
  site it creates real records and real traffic. If the person insists on a live site, it must be
  their own, the scenario must not submit anything that creates data, and their analytics endpoint
  goes in `block` so the take is not counted as a visit.

## Music and sound

`lib/band.mjs` makes music and effects in code: no samples, nothing to license, nothing a platform
can claim. A track is a script next to the video (`examples/hello/music.mjs`).

These videos are read, not listened to, so **the music must not distract**. That is the standing
rule (`docs/playbook.md`, section 6):

- No tune. One soft chord a bar, a pad under it. A melody someone can follow pulls the eye off
  the captions.
- Slow: 65 to 90 BPM. No snare, no fills.
- Quiet: join the track at about -19 LUFS (`finish({ lufs: -19 })`). If the music can be followed,
  it is too loud.
- Thinner while a scene has a lot to read: drop the tick and the answering note there.
- A small swell under the cover and one wide chord under the closing card.
- Tie the tempo to the picture: choose the number of bars so the last one ends where the closing
  card starts.
- Use the felt piano (`piano(..., soft = true)`), the pad and the bell. Never a distorted guitar:
  it is the weakest thing the string model does and it sounds artificial. Clean or muted, the same
  string is fine.

Then **one short sound for each thing that happens on screen**, by the second: air across a scene
change (`noise`), a tick per typed key and a pop when something appears (`blip`), a small bell when
something is saved (`bell`). Each lasts 30 to 150 ms, a chime up to half a second, and all of them
use notes from the scale the track is in. They direct the eye, so they sit above the music.

A track with drums and a lead (a song) is possible with the same library, and right for a video
with little text. Offer the quiet one first.

**How to run a music request**

1. Say the limit up front: this is music composed in code, not a music model. It gives a clean,
   simple bed that makes the video feel finished, not a track someone would play on its own.
2. Offer variants as a table and let the person pick, because music is hard to ask for in words:

   | # | Name | What carries it | Feel | Best for | Risk |
   |---|---|---|---|---|---|
   | 1 | Felt piano | One soft piano chord a bar, a quiet low pulse | Calm, sure of itself | Longer cuts people chose to watch | Can feel slow under a fast cut |
   | 2 | Warm pad and heartbeat | Held chords with no attack, a soft kick | The most invisible | Text-heavy videos | May feel like nothing is there |
   | 3 | Mallet pulse | One marimba note repeating in eighths, a pad | Friendly, light | Fast cuts, Shorts | Closest to "app advert" |
   | 4 | Muted pluck | One muted clean string ticking, a bass note a bar | Warm, human, gives momentum | Fast cuts | The tick can get noticeable over 40 s |
   | 5 | Sound design only | A low held tone; the interface sounds are the track | Content first | Feeds watched muted | Empty if the sounds are weak |

   All five share the rules above; they differ only in colour. Only the felt piano exists as code
   (`examples/hello/music.mjs`). The others have to be written from the instruments in
   `lib/band.mjs` (`pad`, `thump`, `bell`, `blip`, `noise`; there is no marimba, a mallet is a
   short `bell`), so say that they will take more rounds.
3. Build the pick as a music-only WAV first: call `finish({ name, beat, bars })` with no `video`.
   The person judges by ear before it goes under a video.
4. Then add `video:` (the rendered MP4) to that call: the picture is copied, not rendered again,
   so a new track takes seconds. `name` is what the files in `out/` are called; change it and the
   times at the top when the script is copied from the example. For a second file (the portrait
   video), change `name` and `video` and run again.
5. To change it, edit numbers and run the script again (about ten seconds): `LEVEL` for loudness
   per instrument, `CHORDS` for the harmony, `BARS` for the tempo, the "Sounds on the picture"
   lines for the effects. Notes are MIDI numbers: 60 is middle C, 12 steps an octave. What each
   instrument takes is in the comments of `lib/band.mjs`.

You cannot hear it. Say so; report what can be measured (`ffmpeg -af volumedetect`, no silent
gaps, the length). The person listens to the WAV first, then watches it with the picture, and
directs by ear. `LEVEL` at the top of the script is the first thing to change. The video must still
work muted: most feed videos are watched without sound.

## Traps (each one cost a render)

- **Text shakes during a slow zoom.** Chrome redraws text at every new size and snaps the glyphs to
  whole pixels. Put `will-change: transform` on the element that scales (`.drift` has it) so the
  scene is drawn once and the picture is scaled. Re-render after adding it; the old MP4 keeps the
  shake.
- An `animation:` shorthand resets fill-mode; `stage.css` forces `both`, but NOT on pseudo-elements:
  spell `both` out for `::after`.
- Several animations of the same property on one element do not stack, the last listed wins. Use a
  wrapper per animation, or one long keyframes block.
- A `var()` that is undefined inside an `animation:` shorthand voids the whole declaration.
- A more specific selector's `animation:` shorthand wipes an `animation-name` set by a weaker one.
- The first screenshot of a page rasters large images differently; the renderer throws one away.
- Chrome's virtual time hangs with a real app; slow motion is the way.
- Render one video at a time. `--jobs` (parallel pieces) is experimental: five pieces on a recorded
  video ran an 8 GB machine out of memory. Do not render while a take is recording either: the
  take is paced by the clock and a busy machine spoils it.
- Never `pkill -f render.mjs` from the shell that runs it: the pattern matches the shell's own
  command line. Write it as `render.mj[s]`.
- A native `<select>` list and the colour picker are not part of the page and cannot be filmed; the
  value just changes. A copy-to-clipboard button can fail in a headless browser and make the app
  show an error: point at it, do not click it.
- A flex item next to long text gets squashed (a round avatar turns oval). Fix the app's CSS, not
  the video.
- A drawn phone or laptop must have real proportions and sit inside the frame.
- A dark caption chip disappears over a dark interface (dark mode). `.clip-caption` has a pale
  ring for that; keep it if you restyle the chip.

## Rules for what is on screen

- **No forbidden words, ever**: local and staging hosts, real customer names. The recorder fails a
  take on `localhost` and `127.0.0.1` already; add the project's own list in `forbid`. In drawn
  pages use `example.com` for anybody else's address.
- **A failure must not read as the product's bug.** A "before" scene that shows an error has to say
  who or what caused it, and put it on the other side (their page, their address).
- **Claims:** only what the product does today. Check limits and prices against the source named in
  Project settings. Reuse the live site's own headlines where one fits.
- **People and data:** made-up names and numbers only.
- **One idea per short video.** Motion and readable text in the first two seconds.
- Captions of a few words. Only the closing card stands still.

## Review, then save

1. Render still frames, tile them with ffmpeg, and look at them. Fix, repeat. A frame taken in the
   middle of a fade looks washed out; that is not a contrast fault, pick a frame after it.
2. Render the MP4, pull a few frames out of the finished file, look again.
3. Report what happens second by second and what is made up. Give the page to open in the
   browser and the MP4 to play. The browser shows timing, layout and motion; only the MP4 has
   motion blur and sound.
4. When they say save: copy the MP4 and its cover JPG to the folder for approved videos and note
   the render command next to it.
