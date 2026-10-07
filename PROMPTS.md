# Prompts

Ready to paste into Claude Code, started in this folder. Replace what is in `<angle brackets>`.

## Plan

**Pitch scenarios**

```
Use the promo-video skill. You are the director and the one who has to sell this. Pitch me
three scenarios for <product or feature>. One idea per video. For each: the hook for the
first two seconds, a shot list as a table (time, action on screen, caption), and the closing
line. Mark everything that is made up. Nothing gets built until I pick one.
```

**Set the deliverables**

```
Deliverables: 16:9 for YouTube, 9:16 for Reels, TikTok and Shorts. One source page, one
layout per shape. Portrait is its own design, not the wide one squeezed.
```

**Set the opening**

```
The first three seconds decide whether anyone stays. Open on motion and on a line people
can read. No slow fade, no logo intro. Frame zero must work as the thumbnail.
```

## Build

**A drawn video**

```
Going with scenario <n>. Build it in videos/<name>/. Show me still frames first, then tell
me which file to open in the browser to screen it.
```

**The real app**

```
New shot: the real product, no mock-up. Film <flow> in my app with a script, in
videos/<name>/record.mjs. Demo account only. Run it dry until every step finds its target,
show me the step list, then take it. Clean up after the take so we can shoot it again.
```

**After a UI change**

```
The UI changed. Run the take for videos/<name> again, fix whatever no longer finds its
target, and tell me what moved.
```

**A slower edit for YouTube**

```
The feed cut is too fast for someone who chose to watch. Add a second edit of videos/<name>
called yt: every scene held long enough to read. Do not fork the page. Render it and give
me the thumbnail.
```

## Notes after a screening

**It looks like a slideshow**

```
This is a slideshow. Images drift, nothing happens. Research what makes short product videos
hold attention, write the findings down with sources, then recut to those rules. I want the
interface to act: typing, clicks, numbers moving, a chart drawing itself.
```

**Too slow**

```
Too many pauses. Cut the dead air. Scenes overlap, captions are three or four words, and
only the closing card stands still.
```

**A failure that reads as your bug**

```
This scene reads as our bug. The viewer cannot tell why it failed. Name the cause on screen
and put the failure on the customer's side, not ours.
```

**Something on screen that must never ship**

```
<a staging address, a real customer name> is readable in this take. That never ships. Make
the recorder fail any take where it appears, and tell me the frame.
```

**Flat**

```
Flat. Nothing recognisable. Make it a diagram: wires, dots travelling along them, and the
marks people know on each destination.
```

**Wrong proportions**

```
The phone is stretched. Real proportions, fully inside the frame.
```

**Too small**

```
I cannot read the headline on a phone. Make every line readable at thumbnail size.
```

**A fault you can see but not name**

```
The text shakes during the zoom. Find the cause, fix it at the source, re-render, and tell
me what it was.
```

## Music

**Start**

```
Score videos/<name>. The music serves the reading: it must not ask for attention. Give me
five directions in a table (what carries it, the feel, where it fits, the risk). Build the
one I pick as audio only. I listen before it goes under the picture.
```

**Adjust**

```
Notes on the track: <piano down, lose the pulse, a soft click when Save is pressed at
4.2 s>. Same picture, new audio.
```

**Take control yourself**

```
Show me the controls. What do I change for louder, slower, other chords, fewer sounds on
the picture? I want a table.
```

## When you are stuck

```
I cannot describe what I want here. Give me five directions for <the opening, the layout,
the ending> in a table, with the risk of each.
```

```
Before changing anything else: research how this is usually done well, with sources, and
tell me which of our choices break those rules.
```
