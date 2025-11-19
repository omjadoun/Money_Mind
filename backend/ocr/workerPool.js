/*
  Responsible for Tesseract worker pool lifecycle:
  - initWorkerPool(count)
  - enqueueOcrJob(imagePath, params)
  - processWorkerQueue()
  - shutdownWorkerPool()
    Exports the enqueue function and lifecycle functions.
    This file isolates Tesseract worker management so other modules can call enqueueOcrJob().
 */

import * as Tesseract from "tesseract.js";

const workerPool = { workers: [], free: [], queue: [], shuttingDown: false };

// Baseline params we always restore after jobs (excluding engine mode which is set during init)
const BASE_PARAMS = {
  preserve_interword_spaces: "1",
  tessedit_pageseg_mode: "3",
};

// Default queue tuning values — can be overridden by caller if desired
export const WORKER_POOL_CONFIG = {
  WORKER_COUNT: 2,
  WORKER_POOL_MAX_QUEUE: 80,
  MAX_QUEUE_WAIT_MS: 30 * 1000,
};

export async function initWorkerPool(count = WORKER_POOL_CONFIG.WORKER_COUNT) {
  console.log(`Initializing ${count} Tesseract workers...`);
  for (let i = 0; i < count; i++) {
    const w = await Tesseract.createWorker({
      logger: m => console.log(m),
    });
    
    // Workers come pre-loaded now, just load language and initialize
    await w.loadLanguage("eng");
    await w.initialize("eng", 1); // 1 = OEM_LSTM_ONLY engine mode
    
    // Set parameters that can be changed after initialization
    await w.setParameters({
      preserve_interword_spaces: "1",
      tessedit_pageseg_mode: "3",
    });
    
    workerPool.workers.push(w);
    workerPool.free.push(i);
  }
  console.log("✅ Worker pool ready.");
}

export function computeAverageConfidence(data = {}) {
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

export function enqueueOcrJob(imagePath, params = {}, opts = {}) {
  const MAX_QUEUE = opts.maxQueue || WORKER_POOL_CONFIG.WORKER_POOL_MAX_QUEUE;
  const MAX_WAIT = opts.maxWait || WORKER_POOL_CONFIG.MAX_QUEUE_WAIT_MS;

  return new Promise((resolve, reject) => {
    if (workerPool.queue.length >= MAX_QUEUE) {
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

    job._timeout = setTimeout(() => {
      if (!job._started) {
        job._started = true;
        const err = new Error("OCR job timed out in queue");
        err.status = 503;
        try { job.reject(err); } catch {}
        const idx = workerPool.queue.indexOf(job);
        if (idx >= 0) workerPool.queue.splice(idx, 1);
      }
    }, MAX_WAIT);

    workerPool.queue.push(job);
    // try to process the queue immediately
    processWorkerQueue();
  });
}

export async function processWorkerQueue() {
  if (workerPool.shuttingDown) return;
  if (workerPool.queue.length === 0) return;
  if (workerPool.free.length === 0) return;

  const idx = workerPool.free.shift();
  const job = workerPool.queue.shift();
  const worker = workerPool.workers[idx];

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
      try { await worker.setParameters(BASE_PARAMS); } catch (e) {}
      workerPool.free.push(idx);
      // schedule next processing tick
      setImmediate(processWorkerQueue);
    }
  })();
}

export async function shutdownWorkerPool() {
  console.log("Shutting down OCR workers...");
  workerPool.shuttingDown = true;

  // reject queued jobs
  while (workerPool.queue.length) {
    const j = workerPool.queue.shift();
    if (j._timeout) clearTimeout(j._timeout);
    try { j.reject(new Error("Server shutting down - OCR cancelled")); } catch (e) {}
  }

  for (const w of workerPool.workers) {
    try { await w.terminate(); } catch (e) { console.warn("Terminate fail", e); }
  }
  console.log("🛑 Worker pool terminated.");
}
