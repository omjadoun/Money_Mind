// backend/index.js
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envLoadResult = dotenv.config({ path: path.join(__dirname, ".env") });
if (envLoadResult.error) {
  dotenv.config();
}

import express from "express";
import multer from "multer";
import cors from "cors";
import fs from "fs/promises";
import crypto from "crypto";
import os from "os";
import rateLimit from "express-rate-limit";
import cron from "node-cron";

import { checkBudgetAlerts, sendMonthlyReports } from "./services/notificationService.js";
import { createClient } from "@supabase/supabase-js";
import phoneMfaRoutes from "./routes/phoneMfaRoutes.js";
import whatsappMfaRoutes from "./routes/whatsappMfaRoutes.js";

import tmp from "tmp-promise";
import { initWorkerPool, shutdownWorkerPool } from "./ocr/workerPool.js";
import {
  makeQuickPreview,
  generatePreprocessVariants,
  runOcr,
  QUICK_OCR_PSM,
  FULL_OCR_PSM
} from "./ocr/preprocess.js";
import {
  normalizeOcrSymbols,
  parseReceiptText,
  parseOcrResult,
  debugNumericAndTotal,
  todayIso,
  toDisplay,
  isoToEpochMs,
  findNumbersInText
} from "./ocr/parser.js";
import { updateStats, updateMax, ocrStats, ocrMaxRecord, qualityLabel } from "./ocr/stats.js";
import { cleanupUploadsKeepN } from "./storage/uploadsCleanup.js";
import { saveReceiptToDb } from "./services/dbSave.js";

const app = express();
app.use(cors());
app.use(express.json());


const SUPABASE_URL = process.env.SUPABASE_URL || null;
const SUPABASE_KEY = process.env.SUPABASE_KEY || null;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || null;
let supabase = null;
let supabaseAdmin = null;

if (SUPABASE_URL && SUPABASE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
    console.log("Supabase client initialized.");
  } catch (e) {
    console.warn("Supabase init failed:", e);
    supabase = null;
  }
} else {
  console.log("Supabase not configured — DB saving disabled.");
}

if (SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  try {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });
    console.log("✅ Supabase admin client initialized.");
  } catch (e) {
    console.warn("Supabase admin init failed:", e);
    supabaseAdmin = null;
  }
}

app.use("/api/phone-mfa", phoneMfaRoutes);
app.use("/api/whatsapp-mfa", whatsappMfaRoutes);

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024; // 10MB
const CONFIDENCE_THRESHOLD = 70;
await fs.mkdir(UPLOAD_DIR, { recursive: true });

// Multer
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

// Rate limiter
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const ocrLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
});

// Cache
import NodeCache from "node-cache";
const CACHE_TTL_SEC = 60 * 60;
const resultCache = new NodeCache({ stdTTL: CACHE_TTL_SEC, checkperiod: 120 });

// ------------- Helper: normalize parsed output to canonical shape -------------
function normalizeParsedForFrontend(parsed) {
  if (!parsed) return null;

  // If already the "old" shape returned by parseReceiptText, keep it but ensure numeric
  if (parsed.total !== undefined || parsed.date !== undefined) {
    if (parsed.total && parsed.total.value !== undefined) parsed.total.value = Number(parsed.total.value);
    return parsed;
  }

  // Otherwise it's likely parseOcrResult shaped
  const total = (() => {
    if (parsed.total && parsed.total.value !== undefined) return { raw: parsed.total.raw, value: Number(parsed.total.value), reason: parsed.total.reason || "total_from_parsed" };
    if (parsed.chosen && parsed.chosen.value !== undefined) return { raw: parsed.chosen.token || String(parsed.chosen.value), value: Number(parsed.chosen.value), reason: "tsv_chosen" };
    if (parsed.amount !== undefined && parsed.amount !== null && parsed.amount !== 0) return { raw: String(parsed.amount), value: Number(parsed.amount), reason: "tsv_amount_field" };
    const first = Array.isArray(parsed.candidates) && parsed.candidates.length ? parsed.candidates[0] : null;
    if (first) return { raw: first.token || String(first.value), value: Number(first.value), reason: "tsv_first_candidate" };
    return null;
  })();

  const date = parsed.date ?? (Array.isArray(parsed.dateCandidates) && parsed.dateCandidates[0] ? parsed.dateCandidates[0].iso : null);
  const dateRaw = parsed.dateRaw ?? (Array.isArray(parsed.dateCandidates) && parsed.dateCandidates[0] ? parsed.dateCandidates[0].raw : null);
  const merchant = parsed.merchant ?? (Array.isArray(parsed.vendorCandidates) && parsed.vendorCandidates[0] ? parsed.vendorCandidates[0] : "");

  return {
    merchant,
    amountCandidates: parsed.candidates || parsed.amountCandidates || [],
    total,
    date,
    dateRaw,
    dateExtractReason: parsed.dateExtractReason ?? (Array.isArray(parsed.dateCandidates) && parsed.dateCandidates[0] ? parsed.dateCandidates[0].reason : null),
    vendorCandidates: parsed.vendorCandidates || [],
    rawParsed: parsed
  };
}

