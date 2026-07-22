# Attributions

PPTWork ships built-in template buckets under `ppt/assets/`. Layout geometry,
CSS patterns, and color tokens are adapted from the following MIT-licensed
projects. All template HTML in this repository is **original work** rewritten
for the PPTWork single-slide contract (1280×720, self-contained HTML,
`data-role` slots).

## presentation-skill-pack

- **Repository:** [isatimur/presentation-skill-pack](https://github.com/isatimur/presentation-skill-pack) (also published as `presentation-md`)
- **License:** MIT
- **Copyright:** Timur Isachenko
- **What we adapted:**
  - Layout structure from `packages/shared/layouts/*.html` (title, two-column,
    feature-grid, stat-row, timeline, quote, section, closing, data-table)
  - Base stylesheet patterns from `packages/shared/base.css`
  - Theme color and typography tokens from:
    - `packages/themes/corporate/theme.json` → `ppt/assets/corporate-light/`
    - `packages/core/themes/claude/theme.json` → `ppt/assets/claude-warm/`

## ppt-agent-skill (Akxan)

- **Repository:** [Akxan/ppt-agent-skill](https://github.com/Akxan/ppt-agent-skill)
- **License:** MIT
- **Copyright:** sunbigfly (2025)
- **What we adapted:**
  - Bento Grid layout coordinates and card spacing from
    `references/bento-grid.md` (2fr + 1fr asymmetric grid, 1280×720 canvas)
  - Implemented as original HTML in `ppt/assets/claude-warm/html/bento-asymmetric.html`

## Not included

The following projects were reviewed but **not** integrated (different stack or
license/terms incompatible with HTML-first template buckets):

- Anthropic `skills/pptx` — python-pptx workflow, not HTML slide templates
- SlideSpeak — managed API service
- PPTAgent — full agent framework, not portable layout assets
