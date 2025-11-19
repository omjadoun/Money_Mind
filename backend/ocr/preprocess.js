/*
 * Image preprocessing helpers:
  - makeQuickPreview(srcPath) -> creates a small grayscale preview (tmp file)
  - generatePreprocessVariants(inputPath, opts) -> creates multiple processed variants (tmp files)
  - runOcr(imagePath, psm, extraVars) -> wrapper that calls enqueueOcrJob from workerPool
    isolate Sharp-based transforms and temporary-file handling.
 */

import sharp from "sharp";
import tmp from "tmp-promise";
import { enqueueOcrJob } from "./workerPool.js";

export const MAX_WIDTH = 1600;
export const QUICK_OCR_PSM = 3;
export const FULL_OCR_PSM = 6;

export async function makeQuickPreview(srcPath) {
  const { path: tmpPath, cleanup } = await tmp.file({ postfix: ".png" });
  await sharp(srcPath, { failOnError: false })
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .grayscale()
    .toFile(tmpPath);
  return { path: tmpPath, cleanup };
}

export async function generatePreprocessVariants(inputPath, { baseWidth = MAX_WIDTH } = {}) {
  const variants = [];
  async function make(label, fn) {
    const { path: tmpPath, cleanup } = await tmp.file({ postfix: ".png" });
    try {
      let img = sharp(inputPath, { failOnError: false }).rotate();
      img = fn(img);
      await img.toFile(tmpPath);
      variants.push({ label, path: tmpPath, cleanup });
    } catch (e) {
      try { await cleanup(); } catch {}
      console.warn(`Variant ${label} failed:`, e && e.message ? e.message : e);
    }
  }

  // NOTE: use normalize() (American spelling) — sharp API.
  await make("norm_sharp", p => p.resize({ width: baseWidth }).grayscale().normalize().sharpen());
  await make("sharpen_contrast", p => p.resize({ width: baseWidth }).grayscale().normalize().sharpen().linear(1.2, -12));
  await make("threshold_160", p => p.resize({ width: baseWidth }).grayscale().normalize().threshold(160));
  await make("threshold_200", p => p.resize({ width: baseWidth }).grayscale().normalize().threshold(200));
  await make("invert", p => p.resize({ width: baseWidth }).grayscale().normalize().negate());
  await make("large_norm", p => p.resize({ width: Math.min(baseWidth * 1.4, 2400) }).grayscale().normalize().sharpen());
  await make("gamma_0_8", p => p.resize({ width: baseWidth }).grayscale().gamma(0.8).normalize().sharpen());
  await make("gamma_1_4", p => p.resize({ width: baseWidth }).grayscale().gamma(1.4).normalize().sharpen());

  const medianKernel = {
    width: 3,
    height: 3,
    kernel: [
      1/9,1/9,1/9,
      1/9,1/9,1/9,
      1/9,1/9,1/9
    ]
  };
  await make("denoise", p => p.resize({ width: baseWidth }).grayscale().convolve(medianKernel).normalize().sharpen());

  // Bottom-crop focused variant: totals are often in bottom area — run single-line OCR on this later.
  try {
    const meta = await sharp(inputPath).metadata().catch(() => ({}));
    if (meta && meta.height) {
      const cropHeight = Math.round(meta.height * 0.28); // bottom 28%
      await make("bottom_crop_focus", p => p.extract({ left: 0, top: Math.max(0, meta.height - cropHeight), width: meta.width, height: cropHeight })
                                              .resize({ width: baseWidth }).grayscale().normalize().sharpen().threshold(160));
    }
  } catch (e) {
    console.warn("bottom crop variant failed:", e && e.message ? e.message : e);
  }

  return variants;
}

// runOcr uses workerPool.enqueueOcrJob under the hood.
// psm defaults to QUICK_OCR_PSM (3)
export async function runOcr(imagePath, psm = QUICK_OCR_PSM, extraVars = {}) {
  const params = {
    tessedit_pageseg_mode: String(psm),
    preserve_interword_spaces: "1",
    ...(extraVars.vars || {}),
  };
  return await enqueueOcrJob(imagePath, params);
}
