# Phase: story planning

Turn user intent + digested material → an executable per-page plan. Output is
either `.pptwork/<deck>/outline.md` (deck >= 5 pages) or a structured summary
back into context (short deck).

**This phase does not write `design.md`, `slide.html`, or `deck.json`.** Story
planning means: every page gets a one-liner that says "what we're saying,
which template slot, where the content comes from".

## Preconditions

The clarification checklist must already be filled in (audience, length,
style/brand, must-have sections, output language, whether to verify
externally). If anything is missing, return to the user with a follow-up
question instead of making it up.

## Workflow

1. **Confirm clarification is complete.** If something key is missing, raise
   it before planning, do not paper it over.
2. **Read summaries, not raw material.** If the source is too long, run the
   `material-digest` phase first.
3. **Pick layouts by id, do NOT read the raw HTML.** That's the
   `ppt-html-authoring` skill's job. You only read these fields from each
   bucket's `index.json` under `assets/<bucket>/`:
   - `id`
   - `pageType`
   - `description`
   - `authoringHints`

   If no bucket is configured for this project, skip the assetId lookup —
   describe each page's layout in plain language ("two-column comparison
   with a chart on the left, three bullets on the right") and let the
   authoring phase compose slide.html from scratch.
4. **Layout diversity hard rules:**
   - No two adjacent pages share the same `assetId`.
   - Whole deck covers at least 4~5 distinct `pageType`s.
   - Don't dump every data page onto a single KPI-style layout. Trends →
     chart layout, phases → flow / timeline, comparisons → two-column.
5. **Each page must record:** `pageType`, `assetId`, **source mapping**
   (which user material section / which research query / `TBD`),
   **transition sentence** (how the previous page's conclusion leads into
   this one), and bullet points of key content.
6. **Output split:**
   - >= 5 pages → write `.pptwork/<deck>/outline.md` once (no incremental
     patching).
   - < 5 pages → return a structured summary directly; skip the file.
7. **External data:** if a page depends on time-sensitive facts, run the
   `research` phase, then cite the conclusion in the source field as
   `see research.md §<timestamp>`. If it's too uncertain to research now,
   mark `应联网: query=...` in the source so the main loop knows to follow
   up.

## outline.md format (strict)

```markdown
# <Deck topic> — Outline

> Audience: ...; Length: ...; Style: ...; Verified externally: yes/no

## Layout diversity self-check

- Covered pageType: cover / agenda / two-column-insight / chart-demo / flow-timeline / closing
- No two adjacent pages share an assetId ✓
- Data pages use charts (not pure text) ✓

## P1 | <conclusion-style title>
- pageType: cover
- assetId: cover-hero        # or omit entirely if no template bucket
- source: user material §1 (digest item 2)
- transition: N/A (opening)
- content:
  - <bullet 1>
  - <bullet 2>

## P2 | <conclusion-style title>
- pageType: agenda
- assetId: agenda-columns
- source: user material §2
- transition: from P1's ... lead to ...
- content:
  - <bullet 1>
  - <bullet 2>

...
```

## Title style (the single biggest lever against "filler" pages)

| ❌ Noun-form | ✅ Conclusion-form |
|---|---|
| "AI Agent market" | "AI Agent market crosses USD 100B in 3 years" |
| "Digital transformation" | "Digital transformation lifts ops efficiency 40%" |
| "Edge computing" | "Pushing inference to the edge cuts latency to 15ms" |

Both the page-frontmatter `title` and the outline `## PN |` lines follow this
rule.

## Common story arcs (compressed; pick by topic shape)

- **Conclusion → support**: P1 cover → P2 conclusion → P3~P5 three lines of
  support (data / case / architecture) → P6 closing call to action. Best for
  briefings, pitches, product launches.
- **Problem → cause → solution → outcome**: P1 cover → P2 status quo →
  P3 root cause → P4 solution → P5 outcome KPIs → P6 next step. Best for
  engineering proposals, post-mortems.
- **Timeline / phased evolution**: P1 cover → P2 three-phase agenda →
  P3~P5 phase 1~3 → P6 main-thread closing. Best for roadmaps,
  transformation cases, market evolution.
- **Value prop → capability map**: P1 cover → P2 customer pain → P3 value
  proposition → P4 capability map → P5~P6 cases → P7 delivery / commercial.
  Best for sales decks.

## When to push back to the user

Surface these directly in your response — do **not** improvise an answer:

- User gave a topic but no material, and the topic is data-heavy
  ("AI Agent market analysis").
- User said "use this PPTX as reference" but the digest shows it covers far
  more page types than this deck needs.
- User asked for "20-page deep report" but the material can only support 8
  pages.
- User asked for a specific brand style but must-have sections include
  clearly off-brand terminology / content.

## Forbidden in this phase

- Writing `design.md` / `slide.html` directly.
- Copying example copy from template HTML into the outline (placeholder bleed).
- Stopping after 1~2 pages — story planning must be one-shot complete.
- Calling web tools directly (use the `research` phase).
