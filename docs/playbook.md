# Video playbook

What makes a product video hold attention, written after the first videos made with this kit came
out as a slideshow. The research was a web pass over short-form retention advice,
SaaS launch-video write-ups and motion-design principles. Sources are at the bottom.

A caution on the numbers: most of the retention figures below come from marketing blogs and tool
vendors, not from platform documentation or studies. Treat them as direction. Your own numbers per
video are the only ones that count.

## 1. What was wrong with the first cuts

- **Nothing happens.** A screenshot slides in, zooms, fades. The viewer never sees a cause and an
  effect: no key pressed, no result appearing, no number changing.
- **Four ideas in one video.** Every source says one idea and one payoff per short video.
- **The hook is a slogan.** A brand line is not a hook. A hook names a pain, asks a specific
  question, or shows the result first.
- **Silent.** No music, no interface sounds.
- **Content under the platform's buttons.** See section 4.
- **A failure with no cause.** A "before" scene ended on an error page, and it read as the product
  being broken. Say who caused it and show it on their side.

## 2. What makes a product video feel alive

The product is the main character and it has to act. In order of payoff:

1. **Animate the interface, not a picture of it.** Rebuild the few UI moments a scene needs as real
   HTML (the product's own CSS and fonts are right there) and let things happen inside it: text
   typed into a field, a button pressed, a new row sliding into the list, a counter running up, a
   chart line drawing itself, bars growing one after another.
2. **A cursor with intent.** Larger than life, moving on an eased curve, settling before a click,
   a ring pulse on the click. This is most of what makes Screen Studio recordings look polished.
3. **The camera follows the action.** Zoom to where the click lands, hold, pull back. A zoom with
   no action under it is the "floating image" look.
4. **Easing, overshoot, stagger.** Things entering ease out, things leaving ease in. A small
   overshoot-and-settle on anything that pops. Lists arrive staggered by 5 to 10 frames, never all
   at once. Children finish moving slightly after their parent.
5. **Motion blur on fast moves.** Cheap here: `--blur 4` renders 4 moments per frame and averages them.
6. **Type that moves with meaning.** Words arrive in reading order, the key word gets the colour.
   One line on screen at a time, large enough for a phone.
7. **Sound.** A music bed, cuts on the beat, a soft click and whoosh on the actions. Product videos
   without interface sound read as slideshows. (Most Reels are watched muted, so the video must
   still work silent; sound is the layer on top.)
8. **Rhythm.** Something changes every 3 to 5 seconds at the latest, and nothing sits unchanged for
   more than 8 to 12 seconds. A pause after a reveal is part of the rhythm.

Timing values to start from (30 fps): 2 frames is the least the eye registers, 0.3 s is the
shortest readable beat, 0.5 s is a comfortable UI action, 1 to 2 s a scene transition, 3 to 5 s a
scene that carries information.

## 3. What makes people stay, save and rewatch

- **First 2 seconds:** motion and a readable text overlay together. Static openings lose.
- **Hook types that work with no person on camera:** proof first (show the result, then how),
  a specific question about a pain, a bold statement. Pattern interrupts only if they belong to
  the story.
- **Open a loop early and close it last.** Ask or show something in the first 3 seconds that is
  only resolved at the end.
- **One idea per video.**
- **Under 20 seconds for Reels and TikTok.** Completion rate is what the platforms reward.
- **Loop it.** End on a frame that cuts cleanly back to the first one, so a replay is seamless.
- **Saves come from usefulness.** People save tutorials, checklists and "how to do X in 30
  seconds", not adverts. Shares and sends are weighted above likes.
- **Longer formats:** 15 to 30 s for a teaser, 45 to 90 s for an explainer, with the difference
  from competitors stated early. Structure: hook, reveal, one capability in depth, proof and a
  next step.

"Convince them to buy" is not a job for one video. The short ones earn the stop and the save; a
longer tour and the landing page do the convincing. The same page can serve both: a fast edit for
feeds and a slower cut for people who chose to watch (`--cut`, see the skill).

## 4. Safe zones for portrait video

For 1080x1920, keep text and anything important inside:

| Platform | Top | Bottom | Sides |
|---|---|---|---|
| Instagram Reels | 269 px | 672 px | 65 px |
| TikTok | 240 px | 660 px | 120 px, and 300 px on the right from y=840 down |
| Safe on both | 288 px | 672 px (content ends at y=1248) | x from 120 to 888; left of 780 below y=840 |

`lib/stage.css` uses these figures for `tall`. They are from third-party guides and have not been
confirmed with a test upload of our own: upload one video privately and look before trusting them.

## 5. What the renderer does for each need

| Need | How |
|---|---|
| Typing | `width` with `steps()` |
| Counters | an integer `@property` animated, shown through `counter()` |
| Chart line drawing | `stroke-dashoffset` on an SVG line with `pathLength="1"` |
| Cursor, click pulse, stagger, overshoot | keyframes and per-item delays |
| Dots travelling along wires | `offset-path` with an animated `offset-distance` |
| Slow zoom on a scene, text steady | `.drift` in `lib/stage.css` (`will-change: transform`) |
| Motion blur | `--blur 4`: four moments per frame, averaged by ffmpeg (`tmix`), about 4x render time |
| The real interface | a scripted take (`lib/recorder.mjs`), played back by `lib/clip.js` |
| A faster and a slower edit of one page | `--cut` and `html[data-cut]` |
| Thumbnail | frame 0, written as a JPG next to every MP4 |
| Music and interface sounds | `lib/band.mjs`: made in code, joined to the MP4 by ffmpeg |
| Scenes that CSS cannot drive | `window.__onSeek(ms)`, called by `lib/stage.js` for every frame |

## 6. Music under text

These videos are read, not listened to: the captions do the work a voice does elsewhere. Reading on
music and attention, again direction and not law (the studies measure people reading passages, not
captions in a video):

- **Instrumental costs little, words cost a lot.** A 2018 meta-analysis found a small harm to
  reading from background music, concentrated in music with lyrics; instrumental was near zero.
- **Fast and loud together is what hurts.** Slow or quiet instrumental music did not push
  comprehension below the no-music baseline; fast and loud did.
- **A tune you can follow pulls attention.** Background music has to survive being ignored. No
  melodic peak on top of dense text.
- **Steady energy:** a swell in the first 3 seconds, a subtle loop under the scenes, a swell at the
  call to action.
- **If you can follow the music, it is too loud.**
- **Interface sounds:** clicks and taps of 30 to 150 ms, chimes up to about 500 ms, all from one
  tonal family, barely noticed.

What the kit does with it (`examples/hello/music.mjs`): no tune, 65 to 90 BPM, no snare or fills,
the track at about -19 LUFS, thinner while a scene has a lot to read, and one short sound per
action on screen.

What changed when the rules were applied to a track that had been written as a song:

| | As a song | Under text |
|---|---|---|
| Tempo | 103 to 120 BPM | 65 to 90 BPM, by fitting fewer bars into the same video |
| Melody | A lead line | None. Chords and a pulse only |
| Loudness | About -13 LUFS | About -19 LUFS, with the interface sounds on top |
| Drums | Backbeat, fills, rolls | A soft pulse; no snare, no fills |
| Shape | Builds through the video | A swell at the cover, flat under the scenes, a swell at the closing card |
| Busy moments | Densest in the middle | Thinner where a scene has the most text |

Sources for this section: https://www.brain.fm/blog/music-for-reading-comprehension ,
https://sites.utm.utoronto.ca/sites/sites.utm.utoronto.ca.glenn_website/files/download/ThompsonEtAl2012.pdf ,
https://sonilo.com/blog/guides/how-to-make-a-melody-video-background-music ,
https://vidpros.com/fix-background-music-too-loud-video/ ,
https://violetrecording.com/how-to-design-ui-sounds/ ,
https://sounddesign.irpr.agency/applications/product-videos/

## Sources

- Hooks and retention: https://www.opus.pro/blog/tiktok-hook-formulas ,
  https://nestscale.com/blog/increase-tiktok-hook-rate.html ,
  https://postiz.com/blog/why-your-reels-arent-going-viral-hook-framework ,
  https://skills.sh/iart-ai/tiktok-video-skills/short-form-video
- Saves and shares: https://postigniter.com/blog/advanced-instagram-reels-optimization-for-reach-retention-and-saves-in-2026 ,
  https://heropost.io/instagram-reels-for-business-2026/
- Safe zones: https://www.hopperhq.com/blog/instagram-reel-size/ ,
  https://www.upload-post.com/tools/safe-zone-checker/
- SaaS video structure and length: https://www.atomikgrowth.com/blog/best-saas-product-launch-videos-of-2026-with-actionable-tips-real-examples ,
  https://www.moonb.io/blog/saas-product-demo-video , https://supademo.com/blog/demo-video-examples
- Motion principles and timing: https://mintlify.com/raphaelsalaja/userinterface-wiki/animation/12-principles-of-animation ,
  https://github.com/dylantarre/animation-principles ,
  https://claudeskills.info/skills/ncklrs/startup-os-skills/motion-designer/
- Cursor, zoom, motion blur: https://screen.studio/ , https://daveswift.com/screen-studio/
- Interface animation instead of recordings: https://hera.video/use-cases/ui-animation-videos
- Sound: https://sounddesign.irpr.agency/applications/demo-videos/
- Coded-video skills: https://github.com/remotion-dev/skills ,
  https://www.tella.com/blog/how-to-use-remotion-agent-skills-with-claude-code
