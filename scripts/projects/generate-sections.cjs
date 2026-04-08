const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");
const { PATHS, MARKERS } = require("./lib/constants.cjs");
const { ProjectsFile } = require("./lib/schema.cjs");
const { replaceBetweenMarkers } = require("./lib/html-markers.cjs");
const { renderProjectsSlides } = require("./lib/render-projects-section.cjs");

async function readJson(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  return JSON.parse(raw);
}

async function readHtml(filePath) {
  return await fs.readFile(filePath, "utf8");
}

function sortProjects(projects) {
  // Featured first, then year desc, then month desc, then title.
  return [...projects].sort((a, b) => {
    const af = Boolean(a.featured);
    const bf = Boolean(b.featured);
    if (af !== bf) return af ? -1 : 1;
    if (a.year !== b.year) return b.year - a.year;
    const am = Number.isFinite(a.month) ? a.month : 0;
    const bm = Number.isFinite(b.month) ? b.month : 0;
    if (am !== bm) return bm - am;
    return a.titleLine.localeCompare(b.titleLine);
  });
}

async function readImageWidthFromPublicPath(publicUrlPath) {
  if (!publicUrlPath) return null;
  if (typeof publicUrlPath !== "string") return null;
  if (!publicUrlPath.startsWith("/")) return null;

  const pathname = publicUrlPath.split("?")[0].split("#")[0];
  const abs = path.join(process.cwd(), "public", pathname);

  try {
    const meta = await sharp(abs).metadata();
    const width = Number.isFinite(meta?.width) ? meta.width : null;
    const height = Number.isFinite(meta?.height) ? meta.height : null;
    return { width, height };
  } catch {
    return null;
  }
}

async function enrichProjectsWithDesktopWidths(projects) {
  const out = [];
  for (const p of projects) {
    const bg = p?.images?.desktopFull?.backgroundImageUrl || "";
    const meta = await readImageWidthFromPublicPath(bg);
    out.push({
      ...p,
      images: {
        ...p.images,
        desktopFull: {
          ...p.images.desktopFull,
          ...(Number.isFinite(meta?.width) ? { width: meta.width } : {}),
          ...(Number.isFinite(meta?.height) ? { height: meta.height } : {}),
        },
      },
    });
  }
  return out;
}

async function generateOne({ htmlPath, locale, projects }) {
  const html = await readHtml(htmlPath);
  const slides = renderProjectsSlides({ locale, projects });

  const updated = replaceBetweenMarkers(
    html,
    { start: MARKERS.projectsStart, end: MARKERS.projectsEnd },
    slides,
  );

  await fs.writeFile(htmlPath, updated, "utf8");
}

async function main() {
  const data = await readJson(PATHS.dataFile);
  const parsed = ProjectsFile.safeParse(data);
  if (!parsed.success) {
    process.stderr.write(`${parsed.error}\n`);
    process.exit(1);
  }

  const projectsSorted = sortProjects(parsed.data.projects);
  const projects = await enrichProjectsWithDesktopWidths(projectsSorted);

  await fs.mkdir(path.dirname(PATHS.enHtml), { recursive: true });
  await generateOne({ htmlPath: PATHS.enHtml, locale: "en", projects });
  await generateOne({ htmlPath: PATHS.frHtml, locale: "fr", projects });

  process.stdout.write(
    `Generated Projects section for EN/FR (${projects.length} projects).\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