// ---------------- OCR endpoint ----------------
app.post("/ocr-upload", ocrLimiter, upload.single("receipt"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received." });

  const { path: filePath, originalname, mimetype, size } = req.file;
  const safeOriginalName = (originalname || "upload").replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, " ").trim().slice(0, 200);

  let buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch (e) {
    try { await fs.unlink(filePath); } catch {}
    return res.status(500).json({ error: "Failed to read uploaded file" });
  }

  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  const cached = resultCache.get(hash);
  if (cached) {
    cached.date = cached.parsed?.date ?? cached.date ?? null;
    cached.date_iso = cached.parsed?.date ?? cached.date_iso ?? null;
    cached.date_picker = cached.date_iso;
    cached.date_display = cached.date_iso ? toDisplay(cached.date_iso) : null;
    cached.date_epoch = cached.date_iso ? isoToEpochMs(cached.date_iso) : null;
    cached.dateRaw = cached.parsed?.dateRaw ?? cached.dateRaw ?? null;
    cached.date_extract_reason = cached.parsed?.dateExtractReason ?? cached.date_extract_reason ?? null;
    await cleanupUploadsKeepN(UPLOAD_DIR, 3).catch(() => {});
    return res.json({ cached: true, ...cached });
  }

  const tempVariantCleanups = [];

  try {
    // Quick preview OCR
    let quick = { text: "", confidence: 0, raw: null };
  let preview;
  try {
    preview = await makeQuickPreview(filePath);
    const qres = await runOcr(preview.path, QUICK_OCR_PSM);
      quick = { text: normalizeOcrSymbols(qres.text || ""), confidence: qres.confidence || 0, raw: qres.raw || null };
    updateMax(quick.confidence, { filename: safeOriginalName, variant: "quick_preview", cfg: { psm: QUICK_OCR_PSM } });
    updateStats(quick.confidence);
    debugNumericAndTotal(quick.text, "quick");
  } catch (e) {
      console.warn("Quick OCR failed:", e && e.message ? e.message : e);
  } finally {
    if (preview?.cleanup) {
        try { await preview.cleanup(); } catch {}
    }
  }

    // normalize quick parsed
    let parsedQuickRaw = parseReceiptText(quick.text);
    let parsedQuick = normalizeParsedForFrontend(parsedQuickRaw);

  let finalResult = {
    method: "quick",
    text: quick.text,
    confidence: quick.confidence,
      parsed: parsedQuick,
    filename: safeOriginalName,
    mimetype,
    size,
    quality: qualityLabel(quick.confidence),
  };

    if (finalResult.parsed?.date) {
      console.log("Date detected (quick):", finalResult.parsed.date);
  }

    // Multi-variant OCR if low confidence
  if (quick.confidence < CONFIDENCE_THRESHOLD) {
    let variants = [];
    try {
      variants = await generatePreprocessVariants(filePath);
    } catch (e) {
        console.warn("Variant generation failed:", e && e.message ? e.message : e);
      }

      for (const v of variants) if (v.cleanup) tempVariantCleanups.push(v.cleanup);

      let best = { confidence: quick.confidence, text: quick.text, parsed: parsedQuick, variant: "quick" };
      const cfgs = [{ psm: FULL_OCR_PSM, oem: "1" }, { psm: 3, oem: "1" }];

    const tasks = [];
    for (const v of variants) {
      for (const cfg of cfgs) {
        tasks.push(
          runOcr(v.path, cfg.psm, { oem: cfg.oem })
            .then(r => ({ v, cfg, r }))
            .catch(err => ({ v, cfg, err }))
        );
      }
    }

    const results = await Promise.all(tasks);
      for (const rr of results) {
        if (rr.err) continue;
        const { r, v, cfg } = rr;
        r.text = normalizeOcrSymbols(r.text || "");
        updateMax(r.confidence, { filename: safeOriginalName, variant: v.label, cfg });
        updateStats(r.confidence);

        // parse variant (raw), then normalize
        let parsedVariantRaw = null;
        try {
          if (r.raw && Array.isArray(r.raw.words) && r.raw.words.length) {
            parsedVariantRaw = parseOcrResult({ text: r.text, words: r.raw.words });
          } else {
            parsedVariantRaw = parseReceiptText(r.text);
          }
        } catch (e) {
          parsedVariantRaw = parseReceiptText(r.text);
        }
        const parsedVariant = normalizeParsedForFrontend(parsedVariantRaw);

        if (r.confidence > best.confidence) {
          best = { confidence: r.confidence, text: r.text, parsed: parsedVariant, variant: v.label, cfg, raw: r.raw };
        }
      }

      debugNumericAndTotal(best.text, "best_variant");

    finalResult = {
      method: "preprocessed",
      text: best.text,
      confidence: best.confidence,
      parsed: best.parsed,
      filename: safeOriginalName,
      mimetype,
      size,
      variant: best.variant,
      quality: qualityLabel(best.confidence),
    };

      if (finalResult.parsed?.date) {
        console.log("Date detected (preprocessed):", finalResult.parsed.date);
    }

    for (const v of variants) {
        try { if (v.cleanup) await v.cleanup(); } catch {}
      }
      tempVariantCleanups.length = 0;
    }

    // Numeric-only bottom crop pass to improve total extraction
    try {
      const numericVariants = await generatePreprocessVariants(filePath, { baseWidth: 1000 });
      const bottom = numericVariants.find(x => x.label === "bottom_crop_focus");
      if (bottom) {
        if (bottom.cleanup) tempVariantCleanups.push(bottom.cleanup);
        try {
          const numRes = await runOcr(bottom.path, 7, { oem: "1", vars: { tessedit_char_whitelist: "0123456789.,₹" } });
          const numText = String(numRes.text || "");
          const numericCandidates = findNumbersInText(numText);
          if (numericCandidates && numericCandidates.length) {
            const largest = numericCandidates.reduce((a, b) => (b.value > a.value ? b : a), numericCandidates[0]);

            // ensure parsed exists and is normalized before override
            finalResult.parsed = normalizeParsedForFrontend(finalResult.parsed || parseReceiptText(finalResult.text));

            if (numRes.confidence >= Math.max(45, (finalResult.confidence || 0) - 10) || Math.abs((finalResult.parsed?.total?.value || 0) - largest.value) > 0.5) {
              finalResult.parsed.total = { raw: largest.raw, value: Number(largest.value), reason: "bottom_crop_numeric_pass" };
              finalResult.amount_override_from_bottom = true;
              finalResult.bottom_numeric_confidence = numRes.confidence;
              finalResult.text = finalResult.text + "\n\n" + numText;
            }
          }
        } catch (e) {
          console.warn("Numeric bottom-crop OCR failed:", e && e.message ? e.message : e);
        }
      }
      for (const v of numericVariants) {
        try { if (v.cleanup && v !== bottom) await v.cleanup(); } catch {}
      }
    } catch (e) {
      console.warn("Numeric-only bottom pass error:", e && e.message ? e.message : e);
    }

    // finalize date fields
  const isoDate = finalResult.parsed?.date ?? todayIso();
  finalResult.date = isoDate;
  finalResult.date_iso = isoDate;
  finalResult.date_picker = isoDate;
  finalResult.date_display = toDisplay(isoDate);
  finalResult.date_epoch = isoToEpochMs(isoDate);
  finalResult.dateRaw = finalResult.parsed?.dateRaw ?? null;
  finalResult.date_extract_reason = finalResult.parsed?.dateExtractReason ?? "fallback:today";

  debugNumericAndTotal(finalResult.text, "finalResult");

    // debug log for frontend shape verification
    console.log("DEBUG returning parsed.total/date ->", {
      total: finalResult.parsed?.total ?? null,
      date: finalResult.parsed?.date ?? null
    });

    // save in background
    saveReceiptToDb(supabase, finalResult, { hash, size }).catch(e => console.warn("DB save background error:", e));

  resultCache.set(hash, finalResult);

  res.json({ cached: false, ...finalResult });
  } catch (err) {
    console.error("OCR endpoint error:", err);
    res.status(err.status || 500).json({ error: err.message || "OCR failed" });
  } finally {
    try { await cleanupUploadsKeepN(UPLOAD_DIR, 3); } catch (e) {}
    for (const c of tempVariantCleanups) {
      try { await c(); } catch {}
    }
    try { await fs.unlink(path.resolve(filePath)); } catch {}
  }
});

