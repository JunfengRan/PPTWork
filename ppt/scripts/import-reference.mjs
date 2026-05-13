#!/usr/bin/env node
// Importing local PPTX templates into .pptwork/materials/<doc-name>/ requires
// the @aiden0z/pptx-renderer + esbuild bundling pipeline used by the original
// OpenCode plugin (packages/plugins/ppt/src/tools/import-reference.ts +
// renderer-scripts/render-server.mjs handlePptxToHtml). It has not been
// ported into this standalone skill yet.
//
// If you have a local PPTX you want to mine for layout ideas:
//   1. Use the OpenCode plugin (`@pptwork/ppt-plugin`) which still owns the
//      pptx → per-slide HTML extraction.
//   2. Or screenshot the slides yourself (Keynote/PPT > Export > images) and
//      describe each layout in plain text — the agent can use that as a
//      reference without needing the full HTML.

const lines = [
  "[Error] import-reference is not yet ported to the standalone skill.",
  "[State] Standalone skill only supports deck CRUD, screenshot, and export (raster).",
  "[Hint] Use the OpenCode plugin `@pptwork/ppt-plugin` for PPTX template import,",
  "[Hint] or screenshot the source deck manually and feed images + descriptions to the agent.",
];
process.stdout.write(lines.join("\n") + "\n");
process.exit(2);
