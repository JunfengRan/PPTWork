# Phase: material digest

When the user gives you a long document, multiple files, meeting minutes, or
the output of a `import-reference` PPTX import, **digest first** before doing
anything else. The goal is to compress the input into a structured summary the
rest of the work can consume; do **not** try to author slides off raw input.

## When to enter this phase

- User pasted a long doc / multiple files / a research dump
- You just imported a reference PPTX and the per-slide HTML is large
- User pointed you at a folder of materials

## What to extract

1. Prefer **structure first**: directory tree, headings, section titles, table
   headers, chart titles, bold conclusions. Decide whether to drill into the
   body afterwards.
2. For an imported reference deck, aggregate **per page**: title, modules,
   reusable layout traits, visible placeholders, key numbers, brand cues.
3. When the same fact appears in multiple places, keep the most complete /
   most credible version and note the conflict.
4. Do **not** invent content or write any slide copy yet.

## Output (write into your scratchpad / context, not into a file by default)

```
## Executive summary
- 3-6 lines on what the material is about and what's directly usable for PPT.

## Must-keep facts
- Numbers, conclusions, named entities, dates, source pointers (section / page).

## Structure cues
- For decks: per-page layout, info hierarchy, chart/diagram type, reusable composition.
- For docs: per-section content blocks, tagged "good for cover / agenda / insight / flow / data / closing".

## Gaps & conflicts
- Missing key data, broken context, contradictory claims, stale info, placeholder content.

## Follow-up questions
- 1-5 questions worth raising back to the user.
```

## Hard rules

- No raw long excerpts.
- No full HTML / CSS / JSON dumped back into context.
- Do not claim "I already generated the deck" — this phase is summarization
  only.
- The summary should be short. Only expand when the material genuinely
  warrants more bullets.
