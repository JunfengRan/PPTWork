// Deck filesystem helpers — ported from packages/plugins/ppt/src/utils/deck.ts.
// .pptwork/<deck>/deck.json is the single source of truth for slide order.

import fs from "node:fs/promises";
import path from "node:path";

export const PPTWORK_DIR = ".pptwork";
export const MATERIALS_DIR = "materials";

export function getPptworkPath(directory) {
  return path.join(directory, PPTWORK_DIR);
}

export function getDeckPath(directory, deckName) {
  return path.join(directory, PPTWORK_DIR, deckName);
}

export function getDeckJsonPath(directory, deckName) {
  return path.join(getDeckPath(directory, deckName), "deck.json");
}

export function getSlidePath(directory, deckName, slideName) {
  return path.join(getDeckPath(directory, deckName), slideName);
}

export async function readDeck(directory, deckName) {
  const raw = await fs.readFile(getDeckJsonPath(directory, deckName), "utf-8");
  const parsed = JSON.parse(raw);
  if (
    typeof parsed?.name !== "string" ||
    !Array.isArray(parsed?.slides) ||
    typeof parsed?.createdAt !== "string"
  ) {
    throw new Error(`deck.json malformed at ${getDeckJsonPath(directory, deckName)}`);
  }
  return parsed;
}

export function normalizeExportMode(value) {
  return value === "raster" ? "raster" : "editable";
}

export async function writeDeck(directory, deckName, deck) {
  deck.updatedAt = new Date().toISOString();
  await fs.writeFile(
    getDeckJsonPath(directory, deckName),
    JSON.stringify(deck, null, 2),
    "utf-8",
  );
}

export async function deckExists(directory, deckName) {
  try {
    await fs.access(getDeckJsonPath(directory, deckName));
    return true;
  } catch {
    return false;
  }
}

export async function slideExists(directory, deckName, slideName) {
  try {
    await fs.access(getSlidePath(directory, deckName, slideName));
    return true;
  } catch {
    return false;
  }
}

export async function listSlideFiles(slidePath) {
  try {
    return await fs.readdir(slidePath);
  } catch {
    return [];
  }
}

export function formatSlides(slides) {
  if (slides.length === 0) return "(empty)";
  return slides.map((s, i) => `  ${i}: ${s}`).join("\n");
}
