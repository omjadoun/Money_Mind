// Helper to persist OCR result to Supabase (non-fatal). Exports:- saveReceiptToDb(supabaseClient, finalResult, meta) */

export async function saveReceiptToDb(supabaseClient, finalResult, meta = {}) {
  if (!supabaseClient) return;
  try {
    const payload = {
      filename: finalResult.filename || null,
      file_hash: meta.hash || null,
      mimetype: finalResult.mimetype || null,
      size: meta.size || null,
      merchant: finalResult.parsed?.merchant || null,
      ocr_text: finalResult.text || null,
      confidence: finalResult.confidence || null,
      quality: finalResult.quality || null,
      variant: finalResult.variant || null,
      total_value: finalResult.parsed?.total?.value ?? null,
      total_raw: finalResult.parsed?.total?.raw ?? null,
      total_reason: finalResult.parsed?.total?.reason ?? null,
      date: finalResult.parsed?.date ?? null,
      date_raw: finalResult.parsed?.dateRaw ?? null,
      date_extract_reason: finalResult.parsed?.dateExtractReason ?? null,
      lines_count: finalResult.parsed?.linesCount ?? null
    };

    const { error } = await supabaseClient.from("receipts").insert([payload]);
    if (error) {
      console.warn("Supabase insert error:", error);
    } else {
      console.log("✅ Receipt saved to Supabase.");
    }
  } catch (e) {
    console.warn("saveReceiptToDb failed:", e);
  }
}