// Support endpoints
app.get("/ocr-max", (req, res) => res.json(ocrMaxRecord));
app.get("/ocr-stats", (req, res) => {
  res.json({
    count: ocrStats.count,
    avg: Number((ocrStats.avg || 0).toFixed(2)),
    min: ocrStats.min,
    max: ocrStats.max,
    recent: ocrStats.lastSamples.slice(),
  });
});

app.post("/api/notifications/check-budgets", async (req, res) => {
  try { await checkBudgetAlerts(); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});
app.post("/api/notifications/send-monthly-reports", async (req, res) => {
  try { await sendMonthlyReports(); res.json({ success: true }); } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.delete("/api/account/delete", async (req, res) => {
  try {
    const { userId, accessToken } = req.body;
    if (!userId || !accessToken) return res.status(400).json({ error: "User ID and access token are required" });
    if (!supabaseAdmin) return res.status(500).json({ error: "Supabase admin client not initialized" });

    const { data: { user: adminUser } = {}, error: verifyError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (verifyError || !adminUser) return res.status(404).json({ error: "User not found" });

    try {
      const tokenClient = createClient(SUPABASE_URL, accessToken);
      const { data: { user: tokenUser } = {}, error: tokenError } = await tokenClient.auth.getUser();
      if (tokenError || !tokenUser || tokenUser.id !== userId) return res.status(401).json({ error: "Invalid or unauthorized access token" });
    } catch (tokenVerifyError) {
      return res.status(401).json({ error: "Invalid access token" });
    }

    console.log(`Deleting account for user: ${userId}`);
    const { error: transactionsError } = await supabaseAdmin.from("transactions").delete().eq("user_id", userId);
    const { error: budgetsError } = await supabaseAdmin.from("budgets").delete().eq("user_id", userId);
    const { error: profilesError } = await supabaseAdmin.from("profiles").delete().eq("id", userId);

    if (transactionsError) console.warn("Warning deleting transactions:", transactionsError);
    if (budgetsError) console.warn("Warning deleting budgets:", budgetsError);
    if (profilesError) console.warn("Warning deleting profile:", profilesError);

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) return res.status(500).json({ error: deleteError.message || "Failed to delete user account" });

    res.json({ success: true, message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error in delete endpoint:", error);
    res.status(500).json({ error: error.message || "Failed to delete account" });
  }
});

// Cron jobs
cron.schedule("0 */6 * * *", async () => { try { await checkBudgetAlerts(); } catch (e) { console.error("checkBudgetAlerts error", e); } });
cron.schedule("0 9 1 * *", async () => { try { await sendMonthlyReports(); } catch (e) { console.error("sendMonthlyReports error", e); } });

app.get("/", (req, res) => res.send("Backend working ✅"));

const PORT = process.env.PORT || 5000;
(async () => {
  let server;
  try {
    await initWorkerPool();
    server = app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
    const graceful = async () => {
      console.log("Graceful shutdown...");
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