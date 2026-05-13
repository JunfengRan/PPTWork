# Phase: visual QC

After authoring a slide, screenshot it and verify against the visual checklist
before declaring the page done.

## Inputs

- Deck name + slide name
- Optional iteration cap (default 3)
- Optional user-supplied complaint ("title overlapping the image", "footer
  cropped")

## Workflow

1. **Screenshot:** `node skills/ppt/scripts/screenshot.mjs <deck> <slide>` →
   refreshes / creates `thumbnail.png` in the slide folder.
2. **Read the thumbnail.** Open it as an image. If your environment cannot
   render images, you cannot self-verify — return that fact instead of
   inventing visual judgments.
3. **Walk the checklist below**, prioritized A → D.
4. **Pass → done.** **Fail → micro-edit `slide.html`** in place:
   - Allowed: font-size, padding, gap, line-height, color, object-fit,
     replacing the contents of a `data-id` node.
   - Forbidden: changing the narrative, restructuring the layout,
     adding/removing `data-id` nodes, rewriting the title logic — those
     belong to the authoring phase.
5. **Re-screenshot.** Repeat until pass or iteration cap.
6. **Cap reached without pass:** return a structured failure (which item
   failed, current value, expected value, suggested next step). Do not
   silently force a pass.

## Visual checklist

### A. Hard errors (must fix)

- [ ] No unintended bbox overlap.
- [ ] No text overflow past version safe area / card container.
- [ ] No critical text / numbers occluded by decoration.
- [ ] At least ~48px bottom safe margin on important text.
- [ ] Screenshot shows real content (not blank, not skeleton-only, not
  scripts-failed-to-run).

### B. Information density

**B1. Anti-"filler page" (mandatory for content pages; covers / agendas /
section breaks / closings exempt)**

- [ ] At least one visual element per page (chart / diagram / data card /
  image).
- [ ] 3~7 core bullets. Less than 3 is too sparse, more than 7 should split.
- [ ] Each bullet ≤ 60 chars; longer should split or convert to a chart.
- [ ] No paragraphs over 80 chars; break into bullets or extract a chart.
- [ ] Key numbers cite a source (footer or card footnote).

**B2. Visual elements actually rendered**

- [ ] Data pages have charts (not "numbers + a paragraph").
- [ ] Image slots (`[data-role="image-slot"]`) show real visuals, not just
  placeholder copy like "scene illustration".
- [ ] Diagram connector lines actually link to targets (not floating, not
  off-by-N).
- [ ] Chart.js canvas has bars/lines/pies (animation off + parent has height).

**B3. No "filler page" smell**

- [ ] Painted area covers >= 70% of the version safe area (≤30% white space
  is healthy).

### C. Typography & layout

- [ ] Alignment: cards / text boxes share top / left / centerline within
  visual tolerance.
- [ ] Type scale: body >= 10pt (12pt recommended), titles 20pt+, same level
  same size.
- [ ] Whitespace rhythm consistent between cards / text blocks.
- [ ] Restraint on emphasis: highlight color / bold / large size used at most
  2~3 times per page.

### D. Story transition + speaker notes

- [ ] design.md `Design` section names the transition rationale; the
  thumbnail's overall feel sits with neighboring pages.
- [ ] design.md `Note` section is mirrored into a
  `#ppt-speaker-notes-json` node inside slide.html — otherwise the exported
  PPTX has empty speaker notes.

## Priority

When multiple issues fire:

1. **A** (overlap / overflow / occlusion / blank) — must fix
2. **B** (data page without chart, image-slot empty) — must fix
3. **C** (alignment, type, whitespace) — fix
4. **D** (transition feel) — review at deck-finalization time

## Decision rules

- Hard issues (overlap / overflow) outrank soft issues (alignment / spacing).
- Minor rule warnings (e.g. body text 13.4pt vs recommended 14pt) may stay
  if the eye doesn't catch it; the rules aren't a strict gate.
- Don't sacrifice narrative or visual focus just to satisfy the checklist.
- An empty image-slot is **not** a visual issue — it's the authoring phase
  not finishing. Hand it back to authoring; do not edit slide.html in QC.

## Pre-export sanity

- A clean screenshot does not guarantee a clean exported PPTX.
- If the user later complains "exported PPTX layout is broken / fonts wrong /
  doesn't match preview", switch to raster export (`scripts/export.mjs <deck>`
  already runs raster mode in this skill build).
- Pages with `[data-role="image-slot"]` should be screenshotted again right
  before export to confirm the slot has real content.
