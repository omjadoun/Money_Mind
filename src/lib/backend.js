// src/lib/backend.js
export const BACKEND_BASE_URL =
  import.meta.env.VITE_BACKEND_URL || "http://localhost:5000";

export async function uploadReceiptToOcr(file) {
  const formData = new FormData();
  formData.append("receipt", file);

  const response = await fetch(`${BACKEND_BASE_URL}/ocr-upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`OCR upload failed (${response.status}): ${text}`);
  }

  return response.json(); // expects { parsed: {...}, debug?: {...} }
}

/**
 * Lightweight client-side extractor (fast fallback).
 * Accepts either raw text or an object { text } returned from backend.
 * Returns { amount, candidates, debug }.
 */
export function extractAmountFromOcrText(ocrTextOrResponse) {
  if (!ocrTextOrResponse) return { amount: 0, candidates: [], debug: {} };

  let text = ocrTextOrResponse;
  if (typeof ocrTextOrResponse === "object" && ocrTextOrResponse !== null) {
    if (typeof ocrTextOrResponse.text === "string") text = ocrTextOrResponse.text;
    else if (typeof ocrTextOrResponse.parsed === "object" && ocrTextOrResponse.parsed.amount !== undefined) {
      return {
        amount: ocrTextOrResponse.parsed.amount,
        candidates: ocrTextOrResponse.parsed.candidates || [],
        debug: ocrTextOrResponse.debug || {},
      };
    }
    else text = String(ocrTextOrResponse);
  }

  text = String(text || "");
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  const KEYWORD_RE = /\b(grand\s*total|grandtotal|total\s*amount|total|amount\s*due|amount\s*paid|balance\s*due|net\s*payable|payable)\b/i;
  const MONEY_RE = /(?:[₹Rs$£€]\s*)?([0-9]{1,3}(?:[,\s][0-9]{3})*(?:\.[0-9]{1,2})|[0-9]+(?:\.[0-9]{1,2})?)/g;

  const candidates = [];
  lines.forEach((line, idx) => {
    MONEY_RE.lastIndex = 0;
    let m;
    while ((m = MONEY_RE.exec(line)) !== null) {
      const raw = m[0];
      const num = (m[1] || raw).replace(/[^\d.,\-]/g, "").replace(/\s/g, "");
      const normalized = num.replace(/,/g, "");
      const value = parseFloat(normalized);
      if (!Number.isFinite(value)) continue;
      if (/\b(19|20)\d{2}\b/.test(line) && value >= 1900 && value <= 2100) continue;
      if (/^\d{6,12}$/.test(normalized)) continue;
      const keyword = KEYWORD_RE.test(line);
      let score = 0;
      if (keyword) score += 40;
      score += Math.max(0, 10 - (lines.length - 1 - idx));
      score += Math.min(20, Math.log10(Math.max(1, value)) * 3);
      candidates.push({ value, rawText: raw, lineText: line, lineIndex: idx, keyword, score });
    }
  });

  if (candidates.length === 0) {
    const LOOSE_RE = /([0-9]{2,}(?:\.[0-9]{1,2})?)/g;
    lines.forEach((line, idx) => {
      let mm;
      LOOSE_RE.lastIndex = 0;
      while ((mm = LOOSE_RE.exec(line)) !== null) {
        const raw = mm[0];
        const normalized = raw.replace(/,/g, "");
        const value = parseFloat(normalized);
        if (!Number.isFinite(value)) continue;
        candidates.push({ value, rawText: raw, lineText: line, lineIndex: idx, keyword: KEYWORD_RE.test(line), score: 1 + Math.min(10, Math.log10(Math.max(1, value))) });
      }
    });
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.value - a.value;
  });

  let chosen = candidates[0] || null;
  if (chosen && !chosen.keyword) {
    const kw = candidates.find(c => c.keyword);
    if (kw && kw.score >= (chosen.score - 5)) chosen = kw;
  }

  if ((!chosen || !Number.isFinite(chosen.value) || chosen.value <= 0) && candidates.length) {
    const positive = candidates.filter(c => c.value > 0);
    if (positive.length) chosen = positive.reduce((a, b) => b.value > a.value ? b : a, positive[0]);
  }

  return {
    amount: chosen ? chosen.value : 0,
    candidates,
    debug: { lines: lines.slice(-30), lineCount: lines.length },
  };
}