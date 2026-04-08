const fs = require("node:fs/promises");
const path = require("node:path");
const cheerio = require("cheerio");

function slugify(input) {
  return String(input)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function extractLogos(html) {
  const $ = cheerio.load(html, { decodeEntities: false });
  const wrappers = $(".wrapper-images-symbol_logos.w-dyn-items");
  if (!wrappers.length) throw new Error("Could not find logo marquee wrappers.");

  const seen = new Set();
  const logos = [];

  wrappers.first().children("div[role='listitem'].w-dyn-item").each((_, el) => {
    const img = $(el).find("img.image-logo-new").first();
    const src = img.attr("src")?.trim() || "";
    const alt = img.attr("alt")?.trim() || "";
    if (!src) return;
    const id = slugify((alt.split(" - ")[0] || alt) || path.basename(src));
    if (seen.has(src)) return;
    seen.add(src);
    logos.push({ id, src, alt });
  });

  return logos;
}

async function main() {
  const root = process.cwd();
  const enPath = path.join(root, "public", "index.html");
  const outPath = path.join(root, "data", "logos.json");

  const enHtml = await fs.readFile(enPath, "utf8");
  const logos = extractLogos(enHtml);

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify({ version: 1, logos }, null, 2) + "\n", "utf8");

  process.stdout.write(`Bootstrapped ${logos.length} logos into data/logos.json.\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

