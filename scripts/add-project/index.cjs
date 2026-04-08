const fs = require("node:fs/promises");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { PATHS } = require("../projects/lib/constants.cjs");
const { ProjectsFile } = require("../projects/lib/schema.cjs");
const { captureDesktopFullPage, captureMobileViewport } = require("./lib/capture.cjs");
const { toAvif, generateResponsiveAvifs } = require("./lib/images.cjs");
const { withPrompts, askText, askChoice } = require("./lib/prompt.cjs");
const { chromium, devices } = require("playwright");
const cheerio = require("cheerio");
const sharp = require("sharp");

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function downloadToFile(url, outPath) {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) throw new Error(`Failed to download ${url}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, buf);
}

function parseArgs(argv) {
  const args = {
    url: "",
    titleLine: "",
    year: "",
    month: "",
    statusLabel: "",
    companyType: "",
    designerName: "",
    designerUrl: "",
    logoUrl: "",
    logoSvg: "",
    logoAlt: "",
    featured: false,
    nonInteractive: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const next = argv[i + 1] || "";
    if (a === "--url") args.url = next;
    if (a === "--title") args.titleLine = next;
    if (a === "--year") args.year = next;
    if (a === "--month") args.month = next;
    if (a === "--status") args.statusLabel = next; // released|working_since
    if (a === "--type") args.companyType = next; // enum values
    if (a === "--designer-name") args.designerName = next;
    if (a === "--designer-url") args.designerUrl = next;
    if (a === "--logo-url") args.logoUrl = next;
    if (a === "--logo-svg") args.logoSvg = next;
    if (a === "--logo-alt") args.logoAlt = next;
    if (a === "--featured") args.featured = true;
    if (a === "--non-interactive") args.nonInteractive = true;
  }
  return args;
}

async function extractNavbarLogo({ url }) {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ...devices["Desktop Chrome"] });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    await page.waitForTimeout(1200);

    const detected = await page.evaluate(() => {
      const roots = [
        document.querySelector("header"),
        document.querySelector("nav"),
        document.querySelector("[role='navigation']"),
      ].filter(Boolean);

      const findInlineSvg = (root) => root?.querySelector("svg")?.outerHTML || null;
      const findImg = (root) => {
        const img = root?.querySelector("img");
        if (!img?.src) return null;
        return { src: img.src, alt: img.alt || "" };
      };

      for (const r of roots) {
        const s = findInlineSvg(r);
        if (s) return { kind: "svg_inline", svg: s };
      }
      const anySvg = document.querySelector("svg");
      if (anySvg) return { kind: "svg_inline", svg: anySvg.outerHTML };

      for (const r of roots) {
        const i = findImg(r);
        if (i) return { kind: "img_url", url: i.src, alt: i.alt };
      }
      const anyImg = document.querySelector("img");
      if (anyImg?.src) return { kind: "img_url", url: anyImg.src, alt: anyImg.alt || "" };
      return null;
    });

    return detected;
  } finally {
    await browser.close();
  }
}

async function loadProjectsFile() {
  const raw = await fs.readFile(PATHS.dataFile, "utf8");
  const json = JSON.parse(raw);
  const parsed = ProjectsFile.safeParse(json);
  if (!parsed.success) {
    throw new Error(String(parsed.error));
  }
  return parsed.data;
}

async function saveProjectsFile(data) {
  await fs.writeFile(PATHS.dataFile, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function readImageDimensions(absPath) {
  try {
    const meta = await sharp(absPath).metadata();
    const width = Number.isFinite(meta?.width) ? meta.width : null;
    const height = Number.isFinite(meta?.height) ? meta.height : null;
    return { width, height };
  } catch {
    return null;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  await withPrompts(async (rl) => {
    const url = args.nonInteractive
      ? args.url
      : await askText({
          rl,
          label: "Project URL",
          defaultValue: args.url,
        });
    if (!url) throw new Error("Missing URL (use --url or answer the prompt).");

    const titleLine = args.nonInteractive
      ? args.titleLine
      : await askText({
          rl,
          label: "Title line (H3)",
          defaultValue: args.titleLine || "",
        });
    const yearRaw = args.nonInteractive
      ? args.year || String(new Date().getFullYear())
      : await askText({
          rl,
          label: "Year (YYYY)",
          defaultValue: args.year || String(new Date().getFullYear()),
        });
    const year = Number.parseInt(yearRaw, 10);

    const monthRaw = args.nonInteractive
      ? (args.month || "")
      : await askText({
          rl,
          label: "Month (1-12, optional)",
          defaultValue: args.month || "",
        });
    const month = monthRaw ? Number.parseInt(monthRaw, 10) : NaN;

    const statusLabel = args.nonInteractive
      ? (args.statusLabel || "released")
      : await askChoice({
          rl,
          label: "Date label",
          choices: [
            { id: "released", label: "Released in / Sortie en" },
            { id: "working_since", label: "Working on since / En cours depuis" },
          ],
          defaultId: (args.statusLabel || "released"),
        });

    const companyType = args.nonInteractive
      ? (args.companyType || "other")
      : await askChoice({
          rl,
          label: "Company type",
          choices: [
            { id: "startup_b2b", label: "Startup B2B" },
            { id: "startup_b2c", label: "Startup B2C" },
            { id: "agency", label: "Agency" },
            { id: "vc", label: "VC" },
            { id: "saas", label: "SaaS" },
            { id: "enterprise", label: "Enterprise" },
            { id: "ngo", label: "NGO" },
            { id: "other", label: "Other" },
          ],
          defaultId: (args.companyType || "startup_b2b"),
        });

    const designerName = args.nonInteractive
      ? (args.designerName || "")
      : await askText({
          rl,
          label: "Designer name (optional)",
          defaultValue: args.designerName || "",
        });
    const designerUrl = args.nonInteractive
      ? (args.designerUrl || "")
      : designerName
        ? await askText({
            rl,
            label: "Designer URL",
            defaultValue: args.designerUrl || "",
          })
        : "";

    const logoMode = args.nonInteractive
      ? (args.logoSvg ? "svg" : "url")
      : await askChoice({
          rl,
          label: "Client logo (required)",
          choices: [
            { id: "url", label: "Paste a logo URL" },
            { id: "svg", label: "Paste SVG code" },
          ],
          defaultId: args.logoSvg ? "svg" : "url",
        });

    const effectiveLogoUrl =
      logoMode === "url"
        ? (args.nonInteractive
            ? (args.logoUrl || "").trim()
            : (await askText({
                rl,
                label: "Client logo URL",
                defaultValue: (args.logoUrl || "").trim(),
              })).trim())
        : "";

    const inlineSvg =
      logoMode === "svg"
        ? (args.nonInteractive
            ? (args.logoSvg || "").trim()
            : await askText({
                rl,
                label:
                  "SVG code (paste a single line; if your SVG has multiple lines, paste a minified version)",
                defaultValue: (args.logoSvg || "").trim(),
              }))
        : "";

    if (logoMode === "url" && !effectiveLogoUrl) {
      throw new Error("Missing logo URL (use --logo-url or paste it when prompted).");
    }
    if (logoMode === "svg" && !inlineSvg) {
      throw new Error("Missing SVG code (use --logo-svg or paste it when prompted).");
    }

    const logoAlt =
      args.nonInteractive
        ? (args.logoAlt || `${titleLine || id}`)
        : await askText({
            rl,
            label: "Logo alt text",
            defaultValue: args.logoAlt || `${titleLine || id}`,
          });

    const featured = args.nonInteractive
      ? Boolean(args.featured)
      : (await askChoice({
          rl,
          label: "Featured project?",
          choices: [
            { id: "yes", label: "Yes (pin to top)" },
            { id: "no", label: "No" },
          ],
          defaultId: args.featured ? "yes" : "no",
        })) === "yes";

    const id = slugify(titleLine || url);

    const tmpDir = path.join(process.cwd(), ".tmp", "add-project", id);
    const rawDesktopPng = path.join(tmpDir, "desktop-full.png");
    const rawMobilePng = path.join(tmpDir, "mobile-viewport.png");

    const assetsDir = path.join(process.cwd(), "public", "assets", "images");
    const desktopAvif = path.join(assetsDir, `${id}-desktop-full.avif`);
    const mobileAvif = path.join(assetsDir, `${id}-mobile.avif`);

    process.stdout.write("Capturing screenshots...\n");
    await captureDesktopFullPage({ url, outPath: rawDesktopPng });
    await captureMobileViewport({ url, outPath: rawMobilePng });

    process.stdout.write("Converting images to AVIF and generating variants...\n");
    await toAvif({ inputPath: rawDesktopPng, outputPath: desktopAvif, quality: 55 });
    await generateResponsiveAvifs({ inputPath: rawMobilePng, outputBasePath: mobileAvif, quality: 55 });

    const desktopDims = await readImageDimensions(desktopAvif);

    const srcRel = `/assets/images/${path.basename(mobileAvif)}`;
    const sizes = "100vw";
    const srcsetLines = [500, 800, 1080, 1600]
      .map((w) => `/assets/images/${id}-mobile-p-${w}.avif ${w}w`)
      .concat([`/assets/images/${id}-mobile.avif 2000w`])
      .join(",\n");

    const project = {
      id,
      url,
      titleLine: titleLine || id,
      featured,
      companyType,
      statusLabel,
      year: Number.isFinite(year) ? year : new Date().getFullYear(),
      ...(Number.isFinite(month) && month >= 1 && month <= 12 ? { month } : {}),
      ...(designerName && designerUrl
        ? { designer: { name: designerName, url: designerUrl } }
        : {}),
      contributions: [],
      images: {
        mobile: {
          src: srcRel,
          srcset: srcsetLines,
          sizes,
          alt: "Website screenshot",
        },
        desktopFull: {
          backgroundImageUrl: `/assets/images/${path.basename(desktopAvif)}`,
          ...(Number.isFinite(desktopDims?.width) ? { width: desktopDims.width } : {}),
          ...(Number.isFinite(desktopDims?.height) ? { height: desktopDims.height } : {}),
        },
      },
    };

    const data = await loadProjectsFile();
    const withoutSameId = data.projects.filter((p) => p.id !== id);
    data.projects = [project, ...withoutSameId];
    await saveProjectsFile(data);

    process.stdout.write(`Added project "${project.id}" to data/projects.json.\n`);

    const effectiveLogoAlt = (logoAlt || titleLine || id).trim();

    process.stdout.write("Adding logo to marquee...\n");
    const logosAssetsDir = path.join(process.cwd(), "public", "assets", "images");
    const extGuess = (() => {
      if (!effectiveLogoUrl) return ".png";
      try {
        const u = new URL(effectiveLogoUrl);
        const ext = path.extname(u.pathname);
        return ext || ".png";
      } catch {
        return ".png";
      }
    })();
    const logoFilename = inlineSvg ? `${id}-logo.svg` : `${id}-logo${extGuess}`;
    const logoAbs = path.join(logosAssetsDir, logoFilename);

    if (inlineSvg) {
      const $ = cheerio.load(inlineSvg, { decodeEntities: false });
      const svgEl = $("svg").first();
      const normalized = svgEl.length ? $.html(svgEl) : inlineSvg;
      await fs.mkdir(path.dirname(logoAbs), { recursive: true });
      await fs.writeFile(logoAbs, normalized, "utf8");
    } else {
      await downloadToFile(effectiveLogoUrl, logoAbs);
    }

    const logosPath = path.join(process.cwd(), "data", "logos.json");
    let logosData = { version: 1, logos: [] };
    try {
      logosData = JSON.parse(await fs.readFile(logosPath, "utf8"));
    } catch {
      // ignore
    }
    const rel = `/assets/images/${logoFilename}`;
    const nextEntry = { id, src: rel, alt: effectiveLogoAlt };
    const existing = Array.isArray(logosData.logos) ? logosData.logos : [];
    logosData.logos = [nextEntry, ...existing.filter((l) => l.src !== rel)];
    await fs.mkdir(path.dirname(logosPath), { recursive: true });
    await fs.writeFile(logosPath, JSON.stringify(logosData, null, 2) + "\n", "utf8");

    const logosRes = spawnSync("npm", ["run", "logos:generate"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (logosRes.status !== 0) throw new Error("logos:generate failed.");

    process.stdout.write("Regenerating EN/FR HTML...\n");
    const res = spawnSync("npm", ["run", "projects:generate"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });
    if (res.status !== 0) {
      throw new Error("projects:generate failed.");
    }

    process.stdout.write("Done.\n");
  });
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

