#!/usr/bin/env node
// End-to-end smoke test for the standalone ppt skill scripts.
//
// Spins up a temp project dir, drives deck.mjs / screenshot.mjs / export.mjs
// via spawnSync, asserts files appeared and tags ([Done], etc.) showed up,
// then cleans up. No LLM in the loop — just verifies the scripts work.
//
// Run from anywhere:
//   node skills/ppt/test/smoke.mjs

import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { inflateRawSync } from "node:zlib";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = path.resolve(__dirname, "..");
const SCRIPTS = path.join(SKILL_ROOT, "scripts");

const HAS_PLAYWRIGHT = await (async () => {
  try {
    await import("playwright-core");
    return true;
  } catch {
    return false;
  }
})();

const HAS_PPTXGEN = await (async () => {
  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    req.resolve("pptxgenjs");
    return true;
  } catch {
    return false;
  }
})();

const HAS_HTML2PPTX_PRO = await (async () => {
  try {
    const { createRequire } = await import("node:module");
    const req = createRequire(import.meta.url);
    req.resolve("html2pptx-pro");
    return true;
  } catch {
    return false;
  }
})();

let pass = 0;
let fail = 0;
const log = (s) => process.stdout.write(s + "\n");

function step(name, ok, detail) {
  if (ok) {
    pass++;
    log(`  PASS  ${name}` + (detail ? `  (${detail})` : ""));
  } else {
    fail++;
    log(`  FAIL  ${name}` + (detail ? `  (${detail})` : ""));
  }
}

function run(scriptName, args, cwd) {
  const r = spawnSync(
    process.execPath,
    [path.join(SCRIPTS, scriptName), ...args],
    { cwd, encoding: "utf-8", env: { ...process.env, PPT_DEBUG: "" } },
  );
  return {
    code: r.status ?? -1,
    stdout: r.stdout || "",
    stderr: r.stderr || "",
  };
}

