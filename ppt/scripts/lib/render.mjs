// Shared headless rendering helpers used by screenshot.mjs and export.mjs.
// One-shot pattern: each call launches and tears down a browser. Simpler than
// the long-lived worker the OpenCode plugin uses, and good enough for CLI.

import { createServer } from "node:http";
import { createReadStream } from "node:fs";
import { stat, access } from "node:fs/promises";
import { extname, dirname, basename, join, resolve } from "node:path";
import { createRequire } from "node:module";
import { findBrowserHint } from "./find-browser.mjs";

const READY_SIGNAL_TIMEOUT_MS = 5_000;
const FONT_READY_TIMEOUT_MS = 5_000;
const SLIDE_READY_TOTAL_TIMEOUT_MS = 12_000;
export const SLIDE_VIEWPORT = { width: 1280, height: 720 };
const require = createRequire(import.meta.url);

const CONTENT_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

async function loadChromium() {
  try {
    const pw = await import("playwright-core");
    return pw.chromium;
  } catch (e) {
    throw new Error(
      `playwright-core not installed. Run \`npm install\` (or \`bun install\`) inside skills/ppt first. (${e.message})`,
    );
  }
}

function buildLaunchAttempts(executablePath) {
  const attempts = [];
  const seen = new Set();
  const push = (opts, tag) => {
    if (seen.has(tag)) return;
    seen.add(tag);
    attempts.push({ opts, tag });
  };
  if (executablePath) push({ executablePath }, `exec:${executablePath}`);
  push({}, "playwright-bundled");
  push({ channel: "chrome" }, "channel:chrome");
  if (process.platform === "win32" || process.platform === "darwin") {
    push({ channel: "msedge" }, "channel:msedge");
  }
  return attempts;
}

export async function launchBrowser() {
  const chromium = await loadChromium();
  const hint = await findBrowserHint();
  const attempts = buildLaunchAttempts(hint);
  let lastError;
  for (const { opts, tag } of attempts) {
    try {
      const browser = await chromium.launch({ headless: true, ...opts });
      if (process.env.PPT_DEBUG) process.stderr.write(`[ppt] browser launched via: ${tag}\n`);
      return browser;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(
    `Failed to launch browser: ${lastError?.message || lastError}.\n` +
      `Install Chrome/Edge, set PPT_BROWSER_EXECUTABLE, or run \`npx playwright install chromium\`.`,
  );
}

export function startStaticServer(rootDir) {
  const normalizedRoot = resolve(rootDir);
  const server = createServer(async (req, res) => {
    const rawPath = decodeURIComponent((req.url || "/").split("?")[0]);
    const requestPath = rawPath === "/" ? "" : rawPath.replace(/^\/+/, "");
    let target = resolve(normalizedRoot, requestPath);
    if (!target.startsWith(normalizedRoot)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }
    try {
      const s = await stat(target);
      if (s.isDirectory()) target = join(target, "index.html");
      await access(target);
    } catch {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const ext = extname(target).toLowerCase();
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[ext] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    createReadStream(target).pipe(res);
  });
  return new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      res({
        origin: `http://127.0.0.1:${addr.port}`,
        close: () => new Promise((d, f) => server.close((e) => (e ? f(e) : d()))),
      });
    });
  });
}

async function waitForSlideReady(page) {
  // slide.html may set window.__PPT_READY__ = true once fonts/charts settle.
  // Otherwise fall back to networkidle + document.fonts.ready.
  const wait = (async () => {
    try {
      await page.waitForFunction(() => window.__PPT_READY__ === true, {
        timeout: READY_SIGNAL_TIMEOUT_MS,
      });
    } catch {
      try {
        await page.waitForLoadState("networkidle", { timeout: 10_000 });
      } catch {
        /* keep going */
      }
    }
    await page.evaluate((timeoutMs) => {
      const fonts = document.fonts;
      if (!fonts || !fonts.ready) return true;
      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve(true);
        };
        setTimeout(finish, timeoutMs);
        fonts.ready.then(finish, finish);
      });
    }, FONT_READY_TIMEOUT_MS).catch(() => {});
  })();
  await Promise.race([
    wait,
    new Promise((resolve) => setTimeout(resolve, SLIDE_READY_TOTAL_TIMEOUT_MS)),
  ]);
}

