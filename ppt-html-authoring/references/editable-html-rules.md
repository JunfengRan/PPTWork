# Editable HTML authoring rules

html2pptx-pro cannot perfectly turn arbitrary browser HTML/CSS into editable PowerPoint objects. Editable decks should still be authored with simple, explicit DOM structure so the converter can map text, shapes, tables, and charts predictably.

Use these rules for the default editable export path. If the result drifts, switch to raster for high-fidelity output.

## Allowed structure

- Fixed canvas: `html, body { width:1280px; height:720px; margin:0; overflow:hidden; }`
- Simple absolute positioning, grid, or flex layouts.
- Real text in `h1`-`h6`, `p`, `ul`, `ol`, `li`, or leaf `div` / `span`.
- Simple cards and badges with solid background, border, border-radius, and optional shadow.
- Real `<table>` for tables.
- Chart.js canvases only when the chart config can be extracted.
- Stable `data-id` / `data-role` on important editable objects.

## Avoid or rasterize

- Text inside SVG, canvas, images, CSS pseudo-elements, or background images.
- Complex stacked gradients around foreground content.
- `filter`, `backdrop-filter`, `mix-blend-mode`, complex `clip-path`, animation, transitions.
- Complex transforms beyond simple rotation.
- Deeply nested text containers that depend on browser auto layout.

If a visual effect is important but not editable, isolate it in its own node and mark it `data-raster="true"`. Keep editable text and shapes as separate foreground nodes.

## Converting an existing deck to editable

Do not write a rule-only converter. Use a language model page by page:

1. Read the existing `design.md`, `slide.html`, and screenshot.
2. Preserve the content and visual hierarchy.
3. Rewrite `slide.html` into the allowed structure above.
4. Move important text out of SVG/canvas/images/pseudo-elements into real text nodes.
5. Split complex backgrounds from editable foreground content.
6. Run screenshot QC, then export with `--mode editable`.

Success means the PPTX contains editable text/shape XML (`<a:t>`, `<p:sp>`) for meaningful content, not a single full-slide picture.
