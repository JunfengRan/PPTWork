#!/usr/bin/env node
// Deck CRUD CLI — replaces the OpenCode plugin tools:
//   initialize_deck / initialize_slide / move_slides / delete_slides / get_slide_folder_path
//
// All operations are scoped to `process.cwd()/.pptwork/`. Output preserves the
// [Done]/[State]/[Next]/[Hint]/[Error] protocol the agent uses to drive its
// next step.
//
// Usage:
//   node deck.mjs init <deck-name>
//   node deck.mjs init-slide <deck> <slide> [--at <position>]
//   node deck.mjs move <deck> <slide> <to-position>
//   node deck.mjs delete <deck> <slide> [<slide>...]
//   node deck.mjs path <deck> <slide>
//   node deck.mjs list <deck>

import fs from "node:fs/promises";
import path from "node:path";
import {
  deckExists,
  getDeckPath,
  getDeckJsonPath,
  readDeck,
  writeDeck,
  slideExists,
  getSlidePath,
  formatSlides,
  listSlideFiles,
  normalizeExportMode,
} from "./lib/deck.mjs";

const EMPTY_DESIGN_MD = `---
title: ""
layout: "default"
---

## Content


## Note


## Design

`;

const directory = process.cwd();

function out(...lines) {
  process.stdout.write(lines.flat().join("\n") + "\n");
}

function fail(...lines) {
  process.stdout.write(lines.flat().join("\n") + "\n");
  process.exit(1);
}