const MIN_SLIDE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Smoke Test Slide</title>
<style>
  html, body { margin: 0; padding: 0; width: 1280px; height: 720px; overflow: hidden; background: #0b1d3a; color: #fff; font: 24px system-ui, sans-serif; }
  body { display: flex; align-items: center; justify-content: center; }
  h1 { font-size: 64px; margin: 0; letter-spacing: -1px; }
</style>
</head>
<body>
  <h1>Hello from ppt skill smoke test</h1>
  <script type="application/json" id="ppt-speaker-notes-json">"This is a smoke-test slide."</script>
  <script>window.__PPT_READY__ = true;</script>
</body>
</html>
`;

async function main() {
  log("ppt skill smoke test");
  log(`  skill root:        ${SKILL_ROOT}`);
  log(`  playwright-core:   ${HAS_PLAYWRIGHT ? "installed" : "MISSING"}`);
  log(`  pptxgenjs:         ${HAS_PPTXGEN ? "installed" : "MISSING"}`);
  log(`  html2pptx-pro:     ${HAS_HTML2PPTX_PRO ? "installed" : "MISSING"}`);

  const tmp = await fs.mkdtemp(path.join(tmpdir(), "ppt-smoke-"));
  log(`  tmp project root:  ${tmp}`);
  log("");

  try {
    // 1. deck init
    {
      const r = run("deck.mjs", ["init", "demo"], tmp);
      const ok =
        r.code === 0 &&
        /\[Done\] Created deck "demo"/.test(r.stdout) &&
        (await fs.stat(path.join(tmp, ".pptwork", "demo", "deck.json"))
          .then(() => true)
          .catch(() => false));
      const deckJson = ok
        ? JSON.parse(await fs.readFile(path.join(tmp, ".pptwork", "demo", "deck.json"), "utf-8"))
        : null;
      step("deck.mjs init demo",
        ok && deckJson.exportMode === "editable",
        ok ? `deck.json exportMode=${deckJson.exportMode}` : `code=${r.code} ${r.stdout.split("\n")[0]}`);
    }

    // 1b. deck init with editable preference
    {
      const r = run("deck.mjs", ["init", "editable-demo", "--mode", "editable"], tmp);
      const deckJson = await fs
        .readFile(path.join(tmp, ".pptwork", "editable-demo", "deck.json"), "utf-8")
        .then((s) => JSON.parse(s))
        .catch(() => null);
      step("deck.mjs init editable-demo --mode editable",
        r.code === 0 && deckJson?.exportMode === "editable",
        deckJson ? `exportMode=${deckJson.exportMode}` : `code=${r.code}`);
    }

    // 2. init-slide
    {
      const r = run("deck.mjs", ["init-slide", "demo", "cover"], tmp);
      const designOk = await fs
        .stat(path.join(tmp, ".pptwork", "demo", "cover", "design.md"))
        .then(() => true)
        .catch(() => false);
      const deckJson = JSON.parse(
        await fs.readFile(path.join(tmp, ".pptwork", "demo", "deck.json"), "utf-8"),
      );
      const ok =
        r.code === 0 &&
        /\[Done\] Created slide "cover"/.test(r.stdout) &&
        designOk &&
        deckJson.slides.length === 1 &&
        deckJson.slides[0] === "cover";
      step("deck.mjs init-slide demo cover", ok,
        ok ? "design.md created, deck.json.slides=[cover]" : `code=${r.code} stdout=${r.stdout.slice(0, 200)}`);
    }

    // 3. write minimal slide.html
    const slideHtmlPath = path.join(tmp, ".pptwork", "demo", "cover", "slide.html");
    await fs.writeFile(slideHtmlPath, MIN_SLIDE_HTML, "utf-8");
    step("write minimal slide.html", true, `${MIN_SLIDE_HTML.length} bytes`);

    // 4. screenshot
    if (!HAS_PLAYWRIGHT) {
      step("screenshot.mjs demo cover", false, "playwright-core not installed; run `npm install` in skills/ppt");
    } else {
      const r = run("screenshot.mjs", ["demo", "cover"], tmp);
      const thumbPath = path.join(tmp, ".pptwork", "demo", "cover", "thumbnail.png");
      const stat = await fs.stat(thumbPath).catch(() => null);
      const ok =
        r.code === 0 &&
        /\[Done\] Re-rendered slide PNG\./.test(r.stdout) &&
        stat &&
        stat.size > 1000; // PNG should be at least 1KB
      step("screenshot.mjs demo cover", ok,
        ok ? `thumbnail.png ${stat.size} bytes` :
          `code=${r.code} stderr=${r.stderr.slice(0, 200)} stdout=${r.stdout.slice(0, 200)}`);
    }

    // 5a. export (default = editable via html2pptx-pro)
    if (!HAS_PLAYWRIGHT || !HAS_PPTXGEN || !HAS_HTML2PPTX_PRO) {
      step("export.mjs demo (default editable)", false, "missing dependency: " +
        [HAS_PLAYWRIGHT ? null : "playwright-core", HAS_PPTXGEN ? null : "pptxgenjs", HAS_HTML2PPTX_PRO ? null : "html2pptx-pro"].filter(Boolean).join(", "));
      step("export.mjs demo --mode editable", false, "skipped (deps missing)");
    } else {
      const r = run("export.mjs", ["demo"], tmp);
      const pptxPath = path.join(tmp, ".pptwork", "demo", "demo.pptx");
      const stat = await fs.stat(pptxPath).catch(() => null);
      const ok =
        r.code === 0 &&
        /\[Done\] Exported 1 slide/.test(r.stdout) &&
        /\[Mode\] editable/.test(r.stdout) &&
        stat &&
        stat.size > 5000;
      step("export.mjs demo (default editable)", ok,
        ok ? `demo.pptx ${stat.size} bytes (editable)` :
          `code=${r.code} stderr=${r.stderr.slice(0, 200)} stdout=${r.stdout.slice(0, 200)}`);

      // 5b. export editable (opt-in)
      const r2 = run("export.mjs", ["demo", "--mode", "editable", "--output", "demo-editable.pptx"], tmp);
      const pptx2 = path.join(tmp, "demo-editable.pptx");
      const stat2 = await fs.stat(pptx2).catch(() => null);
      const ok2 =
        r2.code === 0 &&
        /\[Mode\] editable/.test(r2.stdout) &&
        stat2 &&
        stat2.size > 5000;
      step("export.mjs demo --mode editable", ok2,
        ok2 ? `demo-editable.pptx ${stat2.size} bytes` :
          `code=${r2.code} stderr=${r2.stderr.slice(0, 200)} stdout=${r2.stdout.slice(0, 200)}`);

      const r3 = run("deck.mjs", ["init-slide", "editable-demo", "cover"], tmp);
      const editableSlideHtmlPath = path.join(tmp, ".pptwork", "editable-demo", "cover", "slide.html");
      await fs.writeFile(editableSlideHtmlPath, MIN_SLIDE_HTML, "utf-8");
      const r4 = run("export.mjs", ["editable-demo", "--output", "editable-demo-default.pptx"], tmp);
      const pptx3 = path.join(tmp, "editable-demo-default.pptx");
      const stat3 = await fs.stat(pptx3).catch(() => null);
      const ok3 =
        r3.code === 0 &&
        r4.code === 0 &&
        /\[Mode\] editable/.test(r4.stdout) &&
        stat3 &&
        stat3.size > 5000;
      step("export.mjs uses deck exportMode when --mode omitted", ok3,
        ok3 ? `editable-demo-default.pptx ${stat3.size} bytes` :
          `init=${r3.code} export=${r4.code} stdout=${r4.stdout.slice(0, 200)}`);
    }

    // 6. delete (cleanup-via-cli sanity)
    {
      const r = run("deck.mjs", ["delete", "demo", "cover"], tmp);
      const ok = r.code === 0 && /\[Done\] Deleted 1 slide/.test(r.stdout);
      step("deck.mjs delete demo cover", ok, ok ? "" : `code=${r.code} ${r.stdout.split("\n")[0]}`);
    }
  } finally {
    await fs.rm(tmp, { recursive: true, force: true }).catch(() => {});
  }

  log("");
  log(`Result: ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  log("FATAL: " + (e?.stack || e?.message || String(e)));
  process.exit(1);
});
