# Export troubleshooting

## What this skill exports

`scripts/export.mjs <deck>` produces a single `.pptx` file. Two modes are
available. If `deck.json` contains `exportMode`, omitted `--mode` follows
that preference; decks without `exportMode` default to **editable**.

### Editable (default)

1. Reads `deck.json`.
2. Loads every `slide.html` in headless Chromium.
3. Injects `html2pptx-pro` and converts slide DOM into editable PowerPoint
   objects.

Editable output is the main path, but it is still a conversion. Always open
the result in PowerPoint and check fonts, layout, object ordering, and whether
the objects the user cares about are editable.

### Raster (high-fidelity fallback)

1. Reads `.pptwork/<deck>/deck.json` for slide order.
2. For each slide, headlessly renders `slide.html` to a full-page PNG
   (deviceScaleFactor=2, 1280x720 viewport = LAYOUT_WIDE).
3. Places that PNG onto a 13.333×7.5 inch slide via pptxgenjs.
4. Pulls speaker notes from
   `<script type="application/json" id="ppt-speaker-notes-json">…</script>`
   in slide.html and attaches them via `slide.addNotes()`.

Pixel-identical to the browser preview, but the text isn't selectable
inside PowerPoint. **This is by design.** The intended revision loop is:

```
edit slide.html  →  screenshot.mjs to verify visually  →  export.mjs to ship
```

The slide.html is the source. The .pptx is a build artifact. Don't try to
edit the .pptx and expect changes to round-trip.

### dom-to-pptx backup

`--editable-engine dom-to-pptx` is retained only as a backup diagnostic path.
It has shown layout drift on real decks and currently supports one-slide
backup export. Do not use it for normal delivery.

Default output path: `.pptwork/<deck>/<deck>.pptx`. Override with
`--output <path>`.

## Choosing a mode

- **Default = editable (`html2pptx-pro`)**. Run it first, then inspect the PPTX.
- **Switch to raster (`--mode raster`)** when visual fidelity matters more than
  PowerPoint editability, or when editable export drifts.
- **Use `--editable-engine dom-to-pptx` only for one-slide diagnostics.**

## "How do I edit the exported deck?"

Always edit `slide.html` (the source) and re-export. The supported loop:

```bash
# 1. Open the slide.html in your editor, change text / colors / layout.
$EDITOR .pptwork/<deck>/<slide>/slide.html

# 2. Verify visually.
node skills/ppt/scripts/screenshot.mjs <deck> <slide>
# Open .pptwork/<deck>/<slide>/thumbnail.png to check.

# 3. Re-export.
node skills/ppt/scripts/export.mjs <deck>
```

Iterating on the .pptx itself only makes sense if the user has explicitly
asked for editable export AND they're going to do the editing inside
PowerPoint anyway.

## Common failure modes

### "playwright-core not installed"

```
[Error] export failed: playwright-core not installed.
```

→ Run `npm install` (or `bun install`) inside `skills/ppt/`.

### "Failed to launch browser"

The render path tries, in order: `PPT_BROWSER_EXECUTABLE` env override →
playwright's bundled chromium → system Chrome (channel) → system Edge
(channel, win/mac).

If all fail:

- Install Chrome / Edge locally.
- Or set `PPT_BROWSER_EXECUTABLE` (or `PPT_BROWSER_EXECUTABLE`) to a
  valid browser binary.
- Or run `npx playwright install chromium` inside `skills/ppt/` to seed
  Playwright's bundled cache.

### "Missing slide.html for slide ..."

Every slide listed in `deck.json` must have an authored `slide.html`.
Don't batch-init 12 empty slides and try to export — author 1~2 first,
screenshot, verify, then scale out (per the main SKILL flow).

### Editable mode: text wraps differently in PowerPoint than in the browser

Most common cause: the font in slide.html isn't installed on the
machine opening the .pptx. PowerPoint substitutes a fallback font with a
different metric, and the line breaks shift. Two ways out:

- Drop the `--mode editable` flag — default raster is immune to font
  substitution.
- Or switch to web-safe fonts in slide.html (Arial, Helvetica, Microsoft
  YaHei, system-ui).

### Editable mode: ghosting — content appears twice on the same slide

Usually caused by a parent element being rasterized while one of its
descendants also gets emitted as a live element on top. `html2pptx-pro`
may rasterize complex backgrounds (gradients, transformed SVGs, generic
`<canvas>` without Chart.js, anything tagged `data-raster="true"`) while
still walking child nodes.

Workaround: if you need crisp live text on top of a gradient or image
background, put the background on its own sibling div (no children) and
place the foreground content in a separate, non-gradient div above it.
The converter will rasterize the background div alone and render the
foreground text/images live.

### Editable mode: a shape / SVG / canvas didn't render

Anything `html2pptx-pro` can't faithfully map may fall back to a
rasterized image layer at the same coordinates. If a specific element
renders wrong, tag it explicitly with `data-raster="true"` so the
converter doesn't attempt a live mapping.

If multiple elements drift in the same export, that's the signal to ship
`--mode raster` instead.

### Raster mode: text wraps differently than in the browser preview

Raster mode is pixel-faithful — wrapping won't change. If you mean "the
preview in browser was different from what's in the .pptx", check that
slide.html sets `html, body { width: 1280px; height: 720px; overflow: hidden; }`
explicitly. The renderer measures the body to size the viewport, so missing
sizing leads to drift.

### Speaker notes are empty in the exported PPTX

The JSON island isn't there or isn't named correctly. Required:

```html
<script type="application/json" id="ppt-speaker-notes-json">
"... your speaker notes here, as JSON-encoded string ..."
</script>
```

Or:

```html
<script type="application/json" id="ppt-speaker-notes-json">
{"text": "... your speaker notes here ..."}
</script>
```

The script accepts both shapes; anything else is treated as raw text.
