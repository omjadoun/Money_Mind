import 'dotenv/config';
import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";
import tmp from "tmp-promise";
import * as Tesseract from "tesseract.js";
import NodeCache from "node-cache";
import rateLimit from "express-rate-limit";
import cron from "node-cron";
import os from "os";
import dotenv from "dotenv";
import { checkBudgetAlerts, sendMonthlyReports } from "./services/notificationService.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------- Config ----------
const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10 MB
const QUICK_OCR_PSM = 3;
const FULL_OCR_PSM = 6;
const CONFIDENCE_THRESHOLD = 70;
const CACHE_TTL_SEC = 60 * 60;
const MAX_WIDTH = 1600;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

// Worker / queue tuning
const WORKER_COUNT = 2; // reduce if low memory
const WORKER_POOL_MAX_QUEUE = 80;
const MAX_QUEUE_WAIT_MS = 30 * 1000; // if a job sits in queue > 30s, reject it

await fs.mkdir(UPLOAD_DIR, { recursive: true });

// ---------- Multer setup ----------
const upload = multer({
  dest: UPLOAD_DIR,
  limits: { fileSize: MAX_UPLOAD_SIZE },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type. Please upload a JPG or PNG image."));
    }
    cb(null, true);
  },
});

// ---------- Rate limiter ----------
const ocrLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// ---------- Cache ----------
const resultCache = new NodeCache({ stdTTL: CACHE_TTL_SEC, checkperiod: 120 });

// =============================================================
// 🧠 Worker pool for tesseract.js
// =============================================================
const workerPool = { workers: [], free: [], queue: [], shuttingDown: false };

// Baseline params we always restore after jobs
const BASE_PARAMS = {
  preserve_interword_spaces: "1",
  tessedit_ocr_engine_mode: "1",
  tessedit_pageseg_mode: "3",
};

async function initWorkerPool() {
  console.log(`Initializing ${WORKER_COUNT} Tesseract workers...`);
  for (let i = 0; i < WORKER_COUNT; i++) {
    const w = await Tesseract.createWorker({
      // logger: m => console.log(`Worker${i}`, m),
    });
    // Important: load before loadLanguage/initialize to avoid "w.load is not a function" issues
    await w.load();
    await w.loadLanguage("eng");
    await w.initialize("eng");
    await w.setParameters(BASE_PARAMS);
    workerPool.workers.push(w);
    workerPool.free.push(i);
  }
  console.log("✅ Worker pool ready.");
}

// compute more robust average confidence from tesseract's data object
function computeAverageConfidence(data = {}) {
  try {
    if (Array.isArray(data.words) && data.words.length) {
      const sum = data.words.reduce((s, w) => s + (Number(w.confidence) || 0), 0);
      return sum / data.words.length;
    }
    if (Array.isArray(data.symbols) && data.symbols.length) {
      const sum = data.symbols.reduce((s, sbl) => s + (Number(sbl.confidence) || 0), 0);
      return sum / data.symbols.length;
    }
    return Number.isFinite(data.confidence) ? data.confidence : 0;
  } catch (e) {
    return 0;
  }
}

function enqueueOcrJob(imagePath, params = {}) {
  return new Promise((resolve, reject) => {
    if (workerPool.queue.length >= WORKER_POOL_MAX_QUEUE) {
      const err = new Error("OCR queue full — try again later");
      err.status = 429;
      return reject(err);
    }
    const job = {
      imagePath,
      params,
      resolve,
      reject,
      enqueuedAt: Date.now(),
      _timeout: null,
      _started: false,
    };

    // per-job queue wait timeout
    job._timeout = setTimeout(() => {
      if (!job._started) {
        job._started = true; // mark to avoid double rejection
        const err = new Error("OCR job timed out in queue");
        err.status = 503;
        try { job.reject(err); } catch {}
        // remove job from queue if still present
        const idx = workerPool.queue.indexOf(job);
        if (idx >= 0) workerPool.queue.splice(idx, 1);
      }
    }, MAX_QUEUE_WAIT_MS);

    workerPool.queue.push(job);
    processWorkerQueue();
  });
}

async function processWorkerQueue() {
  if (workerPool.shuttingDown) return;
  if (workerPool.queue.length === 0) return;
  if (workerPool.free.length === 0) return;

  const idx = workerPool.free.shift();
  const job = workerPool.queue.shift();
  const worker = workerPool.workers[idx];

  // mark started and clear queue-wait timeout
  job._started = true;
  if (job._timeout) {
    clearTimeout(job._timeout);
    job._timeout = null;
  }

  (async () => {
    try {
      if (job.params && Object.keys(job.params).length) {
        await worker.setParameters(job.params);
      }
      const { data } = await worker.recognize(job.imagePath);
      const text = data?.text ?? "";
      const confidence = computeAverageConfidence(data);
      job.resolve({ text, confidence, raw: data });
    } catch (err) {
      job.reject(err);
    } finally {
      // always restore worker to a known baseline so next job is consistent
      try { await worker.setParameters(BASE_PARAMS); } catch (e) { /* ignore */ }
      workerPool.free.push(idx);
      // process next item asap
      setImmediate(processWorkerQueue);
    }
  })();
}

