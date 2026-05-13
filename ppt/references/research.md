# Phase: research (web fetch / web search)

Triggered when a slide / outline depends on time-sensitive data (market size,
release cadence, regulations, competitor info) or when the user explicitly
asks you to verify a fact.

This skill does **not** ship its own `web_fetch` / `web_search` tool. Use the
host's built-in tools:

- OpenCode: `webfetch` / `websearch`
- Claude Code: WebFetch / WebSearch
- Cursor: WebSearch / WebFetch
- Codex: any HTTP-capable tool the host exposes

If the host has none, ask the user to paste the URLs / facts directly.

## Inputs

- Deck name (so you know where to archive the log)
- 1~N concrete queries
- Depth:
  - `quick` — at most 3 results per query, single round
  - `deep` — 5~8 results per query, up to 2 rounds of follow-up

## Workflow

1. **Search** each query with the host's web search tool, get candidate URLs.
2. **Filter** by relevance + authority (official > industry report > news >
   blog). Keep top 3~8.
3. **Fetch** each kept URL with the host's web fetch tool. Skip on failure.
4. **Extract** facts + numbers + dates + source URL from each body. Dedup,
   note conflicts.
5. **Append** the structured findings to
   `.pptwork/<deck>/materials/research.md` (create with header on first call,
   append a new `##` section every subsequent call).
6. **Return summary** to the main loop: 3~5 bullets + key URLs +
   `[written: .pptwork/<deck>/materials/research.md]`. Do **not** dump full
   article bodies back into context.

## research.md format

First-time header (only when creating the file):

```markdown
# Research log — <deck-name>

> Appended in chronological order. Each call is a `##` section.
```

Per-call section:

```markdown
## <ISO timestamp> | phase=<caller>

**Queries**:
- "<query 1>"
- "<query 2>"

### Key facts
- <fact 1> (source: <URL>, fetched: <YYYY-MM-DD>)
- <fact 2> (source: <URL>, fetched: <YYYY-MM-DD>)

### Conflicts / gaps
- <list any disagreement between sources, or "none">

### Suggested next step
- <where to attach this in the outline / which slide can use it>
```

## Decision rules

- Time-sensitive query (e.g. "2025 X market size") → favor official releases /
  top-tier reports, avoid blog reposts.
- Conflicting numbers across sources → write **both** into the conflict
  section, do not silently pick one.
- Failed fetch (404 / anti-bot / wrong-language too long) → log the failure in
  research.md and continue; do not stall the whole phase.
- `quick` depth → one round and return.
- `deep` depth → at most two rounds of follow-up.

## Forbidden

- Generating slide content (`design.md` / `slide.html` / `outline.md`) in this
  phase.
- Cross-deck writes into research.md.
- Returning raw page bodies to the main context (context pollution).
- Re-querying the same query indefinitely.
