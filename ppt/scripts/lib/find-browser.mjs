// Resolve a local Chrome / Chromium / Edge executable. Falls back to env var
// override (PPT_BROWSER_EXECUTABLE / PPT_BROWSER_EXECUTABLE) and platform
// defaults. Returns null when nothing is found — caller should let
// playwright-core launch its bundled chromium (after `npx playwright install`).

import fs from "node:fs/promises";

const CHROME_PATHS_LINUX = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
  "/snap/bin/chromium",
];

const CHROME_PATHS_DARWIN = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
];

const CHROME_PATHS_WIN32 = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
];

export function getBrowserCandidatePaths(platform) {
  return platform === "darwin"
    ? CHROME_PATHS_DARWIN
    : platform === "win32"
      ? CHROME_PATHS_WIN32
      : CHROME_PATHS_LINUX;
}

export async function findBrowserHint() {
  const envPath =
    process.env.PPT_BROWSER_EXECUTABLE?.trim() ||
    process.env.PPT_BROWSER_EXECUTABLE?.trim();
  if (envPath) {
    try {
      await fs.access(envPath);
      return envPath;
    } catch {
      // env var set but path invalid — fall through
    }
  }
  for (const p of getBrowserCandidatePaths(process.platform)) {
    try {
      await fs.access(p);
      return p;
    } catch {
      // try next
    }
  }
  return null;
}
