const fs = require("node:fs/promises");
const path = require("node:path");
const sharp = require("sharp");

async function ensureDir(p) {
  await fs.mkdir(p, { recursive: true });
}

async function toAvif({ inputPath, outputPath, quality = 55 }) {
  await ensureDir(path.dirname(outputPath));
  await sharp(inputPath).avif({ quality }).toFile(outputPath);
}

async function generateResponsiveAvifs({
  inputPath,
  outputBasePath,
  widths = [500, 800, 1080, 1600],
  quality = 55,
}) {
  // outputBasePath should end with ".avif" for the original.
  await ensureDir(path.dirname(outputBasePath));

  const img = sharp(inputPath);
  const meta = await img.metadata();
  const fullWidth = meta.width ?? null;

  // Write original (max) first.
  await img.clone().avif({ quality }).toFile(outputBasePath);

  const out = [];
  for (const w of widths) {
    const variantPath = outputBasePath.replace(/\.avif$/i, `-p-${w}.avif`);
    // Always generate requested widths (even if it requires mild upscaling) to keep HTML srcsets consistent.
    await sharp(inputPath)
      .resize({ width: w, withoutEnlargement: false })
      .avif({ quality })
      .toFile(variantPath);
    out.push({ path: variantPath, width: w });
  }

  return out;
}

module.exports = { toAvif, generateResponsiveAvifs };

