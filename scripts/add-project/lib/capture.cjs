const fs = require("node:fs/promises");
const path = require("node:path");
const { chromium, devices } = require("playwright");

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function bestEffortAcceptCookies(page) {
  // Try common consent buttons in FR/EN.
  const candidates = [
    /^(accept|accept all|allow all|i agree|agree|got it|ok|okay)$/i,
    /^(tout accepter|accepter|j'accepte|je\s+comprends|ok)$/i,
    /^(rejeter|refuser|decline)$/i, // sometimes only two-step; we won't click this by default
  ];

  // Prefer "accept all" style; avoid reject/decline unless it's the only visible action.
  const prefer = [/accept all/i, /tout accepter/i, /^accept$/i, /^accepter$/i, /i agree/i];

  async function clickFirstMatching(names) {
    for (const re of names) {
      const btn = page.getByRole("button", { name: re }).first();
      try {
        if (await btn.isVisible({ timeout: 800 })) {
          await btn.click({ timeout: 1500 });
          return true;
        }
      } catch {
        // ignore
      }
    }
    return false;
  }

  // First pass: click preferred accept buttons.
  if (await clickFirstMatching(prefer)) return true;

  // Second pass: broader matching.
  for (const re of candidates) {
    if (re.source.includes("rejeter") || re.source.includes("decline")) continue;
    const ok = await clickFirstMatching([re]);
    if (ok) return true;
  }

  // Some cookie UIs use <a> elements styled as buttons.
  for (const re of [...prefer, /accept/i, /accepter/i]) {
    const link = page.getByRole("link", { name: re }).first();
    try {
      if (await link.isVisible({ timeout: 800 })) {
        await link.click({ timeout: 1500 });
        return true;
      }
    } catch {
      // ignore
    }
  }

  return false;
}

async function hideConsentOverlays(page) {
  await page.addStyleTag({
    content: `
/* Hide common consent overlays if they remain after clicking. */
[id*="cookie" i],
[class*="cookie" i],
[id*="consent" i],
[class*="consent" i],
[id*="cmp" i],
[class*="cmp" i],
[id*="onetrust" i],
[class*="onetrust" i],
[id*="tarteaucitron" i],
[class*="tarteaucitron" i],
[id*="didomi" i],
[class*="didomi" i],
[id*="quantcast" i],
[class*="quantcast" i] {
  /* Don't blanket-hide everything; only typical overlays. */
}
div[id*="cookie" i][style*="position: fixed" i],
div[class*="cookie" i][style*="position: fixed" i],
div[id*="consent" i][style*="position: fixed" i],
div[class*="consent" i][style*="position: fixed" i],
div[id*="cmp" i][style*="position: fixed" i],
div[class*="cmp" i][style*="position: fixed" i],
div[id*="onetrust" i],
div[class*="onetrust" i],
div[id*="didomi" i],
div[class*="didomi" i],
div[id*="tarteaucitron" i],
div[class*="tarteaucitron" i],
div[id*="quantcast" i],
div[class*="quantcast" i] {
  display: none !important;
  visibility: hidden !important;
  opacity: 0 !important;
  pointer-events: none !important;
}
`,
  });
}

async function waitForImagesToLoad(page, { timeoutMs = 15_000 } = {}) {
  await page.waitForFunction(
    () => {
      const imgs = Array.from(document.images || []);
      // Only require images that are in/near viewport to be loaded.
      const vh = window.innerHeight || 0;
      const vw = window.innerWidth || 0;
      const inView = (img) => {
        const r = img.getBoundingClientRect?.();
        if (!r) return true;
        const verticallyNear = r.bottom >= -0.5 * vh && r.top <= 1.5 * vh;
        const horizontallyNear = r.right >= -0.5 * vw && r.left <= 1.5 * vw;
        return verticallyNear && horizontallyNear;
      };
      const relevant = imgs.filter(inView);
      return relevant.every((img) => img.complete && img.naturalWidth > 0);
    },
    { timeout: timeoutMs },
  );
}

async function triggerLazyLoadByScrolling(page, { maxScrolls = 14 } = {}) {
  // Scroll down in steps to trigger intersection observers / lazy loaders.
  for (let i = 0; i < maxScrolls; i += 1) {
    await page.evaluate((step) => {
      const h = Math.max(
        document.body?.scrollHeight || 0,
        document.documentElement?.scrollHeight || 0,
      );
      const y = Math.min(h, (window.innerHeight || 0) * (step + 1));
      window.scrollTo(0, y);
    }, i);
    await page.waitForTimeout(350);
  }
  // Back to top for final capture.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(350);
}

async function prepareForScreenshot(page) {
  // Reduce motion and avoid sticky focus rings, etc.
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Ensure top-of-page.
  try {
    await page.evaluate(() => window.scrollTo(0, 0));
  } catch {
    // ignore
  }

  // Best-effort wait for page to settle.
  try {
    await page.waitForLoadState("load", { timeout: 15_000 });
  } catch {
    // ignore
  }
  try {
    await page.waitForLoadState("networkidle", { timeout: 8_000 });
  } catch {
    // ignore (many sites keep long connections)
  }

  // Try cookies accept (may trigger additional network requests).
  const accepted = await bestEffortAcceptCookies(page);
  if (accepted) {
    try {
      await page.waitForLoadState("networkidle", { timeout: 8_000 });
    } catch {
      // ignore
    }
  }

  // Hide remaining overlays (if any).
  await hideConsentOverlays(page);

  // Wait for fonts to avoid FOUT in screenshots.
  try {
    await page.evaluate(async () => {
      // @ts-ignore
      if (document.fonts?.ready) {
        // @ts-ignore
        await document.fonts.ready;
      }
    });
  } catch {
    // ignore
  }

  // Trigger lazy loading and wait for images to be ready.
  await triggerLazyLoadByScrolling(page);
  try {
    await waitForImagesToLoad(page, { timeoutMs: 12_000 });
  } catch {
    // ignore (some pages have broken images / placeholders)
  }

  // Small buffer for layout after dismissals.
  await page.waitForTimeout(1000);
}

async function captureDesktopFullPage({ url, outPath, viewport = { width: 1440, height: 900 } }) {
  await ensureDir(path.dirname(outPath));
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    // Some sites keep long-running requests (analytics, SSE, etc.) which prevents "networkidle".
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await prepareForScreenshot(page);
    await page.screenshot({ path: outPath, fullPage: true });
  } finally {
    await browser.close();
  }
}

async function captureMobileViewport({ url, outPath, deviceName = "iPhone 15" }) {
  await ensureDir(path.dirname(outPath));
  const browser = await chromium.launch();
  try {
    const device = devices[deviceName];
    if (!device) throw new Error(`Unknown Playwright device: ${deviceName}`);
    const context = await browser.newContext({ ...device });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await prepareForScreenshot(page);
    await page.screenshot({ path: outPath, fullPage: false });
  } finally {
    await browser.close();
  }
}

module.exports = { captureDesktopFullPage, captureMobileViewport };

