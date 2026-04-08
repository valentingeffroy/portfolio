const fs = require("node:fs/promises");
const path = require("node:path");
const cheerio = require("cheerio");
const { PATHS, MARKERS } = require("./lib/constants.cjs");

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function guessCompanyType(titleLine) {
  const t = titleLine.toLowerCase();
  if (t.includes("vc")) return "vc";
  if (t.includes("agency")) return "agency";
  if (t.includes("startup")) return "startup_b2b";
  return "other";
}

function parseStatusAndYear($slide) {
  const labelNodes = $slide.find(".tag_project.release-date > div");
  const label1 = cheerio.load("<root></root>")("root");
  // Determine which label is visible by class name.
  const first = labelNodes.eq(0);
  const second = labelNodes.eq(1);
  const yearText = labelNodes.eq(2).text().trim();
  const year = Number.parseInt(yearText, 10);

  const firstInvisible = first.hasClass("w-condition-invisible");
  const secondInvisible = second.hasClass("w-condition-invisible");

  let statusLabel = "released";
  if (firstInvisible && !secondInvisible) statusLabel = "working_since";
  else if (!firstInvisible && secondInvisible) statusLabel = "released";

  return { statusLabel, year: Number.isFinite(year) ? year : 2024 };
}

function parseDesigner($slide) {
  const link = $slide.find(".project_mentions a").first();
  if (!link.length) return null;
  const name = link.text().trim();
  const url = link.attr("href")?.trim();
  if (!name || !url) return null;
  return { name, url };
}

function parseMobileImage($slide) {
  const img = $slide.find("img.image-mobile_project").first();
  return {
    src: img.attr("src")?.trim() || "",
    srcset: (img.attr("srcset") || "").trim(),
    sizes: img.attr("sizes")?.trim() || "100vw",
    alt: img.attr("alt")?.trim() || "",
  };
}

function parseDesktopBg($slide) {
  const bg = $slide.find(".image-bg_project").first();
  const style = bg.attr("style") || "";
  const m = style.match(
    /background-image:\s*url\(\s*(?:&quot;|")?([^)"&]+)(?:&quot;|")?\s*\)/i,
  );
  return { backgroundImageUrl: m?.[1] ? m[1].trim() : "" };
}

function extractSlidesFromHtml(html) {
  const $ = cheerio.load(html, { decodeEntities: false });

  const wrapper = $(".swiper-wrapper.basic-slider-list.w-dyn-items").first();
  if (!wrapper.length) {
    throw new Error("Could not find projects swiper wrapper.");
  }

  const slides = wrapper.children(".swiper-slide.w-dyn-item");
  if (!slides.length) {
    throw new Error("Could not find any slides inside the wrapper.");
  }

  const projects = [];

  slides.each((_, el) => {
    const $slide = $(el);
    const url = $slide.find("a.link__project").attr("href")?.trim() || "";
    const titleLine = $slide.find("h3").first().text().trim();
    const { statusLabel, year } = parseStatusAndYear($slide);
    const designer = parseDesigner($slide);
    const images = {
      mobile: parseMobileImage($slide),
      desktopFull: parseDesktopBg($slide),
    };

    const id = slugify(titleLine.split(" - ")[0] || titleLine || url);

    projects.push({
      id,
      url,
      titleLine,
      companyType: guessCompanyType(titleLine),
      statusLabel,
      year,
      ...(designer ? { designer } : {}),
      contributions: [],
      images,
    });
  });

  return projects;
}

function injectMarkersAroundWrapper(html) {
  if (html.includes(MARKERS.projectsStart) && html.includes(MARKERS.projectsEnd)) {
    return html;
  }

  const needle = 'class="swiper-wrapper basic-slider-list w-dyn-items"';
  const idx = html.indexOf(needle);
  if (idx === -1) throw new Error("Could not locate swiper wrapper to inject markers.");

  // Insert start marker right after the opening wrapper tag.
  const openTagEnd = html.indexOf(">", idx);
  if (openTagEnd === -1) throw new Error("Invalid HTML around swiper wrapper.");

  // Find closing wrapper div corresponding to the first wrapper.
  // We keep it simple: split around first occurrence and then locate the next '</div>' that closes wrapper by counting nested divs.
  const before = html.slice(0, openTagEnd + 1);
  const rest = html.slice(openTagEnd + 1);

  // Walk through rest and find matching closing </div> for wrapper.
  let depth = 1;
  let i = 0;
  while (i < rest.length) {
    const nextOpen = rest.indexOf("<div", i);
    const nextClose = rest.indexOf("</div>", i);
    if (nextClose === -1) break;
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth += 1;
      i = nextOpen + 4;
      continue;
    }
    depth -= 1;
    i = nextClose + 6;
    if (depth === 0) {
      const inside = rest.slice(0, i - 6);
      const after = rest.slice(i - 6);
      return `${before}\n${MARKERS.projectsStart}\n${inside}\n${MARKERS.projectsEnd}\n${after}`;
    }
  }

  throw new Error("Could not find end of swiper wrapper to inject markers.");
}

async function main() {
  const enHtmlRaw = await fs.readFile(PATHS.enHtml, "utf8");
  const frHtmlRaw = await fs.readFile(PATHS.frHtml, "utf8");

  const enHtmlWithMarkers = injectMarkersAroundWrapper(enHtmlRaw);
  const frHtmlWithMarkers = injectMarkersAroundWrapper(frHtmlRaw);

  // Extract projects from EN only (same ordering); images/links are same in FR.
  const projects = extractSlidesFromHtml(enHtmlRaw);

  await fs.mkdir(path.dirname(PATHS.dataFile), { recursive: true });
  await fs.writeFile(
    PATHS.dataFile,
    JSON.stringify({ version: 1, projects }, null, 2) + "\n",
    "utf8",
  );

  await fs.writeFile(PATHS.enHtml, enHtmlWithMarkers, "utf8");
  await fs.writeFile(PATHS.frHtml, frHtmlWithMarkers, "utf8");

  process.stdout.write(
    `Bootstrapped ${projects.length} projects into data/projects.json and added markers to EN/FR HTML.\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

