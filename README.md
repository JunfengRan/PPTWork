# PPTWork

PPTWork has two portable [Anthropic-style Skills](https://www.anthropic.com/news/skills)
for AI agents to plan, author, and export PowerPoint decks. Both work in
**OpenCode**, **Claude Code**, **Cursor**, **Codex**, or any other host that
honors the SKILL.md frontmatter convention.

## Skills shipped

| Skill | Trigger | What it does |
|---|---|---|
| [`ppt/`](ppt/SKILL.md) | "build a deck", "make a presentation", "export to PowerPoint" | End-to-end deck pipeline: clarify → plan → author → screenshot → export |
| [`ppt-html-authoring/`](ppt-html-authoring/SKILL.md) | "design a slide", "draft this page", "rewrite this layout" | Single-page authoring: writes `design.md` + a self-contained `slide.html` |

The two skills compose: the deck pipeline delegates each page to the
authoring skill. The authoring skill is also useful standalone when the
user just wants one slide.

## What's inside `ppt/scripts/`

The deck skill ships Node scripts that the agent calls via bash. They
replace what would otherwise be runtime tools, so the same skill works in
hosts that don't support custom MCP tooling.

| Script | Purpose |
|---|---|
| `deck.mjs` | Deck CRUD (`init` / `init-slide` / `move` / `delete` / `path` / `list`) |
| `screenshot.mjs` | Headless render of `slide.html` → `thumbnail.png` |
| `export.mjs` | PPTX export — default **editable** (`html2pptx-pro`), opt-in `--mode raster` |

### Tech stack

| Library | Role |
|---|---|
| **playwright-core** | Headless Chromium/Edge rendering of `slide.html`, screenshots |
| **html2pptx-pro** | Editable PPTX (HTML structure mapping) — default export engine |
| **dom-to-pptx** | DOM → slide elements — backup editable engine for diagnostics |
| **pptxgenjs** | PPTX file writing, raster export |

### Mental model: HTML is the source, PPTX is a build artifact

Every slide is just a self-contained HTML file. Authoring, revisions,
and layout fixes happen in the HTML. The export is one-way:

```
edit slide.html  →  screenshot.mjs to verify  →  export.mjs to ship .pptx
```

That's it. Don't try to edit the .pptx and round-trip changes back into
HTML — that path doesn't exist by design.

### Editable export (default)

`export.mjs <deck>` loads each `slide.html` in headless Chromium, injects
[`html2pptx-pro`](https://www.npmjs.com/package/html2pptx-pro), and maps the
live DOM into editable PowerPoint objects (text frames, lists, tables, shapes,
charts). This is the main path when the recipient needs to revise content
inside PowerPoint.

It is still an HTML-to-PPTX conversion — always open the result and verify
fonts, layout, and object ordering. If anything drifts, re-export with
`--mode raster` (pixel-faithful fallback) or, for one-slide diagnostics only,
`--editable-engine dom-to-pptx`.

Author editable decks with simple, explicit DOM structure; see
`ppt/references/editable-html-rules.md`.

### Raster export (high-fidelity fallback)

`export.mjs <deck> --mode raster` captures each slide as a single full-page
PNG (at deviceScaleFactor=2) and places it onto a 13.333×7.5 inch slide via
[`pptxgenjs`](https://github.com/gitbrent/PptxGenJS). Pixel-faithful to
the browser preview, immune to font substitution, robust against any
HTML / CSS quirks.

Text inside the .pptx isn't selectable — but that's the point: the
browser preview is the contract. To revise content, edit the slide.html
and re-run `export.mjs`.

## Setup

```bash
cd ppt
npm install                # or `bun install`
```

Dependencies: `playwright-core`, `html2pptx-pro`, `dom-to-pptx`, and
`pptxgenjs`. The headless renderer detects a local Chrome / Edge
automatically; if neither is installed, run `npx playwright install chromium`
once.

## Quick start

```bash
cd ppt
npm install

# kick off a deck in any project root
cd /path/to/your/project

node /path/to/skills/ppt/scripts/deck.mjs init pitch
node /path/to/skills/ppt/scripts/deck.mjs init-slide pitch cover
# ... write .pptwork/pitch/cover/slide.html (single-file, 1280x720) ...
node /path/to/skills/ppt/scripts/screenshot.mjs pitch cover
node /path/to/skills/ppt/scripts/export.mjs pitch
# → .pptwork/pitch/pitch.pptx
```

Run the smoke test to verify the toolchain end-to-end:

```bash
node ppt/test/smoke.mjs
```

It spins up a temporary project, walks the full pipeline, and reports
pass/fail per step.

## Disk layout convention

Every deck lives at `.pptwork/<deck-name>/` in the project root:

```
.pptwork/
└── <deck-name>/
    ├── deck.json          # slide order — single source of truth
    ├── outline.md         # optional, story arc for long decks
    ├── materials/         # optional, research notes / digests
    │   ├── doc_raw.md
    │   └── research.md
    └── <slide-name>/
        ├── design.md      # frontmatter + Content / Note / Design sections
        ├── slide.html     # single-file, self-contained, 1280x720
        └── thumbnail.png  # produced by screenshot.mjs
```

`deck.json` is the **only** authoritative slide order. Don't hand-edit;
let `deck.mjs init-slide / move / delete` mutate it.

## Bring your own template assets

The skill ships **no built-in template buckets**. If you have a corpus of
reference slides you'd like to riff on, drop a bucket under
`ppt/assets/<bucket-name>/`:

```
ppt/assets/<bucket>/
├── index.json                     # array of template descriptors
├── html/<id>.html                 # one self-contained reference slide per id
├── specs/<id>.json                # optional structured zone description
└── materials/<id>/                # optional images / svgs
```

The story-planning phase reads `index.json` to pick layouts; the
authoring phase reads the matching HTML to borrow composition.

Without a bucket, the skill still works — story planning just describes
layouts in plain language and authoring composes from scratch using the
guidance in `ppt-html-authoring/references/`.

## License

MIT — see [`LICENSE`](LICENSE).

## Acknowledgements

Filesystem-as-database deck contract and the export toolchain (headless
render via playwright-core, editable conversion via html2pptx-pro /
dom-to-pptx, raster assembly via pptxgenjs) are adapted from a closed-source
OpenCode plugin. Released here in skill form so the same workflow runs on
any agent host.