async function shutdownWorkerPool() {
  console.log("Shutting down OCR workers...");
  workerPool.shuttingDown = true;
  // reject queued jobs
  while (workerPool.queue.length) {
    const j = workerPool.queue.shift();
    if (j._timeout) clearTimeout(j._timeout);
    j.reject(new Error("Server shutting down - OCR cancelled"));
  }
  // terminate workers
  for (const w of workerPool.workers) {
    try { await w.terminate(); } catch (e) { console.warn("Terminate fail", e); }
  }
  console.log("🛑 Worker pool terminated.");
}

// =============================================================
// 🖼️ Preprocessing + OCR Helpers
// =============================================================

async function makeQuickPreview(srcPath) {
  const { path: tmpPath, cleanup } = await tmp.file({ postfix: ".png" });
  await sharp(srcPath, { failOnError: false })
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .grayscale()
    .toFile(tmpPath);
  return { path: tmpPath, cleanup };
}

async function generatePreprocessVariants(inputPath, { baseWidth = MAX_WIDTH } = {}) {
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
      console.warn(`Variant ${label} failed:`, e.message);
    }
  }

  await make("norm_sharp", p => p.resize({ width: baseWidth }).grayscale().normalise().sharpen());
  await make("threshold_180", p => p.resize({ width: baseWidth }).grayscale().normalise().threshold(180));
  await make("invert", p => p.resize({ width: baseWidth }).grayscale().normalise().negate());
  return variants;
}

// ---------- Pool-backed OCR ----------
async function runOcr(imagePath, psm = QUICK_OCR_PSM, extraVars = {}) {
  const params = {
    tessedit_pageseg_mode: String(psm),
    tessedit_ocr_engine_mode: extraVars.oem || "1",
    preserve_interword_spaces: "1",
    ...(extraVars.vars || {}),
  };
  return await enqueueOcrJob(imagePath, params);
}

// =============================================================
// 🔠 OCR Text Normalization + Parsing
// =============================================================

function normalizeOcrSymbols(text, opts = { preferINR: true }) {
  if (!text) return "";
  let t = text;
  t = t.replace(/\|/g, "I").replace(/[\[\]\}]/g, "").replace(/\.{2,}/g, " ... ");
  t = t.replace(/Thank you[^\w\s]*$/i, "Thank you!");
  const symbols = new Set();
  const matches = [...t.matchAll(/([£$₹€£RXxIlI])\s*(?=\d{1,3}([.,]\d{2})?)/g)];
  matches.forEach(m => symbols.add(m[1]));
  if (opts.preferINR && symbols.size > 0) {
    t = t.replace(/([RXxIlI£])(?=\d)/g, "₹");
  }
  return t.replace(/[^\x00-\x7F₹€£$.,:\-\n\sA-Za-z0-9]/g, "");
}

function normalizeNumberToken(token) {
  let t = token.replace(/[^\d.,-]/g, "");
  if (t.includes(",") && t.includes(".")) t = t.replace(/,/g, "");
  else if (t.includes(",") && /,[0-9]{2}$/.test(t)) t = t.replace(",", ".");
  else t = t.replace(/,/g, "");
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function findNumbersInText(text) {
  const regex = /(?:₹|\$|USD|Rs\.?|INR|€|£)?\s*([0-9]{1,3}(?:[,0-9]{0,3})*(?:[.,][0-9]{2})?)/g;
  const res = [];
  let m;
  while ((m = regex.exec(text)) !== null) {
    const val = normalizeNumberToken(m[1]);
    if (val) res.push({ raw: m[0].trim(), value: val });
  }
  return res;
}

// Improved extraction — avoid matching 'subtotal' and favour multi-word keywords first
function extractTotalFromText(text) {
  const lines = text.split(/\n/).map(l => l.trim());
  const exactKeywords = ["grand total", "amount due", "balance", "net total", "amount paid"];
  const fallbackKeywords = ["total"];

  // 1) exact phrase matches (prefer these)
  for (const line of lines) {
    const lower = line.toLowerCase();
    for (const k of exactKeywords) {
      if (lower.includes(k)) {
        const nums = findNumbersInText(line);
        if (nums.length) return { raw: nums.at(-1).raw, value: nums.at(-1).value, reason: "keyword:" + k };
      }
    }
  }

  // 2) fallback 'total' but avoid 'subtotal' or 'sub total'
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (/\bsubtotal\b/.test(lower) || /\bsub total\b/.test(lower)) continue;
    if (fallbackKeywords.some(k => new RegExp(`\\b${k}\\b`).test(lower))) {
      const nums = findNumbersInText(line);
      if (nums.length) return { raw: nums.at(-1).raw, value: nums.at(-1).value, reason: "keyword:total" };
    }
  }

  // 3) fallback to the last / largest detected number
  const nums = findNumbersInText(text);
  if (!nums.length) return null;
  return { raw: nums.at(-1).raw, value: nums.at(-1).value, reason: "largest" };
}

