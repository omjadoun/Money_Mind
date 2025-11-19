/*
  OCR quality tracking and helper functions:
  - ocrStats (object)
  - ocrMaxRecord (record of highest confidence)
  - updateStats(confidence)
  - updateMax(confidence, meta)
  - qualityLabel(conf)
 */

export const RECENT_SAMPLES_KEEP = 10;
export const ocrStats = {
  count: 0,
  sum: 0,
  min: null,
  max: null,
  avg: 0,
  lastSamples: [],
};

export let ocrMaxRecord = {
  value: 0,
  filename: null,
  variant: null,
  cfg: null,
  timestamp: null,
};

export function updateStats(confidence) {
  const conf = Number(confidence) || 0;
  ocrStats.count += 1;
  ocrStats.sum += conf;
  ocrStats.min = ocrStats.min === null ? conf : Math.min(ocrStats.min, conf);
  ocrStats.max = ocrStats.max === null ? conf : Math.max(ocrStats.max, conf);
  ocrStats.avg = ocrStats.sum / ocrStats.count;
  ocrStats.lastSamples.unshift(conf);
  if (ocrStats.lastSamples.length > RECENT_SAMPLES_KEEP) ocrStats.lastSamples.pop();
}

export function updateMax(confidence, meta = {}) {
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

export function qualityLabel(conf) {
  if (conf >= 85) return "Excellent";
  if (conf >= 70) return "Good";
  if (conf >= 55) return "Fair";
  return "Poor";
}