async function getBodySize(page) {
  return page.evaluate(() => {
    const style = window.getComputedStyle(document.body);
    return {
      width: Math.max(1, Math.round(parseFloat(style.width) || 0)),
      height: Math.max(1, Math.round(parseFloat(style.height) || 0)),
    };
  });
}

async function openSlidePage(browser, htmlPath, viewport) {
  const resolved = resolve(htmlPath);
  const rootDir = dirname(resolved);
  const fileName = basename(resolved);
  const serve = await startStaticServer(rootDir);
  const page = await browser.newPage({
    viewport: viewport ?? { width: SLIDE_VIEWPORT.width, height: SLIDE_VIEWPORT.height },
    ignoreHTTPSErrors: true,
    deviceScaleFactor: viewport?.deviceScaleFactor ?? 1,
  });
  try {
    await page.goto(`${serve.origin}/${fileName}`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await waitForSlideReady(page);
    const bodySize = await getBodySize(page);
    if (bodySize.width > 0 && bodySize.height > 0) {
      await page.setViewportSize(bodySize);
    }
    return { page, serve, bodySize };
  } catch (e) {
    await page.close().catch(() => {});
    await serve.close().catch(() => {});
    throw e;
  }
}

/**
 * Render slide.html → PNG buffer at 1280x720 by default (LAYOUT_WIDE).
 * Returns { png: Buffer, width, height }.
 */
export async function renderSlideToPng(htmlPath, options = {}) {
  const browser = await launchBrowser();
  let session;
  try {
    session = await openSlidePage(browser, htmlPath, {
      width: SLIDE_VIEWPORT.width,
      height: SLIDE_VIEWPORT.height,
      deviceScaleFactor: options.deviceScaleFactor ?? 1,
    });
    const png = await session.page.screenshot({ type: "png", fullPage: true });
    return { png, width: session.bodySize.width, height: session.bodySize.height };
  } finally {
    if (session) {
      await session.page.close().catch(() => {});
      await session.serve.close().catch(() => {});
    }
    await browser.close().catch(() => {});
  }
}

function resolveHtml2PptxProBundlePath() {
  const mainPath = require.resolve("html2pptx-pro");
  return join(dirname(mainPath), "html2pptx-pro.js");
}

function resolveDomToPptxBundlePath() {
  const mainPath = require.resolve("dom-to-pptx");
  return join(dirname(mainPath), "dom-to-pptx.bundle.js");
}

async function blobToBufferInPage(page, expression, args) {
  const result = await page.evaluate(expression, args);
  return Buffer.from(result.pptxBase64, "base64");
}

export async function renderDeckWithHtml2PptxPro(htmlPaths, outputPath, options = {}) {
  if (!Array.isArray(htmlPaths) || htmlPaths.length === 0) {
    throw new Error("html2pptx-pro export requires at least one slide HTML path");
  }
  const browser = await launchBrowser();
  let page;
  let serve;
  try {
    const firstPath = resolve(htmlPaths[0]);
    const deckRoot = dirname(dirname(firstPath));
    const slideDirs = htmlPaths.map((htmlPath) => {
      const resolved = resolve(htmlPath);
      if (dirname(dirname(resolved)) !== deckRoot) {
        throw new Error("html2pptx-pro export requires slide HTML files under the same deck root");
      }
      return basename(dirname(resolved));
    });
    serve = await startStaticServer(deckRoot);
    page = await browser.newPage({
      viewport: { width: SLIDE_VIEWPORT.width, height: SLIDE_VIEWPORT.height },
      ignoreHTTPSErrors: true,
    });
    await page.goto(`${serve.origin}/${slideDirs[0]}/slide.html`, {
      waitUntil: "domcontentloaded",
      timeout: 30_000,
    });
    await waitForSlideReady(page);
    await page.addScriptTag({ path: resolveHtml2PptxProBundlePath() });
    const buf = await blobToBufferInPage(
      page,
      async ({ slideDirs, selector, options }) => {
        const api = globalThis.html2pptx;
        if (typeof api !== "function") throw new Error("html2pptx-pro bundle did not expose window.html2pptx");
        document.body.innerHTML = "";
        document.body.style.margin = "0";
        document.body.style.overflow = "hidden";
        const elements = [];
        for (const slideDir of slideDirs) {
          const iframe = document.createElement("iframe");
          iframe.src = `/${slideDir}/slide.html`;
          iframe.style.width = "1280px";
          iframe.style.height = "720px";
          iframe.style.border = "0";
          iframe.style.position = "absolute";
          iframe.style.left = "-10000px";
          iframe.style.top = "0";
          document.body.appendChild(iframe);
          await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error(`iframe load timed out: ${slideDir}`)), 30_000);
            iframe.addEventListener("load", () => {
              clearTimeout(timer);
              resolve(true);
            }, { once: true });
          });
          const doc = iframe.contentDocument;
          if (!doc) throw new Error(`cannot access iframe document: ${slideDir}`);
          if (doc.fonts?.ready) {
            await Promise.race([doc.fonts.ready.catch(() => {}), new Promise((resolve) => setTimeout(resolve, 5_000))]);
          }
          elements.push(doc.querySelector(selector || ".slide") || doc.body);
        }
        const pptx = await api(elements, {
          slideLayout: "LAYOUT_WIDE",
          backgroundColor: "#ffffff",
          logging: false,
          skipValidation: true,
          ...(options || {}),
        });
        const blob = await pptx.write({ outputType: "blob" });
        const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunkSize));
        }
        return { pptxBase64: btoa(binary) };
      },
      { slideDirs, selector: options.selector ?? ".slide", options: options.html2PptxProOptions ?? {} },
    );
    const fs = await import("node:fs/promises");
    await fs.writeFile(outputPath, buf);
    return { bytes: buf.length };
  } finally {
    if (page) await page.close().catch(() => {});
    if (serve) await serve.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

export async function renderSlideWithDomToPptx(htmlPath, outputPath, options = {}) {
  const browser = await launchBrowser();
  let session;
  try {
    session = await openSlidePage(browser, htmlPath, { width: SLIDE_VIEWPORT.width, height: SLIDE_VIEWPORT.height });
    await session.page.addScriptTag({ path: resolveDomToPptxBundlePath() });
    const buf = await blobToBufferInPage(
      session.page,
      async ({ selector, options }) => {
        const api = globalThis.domToPptx;
        if (!api || typeof api.exportToPptx !== "function") {
          throw new Error("dom-to-pptx bundle did not expose domToPptx.exportToPptx");
        }
        const blob = await api.exportToPptx(document.querySelector(selector || ".slide") || document.body, {
          fileName: "slide.pptx",
          skipDownload: true,
          autoEmbedFonts: false,
          svgAsVector: true,
          layout: "LAYOUT_WIDE",
          ...(options || {}),
        });
        const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
        let binary = "";
        const chunkSize = 0x8000;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, bytes.slice(i, i + chunkSize));
        }
        return { pptxBase64: btoa(binary) };
      },
      { selector: options.selector ?? ".slide", options: options.domToPptxOptions ?? {} },
    );
    const fs = await import("node:fs/promises");
    await fs.writeFile(outputPath, buf);
    return { bytes: buf.length };
  } finally {
    if (session) {
      await session.page.close().catch(() => {});
      await session.serve.close().catch(() => {});
    }
    await browser.close().catch(() => {});
  }
}

