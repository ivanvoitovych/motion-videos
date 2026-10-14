# How to adjust everything

Each section has two ways: a prompt to paste into Claude Code, and where to edit by hand. Start
Claude Code in this folder so the skill is loaded.

- [Before you start: you are the director](#before-you-start-you-are-the-director)
- [Set it up for your product](#set-it-up-for-your-product)
- [A drawn video](#a-drawn-video)
- [A recorded video of your app](#a-recorded-video-of-your-app)
- [Music and sounds](#music-and-sounds)
- [Shapes, cuts and the thumbnail](#shapes-cuts-and-the-thumbnail)
- [What it cannot do](#what-it-cannot-do)

## Before you start: you are the director

The first version will most likely not be what you expect. Plan for several rounds:

1. **Agree on the scenario first.** A table of time, action and caption costs nothing to change.
2. **Preview in the browser.** Open the video's `index.html` in Chrome: it plays, and a scrubber at
   the bottom seeks by hand. Add `?format=tall` or `?cut=yt`. No render needed. You will not see
   motion blur or hear music there; those are added by ffmpeg afterwards. Everything else is the same.
3. **Give notes.** "Too many pauses, cut the dead air." "I cannot read that on a phone." "This
   scene reads as our bug." "The phone is stretched." Say what you see and what you expected.
4. **Ask for options when you cannot describe it.** "Give me five directions in a table" works
   well for music, openings and layouts.
5. **Render the MP4 when the preview is right**, watch that too, and correct again.

Claude Code looks at still frames, not at the moving video, and it cannot hear. Shaking text, a
dull rhythm, music that distracts: only you can catch those.

## Set it up for your product

**Prompt**

```
Use the promo-video skill. My app runs at <address>. Look at it and fill in the Project
settings table in the skill. Ask me only for what you cannot find out yourself.
```

**By hand.** Open `.claude/skills/promo-video/SKILL.md`. The table at the top is the only part you
edit:

| Setting | What to put |
|---|---|
| App address | your local or staging address, for recorded takes |
| How a scenario signs in | the sign-in form, a cookie, or a token in localStorage |
| Demo account and data | a made-up user; never your own account or a customer's |
| Forbidden words | staging hosts, internal names, real customers. A take fails if one is readable |
| Brand | your colours and fonts; they go in `lib/stage.css` |
| Formats | wide for YouTube and your site, tall for Reels, TikTok and Shorts |
| Claims | where a price or a limit can be checked |

Your brand, in `lib/stage.css`:

```css
:root {
  --accent: #2F6FED;      /* links, the chart line, click rings */
  --ink: #14181F;         /* text */
  --bg: #F3F5F9;          /* the page behind everything */
  --font-head: 'Your Font', system-ui, sans-serif;
}
@font-face { font-family: 'Your Font'; font-weight: 700; src: url('../fonts/your-font-700.woff2') format('woff2'); }
```

Fonts load by relative path, because pages are opened from disk with no server.

## A drawn video

The interface is rebuilt in HTML and animated with CSS. `examples/hello` is the smallest one.
`examples/new-order` draws a real app screen from the app's own stylesheet: start from that one
when the video shows your product. Its comments say what had to be undone from the app's CSS.

**Prompts**

```
You are the director and the one who has to sell this. Pitch me three scenarios for
<feature>, one idea each: the hook for the first two seconds, a shot list as a table (time,
action on screen, caption), and the closing line. Nothing gets built until I pick one.
```

```
Going with scenario 2. Build it in videos/<name>/. Show me still frames first, then tell me
which file to open in the browser to screen it.
```

```
Notes on the cut: too many pauses, cut the dead air. Scene two drags. The headline cannot be
read on a phone. Fix those three and show me frames.
```

**By hand.** Copy `examples/hello` to `videos/<name>` and open its `index.html`:

| To change | Edit |
|---|---|
| The words | the block marked `COPY` |
| When things happen | the start times at the top of `<style>`: `--stats: 2.3s;` and so on |
| The length | `data-duration` on `<html>`, in milliseconds |
| The numbers in the chart | the `values` list in the `<script>` |

Save, reload the page in the browser, watch. When it is right:

```bash
node render.mjs videos/<name> --frames 0,60,150    # still frames by number: 30 a second, so 0 s, 2 s, 5 s
node render.mjs videos/<name> --blur 2             # the MP4
```

One rule to keep: every bit of motion is a CSS animation whose delay is counted from the start of
the video. Nothing may run on a timer, and a CSS `transition` does not count: the renderer can only
seek animations.

## A recorded video of your app

A script clicks, types and scrolls in your real app. `examples/tour` is the model. Point it at a
local or staging copy, not at production: the script really clicks and really submits.

**Prompts**

```
New shot: the real product, no mock-up. Film <flow> in my app with a script, in
videos/<name>/record.mjs. Demo account only. Run it dry until every step finds its target,
show me the step list, then take it. Clean up after the take so we can shoot it again.
```

```
The UI changed. Run the take for videos/<name> again, fix whatever no longer finds its
target, and tell me what moved.
```

**By hand.** Copy `examples/tour` to `videos/<name>`. In `record.mjs`, change the name in
`record('tour', ...)`, put `base` in place of `serve`, set `start`, write your own `login`, add a
`setup` that resets the demo data to a known state, and a `cleanup` that deletes what the take
creates (the example needs neither: its app keeps nothing between page loads).

```js
await record('<name>', {
  base: 'http://localhost:3000',
  start: '/settings',
  forbid: ['staging.example.com'],            // a take fails if this is readable on screen
  async login(page, base) {                   // not filmed
    await page.goto(base + '/login');
    await page.type('#email', 'demo@example.com');
    await page.type('#password', 'demo-password');
    await Promise.all([page.waitForNavigation(), page.click('button[type=submit]')]);
  },
  async setup(page) {                         // before the take, not filmed: same data every time
    await page.evaluate(() => fetch('/api/demo/reset', { method: 'POST' }));
  },
  async cleanup(page) {                       // after the take, still signed in
    await page.evaluate(() => fetch('/api/demo/reset', { method: 'POST' }));
  },
}, async t => {
  t.say('Every setting in one place', 3);     // a caption, for 3 seconds
  await t.click({ text: 'Notifications', in: 'nav a' });
  await t.hold(1.5);
});
```

In `index.html` next to it, replace `tour-take` with `<name>-take` (it appears twice).

The steps you can use:

| Step | What it does |
|---|---|
| `t.click(target)` | Moves the cursor there and clicks |
| `t.type('text', .06)` | Types into the focused field, one key every 0.06 s |
| `t.paste(target, 'text')` | Puts text in a field at once |
| `t.select(target, 'Option')` | Chooses an option of a dropdown |
| `t.check(target)` | Ticks a checkbox or flips a switch |
| `t.drag(target, .1, .6)` | Drags across a slider, from 10% to 60% of its width |
| `t.scrollTo(target)` | Scrolls until the target is in view |
| `t.hold(1.5)` | Waits, so the viewer can read |
| `t.until(() => ...)` | Waits until the page says so |
| `t.cam(target, 1.4)` | Zooms the camera onto the target; `t.cam(null)` goes back |
| `t.say('caption', 3)` | Shows a caption for 3 seconds |

A target is a CSS selector, `{ text: 'Save', in: 'button' }`, or `{ label: 'Email' }` for the field
a label names. The full list, with every argument, is in the skill and at the top of
`lib/recorder.mjs`.

```bash
node videos/<name>/record.mjs --dry      # seconds: does every step find its target?
node videos/<name>/record.mjs            # the take, about 10 times the length of the video
node render.mjs videos/<name> --blur 2
```

Why `setup` matters: with fixed names, dates and record counts, two takes of the same scenario
differ only where the UI changed. A second run never shows yesterday's demo records, and a moved
button is easy to spot.

If a step fails, `out/<name>-failed.png` shows what the page looked like. After a take, the
video's `index.html` plays it in the browser too, with the cursor, camera and captions.

The cursor, click rings and caption chip are drawn at render time, so restyling them
(`lib/stage.css`, `lib/clip.js`) needs only a new render. Changing a caption's words or what the
script does needs a new take.

## Music and sounds

Music is written as a script, from oscillators and noise. No samples, so nothing to license.

**Prompts**

```
Score videos/<name>. The music serves the reading: it must not ask for attention. Give me
five directions in a table (what carries it, the feel, where it fits, the risk). Build the
one I pick as audio only. I listen before it goes under the picture.
```

```
Notes on the track: piano down, lose the pulse, and a soft click when Save is pressed at
4.2 s. Same picture, new audio.
```

Music is where the first version is least likely to be right, because Claude Code cannot hear it.
Here the first two tracks were songs, and the note that fixed it was "the music serves the
reading". Listen, and say what bothers you.

**By hand.** Copy `examples/hello/music.mjs` next to your video:

| You want | Where in the script | How |
|---|---|---|
| Louder or quieter instruments | `LEVEL` | One number per instrument. `0` removes it |
| Different harmony | `CHORDS` | One entry a bar: a bass note and the chord's notes |
| Faster or slower | `BARS` | Fewer bars before the closing card means a slower tempo |
| Sounds on the picture | the last block | One line per sound. Delete a line to remove it |
| The times and the length | the constants at the top | Copy them from the start times in your page's CSS |
| What the output is called | `name:` in the last line | Change it, or it overwrites `out/hello-music` |
| The file it goes under | `video:` in the last line | The MP4 you rendered. Leave `video` out to get the WAV alone |
| The same track under the portrait video | `name:` and `video:` | Change both and run again |

Notes are MIDI numbers: 60 is middle C, each step a semitone, 12 steps an octave. The example is
in F major, where the notes that fit are F, G, A, B flat, C, D, E (65, 67, 69, 70, 72, 74, 76, and
the same plus or minus 12).

```bash
node videos/<name>/music.mjs     # about ten seconds; the picture is not rendered again
```

Listen to the WAV first, then watch the MP4. The rules that kept the music out of the way are in
`docs/playbook.md`, section 6.

## Shapes, cuts and the thumbnail

```bash
node render.mjs videos/<name>                        # 16:9, 1920x1080
node render.mjs videos/<name> --format tall --blur 4 # 9:16, 1080x1920
node render.mjs videos/<name> --format feed          # 4:5, 1080x1350
node render.mjs videos/<name> --cut slow             # a second edit of the same page
node render.mjs videos/<name> --format all           # all three shapes, one after another
```

- **A portrait layout** is a block of `[data-format="tall"]` rules in the same page. Keep what
  matters inside x 120 to 888 and y 288 to 1248; the rest is under the platform's own buttons.
  List the shapes a page supports in `<html data-formats="wide tall">`; the renderer refuses the
  rest. A wide app screen does not shrink into that column: crop to the part that matters, as
  `examples/new-order` does.
- **A cut** changes timing and which scenes play, in CSS. `examples/hello` has one called `slow`:
  `[data-cut="slow"] .stage { --type: .8s; --stats: 3.4s; ... }`, with its length in
  `data-duration-slow` on `<html>`. Try `?cut=slow` in the browser. The name is yours.
- **The thumbnail** is frame 0, written as a JPG next to every MP4. So make frame 0 a finished
  picture: an opening title that fades in gives a blank thumbnail.
- **`--blur 4`** is motion blur: four moments per frame, averaged by ffmpeg. It takes four times
  as long and is not visible in the browser preview.

**Prompt**

```
The feed cut is too fast for someone who chose to watch. Add a second edit of
videos/<name> called yt: every scene held long enough to read, about 40 seconds. Do not
fork the page. Render it and give me the thumbnail.
```

## What it cannot do

- The browser's own dropdown list and colour picker cannot be filmed; the value just changes.
- Loading times in a take are not real: the page runs in slow motion, the network does not.
- Rendering is slow: see the numbers in the README. One video at a time on a small machine.
- The music is modelled in code. Keep it quiet and simple; it will not sound like a studio track.