async function cmdInit(deckName, options = {}) {
  if (!deckName) fail("[Error] usage: deck.mjs init <deck-name>");
  const exportMode = normalizeExportMode(options.mode);
  if (await deckExists(directory, deckName)) {
    fail(
      `[Error] Deck "${deckName}" already exists at ${getDeckPath(directory, deckName)}`,
      `[State] Deck folder and deck.json are present.`,
      `[Hint] Pick another name, or use init-slide to add slides to this deck.`,
    );
  }
  const deckPath = getDeckPath(directory, deckName);
  await fs.mkdir(deckPath, { recursive: true });
  const deck = {
    name: deckName,
    slides: [],
    exportMode,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await fs.writeFile(getDeckJsonPath(directory, deckName), JSON.stringify(deck, null, 2), "utf-8");
  out(
    `[Done] Created deck "${deckName}" at ${deckPath}`,
    `[State] deck.json initialized with 0 slides; exportMode=${exportMode}.`,
    `[Next] You now have an empty deck. Recommended next moves:`,
    `  1. (optional, deck >= 5 pages) Draft .pptwork/${deckName}/outline.md to lock the story arc.`,
    `  2. (optional, time-sensitive data) Use the host's webfetch / websearch tool for fresh facts; archive findings in .pptwork/${deckName}/materials/research.md.`,
    `  3. Use \`deck.mjs init-slide ${deckName} <slide-name>\` to create the first slide. Editable is the main export path; verify the PPTX and use raster only when high-fidelity fallback is needed.`,
  );
}

async function cmdInitSlide(deckName, slideName, options) {
  if (!deckName || !slideName) fail("[Error] usage: deck.mjs init-slide <deck> <slide> [--at N]");
  if (!(await deckExists(directory, deckName))) {
    fail(
      `[Error] Deck "${deckName}" does not exist.`,
      `[State] No deck found at .pptwork/${deckName}/`,
      `[Hint] Run \`deck.mjs init ${deckName}\` first.`,
    );
  }
  if (await slideExists(directory, deckName, slideName)) {
    fail(
      `[Error] Slide "${slideName}" already exists in deck "${deckName}".`,
      `[State] Folder .pptwork/${deckName}/${slideName}/ is already present.`,
      `[Hint] Pick a different slide name or delete the existing one first.`,
    );
  }
  const slidePath = getSlidePath(directory, deckName, slideName);
  await fs.mkdir(slidePath, { recursive: true });
  await fs.writeFile(path.join(slidePath, "design.md"), EMPTY_DESIGN_MD, "utf-8");

  const deck = await readDeck(directory, deckName);
  const position = options?.at;
  if (position !== undefined && position >= 0 && position <= deck.slides.length) {
    deck.slides.splice(position, 0, slideName);
  } else {
    deck.slides.push(slideName);
  }
  await writeDeck(directory, deckName, deck);

  out(
    `[Done] Created slide "${slideName}" in deck "${deckName}" at ${slidePath}`,
    `[State] Slides (${deck.slides.length} total):\n${formatSlides(deck.slides)}`,
    `[Next] An empty design.md skeleton is in place — the slide is NOT done yet. Required next steps:`,
    `  1. Fill in design.md (Content / Note / Design — all three sections must be non-empty).`,
    `  2. Write slide.html in the same folder (single-file, see references/slide-html-rules in the ppt-html-authoring skill). Sync the Note text into a #ppt-speaker-notes-json node so it lands in the PPTX speaker notes.`,
    `  3. Run \`screenshot.mjs ${path.relative(directory, slidePath)}\` to refresh thumbnail.png and verify visually.`,
  );
}

async function cmdMove(deckName, slideName, toRaw) {
  const toPosition = Number(toRaw);
  if (!deckName || !slideName || !Number.isFinite(toPosition)) {
    fail("[Error] usage: deck.mjs move <deck> <slide> <to-position>");
  }
  if (!(await deckExists(directory, deckName))) {
    fail(
      `[Error] Deck "${deckName}" does not exist.`,
      `[State] No deck found at .pptwork/${deckName}/`,
    );
  }
  const deck = await readDeck(directory, deckName);
  const currentIndex = deck.slides.indexOf(slideName);
  if (currentIndex === -1) {
    fail(
      `[Error] Slide "${slideName}" not found in deck "${deckName}".`,
      `[State] Current slides:\n${formatSlides(deck.slides)}`,
    );
  }
  const clamped = Math.max(0, Math.min(toPosition, deck.slides.length - 1));
  deck.slides.splice(currentIndex, 1);
  deck.slides.splice(clamped, 0, slideName);
  await writeDeck(directory, deckName, deck);
  out(
    `[Done] Moved "${slideName}" from position ${currentIndex} to ${clamped}.`,
    `[State] Slide order (${deck.slides.length} total):\n${formatSlides(deck.slides)}`,
  );
}

async function cmdDelete(deckName, slideNames) {
  if (!deckName || slideNames.length === 0) {
    fail("[Error] usage: deck.mjs delete <deck> <slide> [<slide>...]");
  }
  if (!(await deckExists(directory, deckName))) {
    fail(
      `[Error] Deck "${deckName}" does not exist.`,
      `[State] No deck found at .pptwork/${deckName}/`,
    );
  }
  const deck = await readDeck(directory, deckName);
  const deleted = [];
  const notFound = [];
  for (const slideName of slideNames) {
    if (!deck.slides.includes(slideName)) {
      notFound.push(slideName);
      continue;
    }
    await fs.rm(getSlidePath(directory, deckName, slideName), { recursive: true, force: true }).catch(() => {});
    deck.slides = deck.slides.filter((s) => s !== slideName);
    deleted.push(slideName);
  }
  await writeDeck(directory, deckName, deck);

  const lines = [];
  if (deleted.length > 0) lines.push(`[Done] Deleted ${deleted.length} slide(s): ${deleted.join(", ")}`);
  if (notFound.length > 0) lines.push(`[Warn] Slide(s) not found in deck: ${notFound.join(", ")}`);
  lines.push(`[State] Remaining slides (${deck.slides.length}):\n${formatSlides(deck.slides)}`);
  if (deck.slides.length === 0) lines.push(`[Next] Deck is now empty. Use init-slide to add new slides.`);
  out(lines);
}

async function cmdPath(deckName, slideName) {
  if (!deckName || !slideName) fail("[Error] usage: deck.mjs path <deck> <slide>");
  if (!(await deckExists(directory, deckName))) {
    fail(`[Error] Deck "${deckName}" does not exist.`);
  }
  if (!(await slideExists(directory, deckName, slideName))) {
    fail(
      `[Error] Slide "${slideName}" does not exist in deck "${deckName}".`,
      `[Hint] Use init-slide to create it first.`,
    );
  }
  const slidePath = getSlidePath(directory, deckName, slideName);
  const files = await listSlideFiles(slidePath);
  out(
    `[Done] Slide folder path: ${slidePath}`,
    `[State] Files in folder: ${files.length > 0 ? files.join(", ") : "(empty)"}`,
    `[Next] Read or write files in this folder — design.md for design specs, slide.html for the rendered page.`,
  );
}

async function cmdList(deckName) {
  if (!deckName) fail("[Error] usage: deck.mjs list <deck>");
  if (!(await deckExists(directory, deckName))) {
    fail(`[Error] Deck "${deckName}" does not exist.`);
  }
  const deck = await readDeck(directory, deckName);
  out(
    `[Done] Deck "${deck.name}"`,
    `[State] Slides (${deck.slides.length}):\n${formatSlides(deck.slides)}`,
  );
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { positional, flags };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  const { positional, flags } = parseArgs(rest);

  switch (cmd) {
    case "init":
      return cmdInit(positional[0], { mode: flags.mode });
    case "init-slide":
      return cmdInitSlide(positional[0], positional[1], {
        at: flags.at !== undefined ? Number(flags.at) : undefined,
      });
    case "move":
      return cmdMove(positional[0], positional[1], positional[2]);
    case "delete":
      return cmdDelete(positional[0], positional.slice(1));
    case "path":
      return cmdPath(positional[0], positional[1]);
    case "list":
      return cmdList(positional[0]);
    default:
      fail(
        "[Error] unknown command. Available:",
        "  init <deck>",
        "  init-slide <deck> <slide> [--at N]",
        "  move <deck> <slide> <to-pos>",
        "  delete <deck> <slide> [<slide>...]",
        "  path <deck> <slide>",
        "  list <deck>",
      );
  }
}

main().catch((e) => {
  fail(`[Error] ${e?.stack || e?.message || String(e)}`);
});
