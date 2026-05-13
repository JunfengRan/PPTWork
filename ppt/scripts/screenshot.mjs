#!/usr/bin/env node
// Render a slide's slide.html into thumbnail.png at 1280x720 (PowerPoint
// LAYOUT_WIDE). Re-renders on every call; no cache.
//
// Usage:
//   node screenshot.mjs <slide-dir>
//   node screenshot.mjs <deck-name> <slide-name>
//
// Resolves <slide-dir> against process.cwd(). When called with two args, treats
// them as deck/slide under .pptwork/.

import fs from "node:fs/promises";
import path from "node:path";
import { renderSlideToPng } from "./lib/render.mjs";
import { getSlidePath, deckExists, slideExists } from "./lib/deck.mjs";

const directory = process.cwd();

function out(...lines) {
  process.stdout.write(lines.flat().join("\n") + "\n");
}

function fail(...lines) {
  process.stdout.write(lines.flat().join("\n") + "\n");
  process.exit(1);
}

async function resolveSlideDir(args) {
  if (args.length === 1) return path.resolve(directory, args[0]);
  if (args.length >= 2) {
    const [deck, slide] = args;
    if (!(await deckExists(directory, deck))) {
      fail(`[Error] Deck "${deck}" does not exist (.pptwork/${deck}/ missing).`);
    }
    if (!(await slideExists(directory, deck, slide))) {
      fail(`[Error] Slide "${slide}" not found in deck "${deck}".`);
    }
    return getSlidePath(directory, deck, slide);
  }
  fail(
    "[Error] usage:",
    "  screenshot.mjs <slide-dir>",
    "  screenshot.mjs <deck-name> <slide-name>",
  );
}

async function main() {
  const args = process.argv.slice(2);
  const slideDir = await resolveSlideDir(args);
  const htmlPath = path.join(slideDir, "slide.html");
  const thumbnailPath = path.join(slideDir, "thumbnail.png");

  try {
    await fs.access(htmlPath);
  } catch {
    fail(
      `[Error] slide.html not found at ${htmlPath}`,
      `[Hint] Write slide.html first, then re-run.`,
    );
  }

  try {
    const { png, width, height } = await renderSlideToPng(htmlPath);
    await fs.writeFile(thumbnailPath, png);
    const rel = path.relative(directory, thumbnailPath);
    out(
      "[Done] Re-rendered slide PNG.",
      `[File] ${path.relative(directory, htmlPath)}`,
      `[Thumbnail] ${rel}`,
      `[Size] ${width}x${height}`,
      `[Bytes] ${png.length}`,
      "",
      `[Next] Open ${rel} (Read tool / image viewer) to verify visually.`,
    );
  } catch (e) {
    fail(
      `[Error] Screenshot failed: ${e?.message || String(e)}`,
      `[Hint] Ensure Chrome/Chromium is installed locally, or set PPT_BROWSER_EXECUTABLE / PPT_BROWSER_EXECUTABLE.`,
      `[Hint] Or run \`npx playwright install chromium\` inside skills/ppt to use playwright's bundled browser.`,
    );
  }
}

main();