function parseReceiptText(text) {
  const cleaned = text.replace(/\r/g, "\n");
  const lines = cleaned.split(/\n/).map(l => l.trim()).filter(Boolean);
  const merchant = lines[0] || "";
  const amounts = findNumbersInText(cleaned);
  const total = extractTotalFromText(cleaned);
  return { merchant, amountCandidates: amounts, total, linesCount: lines.length };
}

// =============================================================
// 🔎 OCR confidence tracking & stats
let ocrMaxRecord = {
  value: 0,
  filename: null,
  variant: null,
  cfg: null,
  timestamp: null,
};

function updateMax(confidence, meta = {}) {
  const conf = Number(confidence) || 0;
  if (conf > (ocrMaxRecord.value || 0)) {
    ocrMaxRecord = {
      value: conf,
      filename: meta.filename || null,
      variant: meta.variant || null,
      cfg: meta.cfg || null,
      timestamp: new Date().toISOString(),
    };
    console.log("🏆 New OCR max confidence recorded:", ocrMaxRecord);
  }
}

// simple quality label
function qualityLabel(conf) {
  if (conf >= 85) return "Excellent";
  if (conf >= 70) return "Good";
  if (conf >= 55) return "Fair";
  return "Poor";
}

// basic filename sanitizer (avoid adding another dep)
function sanitizeFilename(name = "") {
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 200);
}

// OCR statistics (min, max, avg, count, lastSamples)
const RECENT_SAMPLES_KEEP = 10;
const ocrStats = {
  count: 0,
  sum: 0,
  min: null,
  max: null,
  avg: 0,
  lastSamples: [], // keeps most recent N confidences
};

function updateStats(confidence) {
  const conf = Number(confidence) || 0;
  ocrStats.count += 1;
  ocrStats.sum += conf;
  ocrStats.min = ocrStats.min === null ? conf : Math.min(ocrStats.min, conf);
  ocrStats.max = ocrStats.max === null ? conf : Math.max(ocrStats.max, conf);
  ocrStats.avg = ocrStats.sum / ocrStats.count;
  ocrStats.lastSamples.unshift(conf);
  if (ocrStats.lastSamples.length > RECENT_SAMPLES_KEEP) ocrStats.lastSamples.pop();
}

