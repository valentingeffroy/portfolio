const fs = require("node:fs/promises");
const path = require("node:path");
const cheerio = require("cheerio");

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function renderLogoItems(logos) {
  return logos
    .map(
      (l) => `
                            <div role="listitem" class="w-dyn-item">
                              <img
                                loading="lazy"
                                alt="${escapeHtml(l.alt || "")}"
                                src="${escapeHtml(l.src)}"
                                class="image-logo-new"
                              />
                            </div>`,
    )
    .join("\n");
}

async function updateHtml(htmlPath, logos) {
  const html = await fs.readFile(htmlPath, "utf8");
  const $ = cheerio.load(html, { decodeEntities: false });

  const wrappers = $(".wrapper-images-symbol_logos.w-dyn-items");
  if (!wrappers.length) {
    throw new Error(`Could not find logo marquee wrappers in ${htmlPath}`);
  }

  const itemsHtml = renderLogoItems(logos);
  wrappers.each((_, el) => {
    $(el).html("\n" + itemsHtml + "\n                          ");
  });

  await fs.writeFile(htmlPath, $.html(), "utf8");
}

async function main() {
  const root = process.cwd();
  const dataPath = path.join(root, "data", "logos.json");
  const enPath = path.join(root, "public", "index.html");
  const frPath = path.join(root, "public", "fr", "index.html");

  const data = JSON.parse(await fs.readFile(dataPath, "utf8"));
  const logos = Array.isArray(data.logos) ? data.logos : [];

  await updateHtml(enPath, logos);
  await updateHtml(frPath, logos);

  process.stdout.write(`Generated logo marquee (EN/FR) with ${logos.length} logos.\n`);
}

main().catch((err) => {
  process.stderr.write(`${err?.stack || err}\n`);
  process.exit(1);
});

