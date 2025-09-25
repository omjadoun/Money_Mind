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

  return response.json();
}

export function extractAmountFromOcrText(ocrText) {
  // Try to find a plausible total/amount in the OCR text
  // Strategy: search for lines containing keywords first, otherwise best numeric fallback
  const lines = ocrText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const keywordPattern = /(total|amount due|amount|grand total|balance due)/i;
  const moneyPattern = /([₹\$£€])?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})|[0-9]+(?:\.[0-9]{2})?)/;

  for (const line of lines) {
    if (keywordPattern.test(line)) {
      const m = line.match(moneyPattern);
      if (m) {
        const numeric = m[2].replace(/,/g, "");
        const value = parseFloat(numeric);
        if (!Number.isNaN(value) && value > 0) return value;
      }
    }
  }

  // Fallback: pick the largest reasonable number
  let best = 0;
  for (const line of lines) {
    const m = line.match(moneyPattern);
    if (m) {
      const numeric = m[2].replace(/,/g, "");
      const value = parseFloat(numeric);
      if (!Number.isNaN(value) && value > best) best = value;
    }
  }
  return best || 0;
}