// =============================================================
// 🚀 OCR ENDPOINT
app.post("/ocr-upload", ocrLimiter, upload.single("receipt"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received." });

  const { path: filePath, originalname, mimetype, size } = req.file;
  const safeOriginalName = sanitizeFilename(originalname || "upload");
  console.log("📥 File received:", safeOriginalName);

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (e) {
    console.error("Failed to read uploaded file:", e);
    return res.status(500).json({ error: "Failed to read uploaded file" });
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const cached = resultCache.get(hash);
  if (cached) return res.json({ cached: true, ...cached });

  // Quick OCR with safe cleanup
  let quick = { text: "", confidence: 0 };
  let preview;
  try {
    preview = await makeQuickPreview(filePath);
    const qres = await runOcr(preview.path, QUICK_OCR_PSM);
    quick = { text: normalizeOcrSymbols(qres.text), confidence: qres.confidence };
    // update global max with quick result
    updateMax(quick.confidence, { filename: safeOriginalName, variant: "quick_preview", cfg: { psm: QUICK_OCR_PSM } });
    // update stats
    updateStats(quick.confidence);
  } catch (e) {
    console.warn("Quick OCR failed:", e);
  } finally {
    if (preview?.cleanup) {
      try { await preview.cleanup(); } catch (e) { /* ignore */ }
    }
  }

  let finalResult = {
    method: "quick",
    text: quick.text,
    confidence: quick.confidence,
    parsed: parseReceiptText(quick.text),
    filename: safeOriginalName,
    mimetype,
    size,
    quality: qualityLabel(quick.confidence),
  };

  if (quick.confidence < CONFIDENCE_THRESHOLD) {
    console.log("Low confidence, running multi-variant...");
    let variants = [];
    try {
      variants = await generatePreprocessVariants(filePath);
    } catch (e) {
      console.warn("Variant generation failed:", e);
    }

    let best = { confidence: quick.confidence, text: quick.text };

    const cfgs = [
      { psm: FULL_OCR_PSM, oem: "1" },
      { psm: 3, oem: "1" },
    ];

    const tasks = [];
    for (const v of variants) {
      for (const cfg of cfgs) {
        tasks.push(
          runOcr(v.path, cfg.psm, { oem: cfg.oem })
            .then(r => ({ v, cfg, r }))
            .catch(err => {
              return { v, cfg, err };
            })
        );
      }
    }

    const results = await Promise.all(tasks);
    for (const r of results) {
      if (r.err) {
        // skip failed variant
        continue;
      }
      const { r: res, v, cfg } = r;
      res.text = normalizeOcrSymbols(res.text);

      // Update global max for every fulfilled result
      updateMax(res.confidence, { filename: safeOriginalName, variant: v.label, cfg });
      // Update stats for every fulfilled result
      updateStats(res.confidence);

      if (res.confidence > best.confidence) best = { ...res, variant: v.label, cfg };
    }

    finalResult = {
      method: "preprocessed",
      text: best.text,
      confidence: best.confidence,
      parsed: parseReceiptText(best.text),
      filename: safeOriginalName,
      mimetype,
      size,
      variant: best.variant,
      quality: qualityLabel(best.confidence),
    };

    // cleanup variant temp files
    for (const v of variants) {
      try { await v.cleanup(); } catch (e) { /* ignore */ }
    }
  }

  // Cache & cleanup original upload
  resultCache.set(hash, finalResult);
  try { await fs.unlink(filePath); } catch (e) { /* ignore */ }

  // Log current max and stats after this request
  console.log("🔎 Current OCR max record:", ocrMaxRecord);
  console.log(`📈 OCR stats -> count: ${ocrStats.count}, avg: ${ocrStats.avg.toFixed(2)}, min: ${ocrStats.min}, max: ${ocrStats.max}, recent: [${ocrStats.lastSamples.join(", ")}]`);

  res.json({ cached: false, ...finalResult });
});

// endpoint to retrieve current max confidence record
app.get("/ocr-max", (req, res) => {
  res.json(ocrMaxRecord);
});

// endpoint to retrieve OCR stats
app.get("/ocr-stats", (req, res) => {
  res.json({
    count: ocrStats.count,
    avg: Number((ocrStats.avg || 0).toFixed(2)),
    min: ocrStats.min,
    max: ocrStats.max,
    recent: ocrStats.lastSamples.slice(),
  });
});

// =============================================================
// 🕒 Notification & scheduler routes (unchanged)
app.post("/api/notifications/check-budgets", async (req, res) => {
  try {
    await checkBudgetAlerts();
    res.json({ success: true });
  } catch (e) {
    console.error("Budget check error:", e);
    res.status(500).json({ error: e.message });
  }
});

app.post("/api/notifications/send-monthly-reports", async (req, res) => {
  try {
    await sendMonthlyReports();
    res.json({ success: true });
  } catch (e) {
    console.error("Monthly report error:", e);
    res.status(500).json({ error: e.message });
  }
});

cron.schedule("0 */6 * * *", async () => {
  console.log("⏰ Running scheduled budget alert...");
  try { await checkBudgetAlerts(); } catch (e) { console.error("checkBudgetAlerts error", e); }
});

cron.schedule("0 9 1 * *", async () => {
  console.log("⏰ Running monthly report...");
  try { await sendMonthlyReports(); } catch (e) { console.error("sendMonthlyReports error", e); }
});

// =============================================================
// 🩺 Health + Start
app.get("/", (req, res) => res.send("Backend working ✅"));

const PORT = process.env.PORT || 5000;
(async () => {
  let server;
  try {
    await initWorkerPool();
    server = app.listen(PORT, () => console.log(`🚀 Server at http://localhost:${PORT}`));

    const graceful = async () => {
      console.log("Graceful shutdown...");
      // wait for server to close
      await new Promise(resolve => server.close(() => resolve()));
      await shutdownWorkerPool();
      process.exit(0);
    };
    process.on("SIGINT", graceful);
    process.on("SIGTERM", graceful);
  } catch (e) {
    console.error("Failed to start:", e);
    if (server) {
      try { server.close(); } catch {}
    }
    await shutdownWorkerPool();
    process.exit(1);
  }
})();
