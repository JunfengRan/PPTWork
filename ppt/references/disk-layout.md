# Disk layout

Everything this skill produces lives under `.pptwork/` in the user's project
root (i.e. `process.cwd()`). One folder per deck.

```
.pptwork/
├── materials/                  # `import-reference` drop zone (cross-deck, read-only)
│   └── <doc-name>/             #   doc-name = .pptx filename without extension
│       ├── deck.json
│       └── slide-NN/slide.html
│
└── <deck-name>/                # the deck you author
    ├── deck.json               # {"name": "...", "slides": ["slide-a", ...], ...}
    ├── outline.md              # optional; long-deck story arc
    ├── materials/              # optional; per-deck working notes
    │   ├── doc_raw.md          #   user-pasted source material archived
    │   └── research.md         #   research-phase log (append-only)
    └── <slide-name>/
        ├── design.md           # design spec (frontmatter title/layout + Content/Note/Design)
        ├── slide.html          # render entry, single-file self-contained
        └── thumbnail.png       # screenshot.mjs output
```

## Hard contracts

- `deck.json.slides` is the **only** source of truth for slide order. Don't
  hand-edit it; let `scripts/deck.mjs` mutate it via `init-slide` / `move` /
  `delete`.
- `<slide-name>` is the slide's human-readable id. Keep it short and
  meaningful (`intro-dark`, `agenda-clean`, `summary-bold`).
- `design.md` is **not** a comment file — it's the design spec that drives
  `slide.html`.
- `slide.html` must be **single-file self-contained**. Inline all CSS in
  `<style>`, all JS in `<script>`. Don't split into separate `.css` / `.js`
  files (the static-server-based renderer can serve them, but the
  single-file rule keeps decks portable; broken when copied without the
  sidecar files).
- `thumbnail.png` is regenerated on every `screenshot.mjs` call; never edit
  by hand.

## Distinction between two `materials/` folders

- `.pptwork/materials/<doc>/` — global, shared across decks. Holds imported
  PPTX templates (read-only references).
- `.pptwork/<deck>/materials/` — per-deck working files (research.md,
  doc_raw.md). Names overlap by accident; semantics are different.
