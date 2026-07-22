# PPTWork Capabilities — Outline

> Audience: developers evaluating agent skills; Length: 8 slides; Style: dual-theme showcase; Verified externally: no

## Layout diversity self-check

- Covered pageType: cover / two-column-insight / flow-timeline / chart-demo / agenda / insight / closing
- No two adjacent pages share an assetId ✓

## P1 | Portable agent skills turn any host into a deck pipeline
- pageType: cover
- assetId: cover-editorial
- source: README + SKILL.md
- transition: N/A (opening)
- content:
  - PPTWork ships two composable skills for OpenCode, Cursor, Claude Code
  - HTML is the source; PPTX is the build artifact

## P2 | Deck orchestration and single-page authoring compose cleanly
- pageType: two-column-insight
- assetId: two-column-insight
- source: SKILL.md architecture
- transition: from P1's "portable skills" → how they compose
- content:
  - ppt skill: clarify → plan → QC → export
  - ppt-html-authoring: design.md + slide.html per page

## P3 | Two skills and template buckets form one pipeline
- pageType: two-column-insight
- assetId: bento-asymmetric
- source: SKILL.md + assets/
- transition: from composition diagram → concrete modules
- content:
  - Main: deck orchestration scripts
  - Side: authoring + template buckets

## P4 | The toolchain covers the full render-export loop
- pageType: chart-demo
- assetId: kpi-stat-row
- source: README tech stack
- transition: from architecture → measurable capabilities
- content:
  - 2 skills, 10 templates, 3 export scripts, 1280×720 canvas

## P5 | Four phases from intent to shipped deck
- pageType: flow-timeline
- assetId: flow-timeline
- source: SKILL.md workflow
- transition: from metrics → process
- content:
  - Clarify → Plan → Author → Ship

## P6 | Quick start in four commands
- pageType: agenda
- assetId: agenda-grid
- source: README quick start
- transition: from pipeline → hands-on path
- content:
  - init deck, init slide, screenshot, export

## P7 | Edit HTML, verify pixels, then ship
- pageType: insight
- assetId: quote-highlight
- source: design philosophy
- transition: from commands → philosophy
- content:
  - Core design principle quote

## P8 | Clone the repo and run your first deck today
- pageType: closing
- assetId: closing-cta
- source: README
- transition: from philosophy → action
- content:
  - Try examples/, read SKILL.md, run smoke test
