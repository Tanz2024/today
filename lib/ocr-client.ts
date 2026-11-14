"use client";

// Single on-device OCR pipeline (Tesseract LSTM via tesseract.js), shared by
// AI Image to Text and the PDF assistant's scanned-page fallback. The worker
// is created once per page view and reused; call releaseOcr() on unmount.

import type { Worker } from "tesseract.js";

export type OcrProgress = { status: string; progress: number };
export type OcrResult = { text: string; confidence: number };

let workerPromise: Promise<Worker> | null = null;
let listener: ((progress: OcrProgress) => void) | null = null;

function getWorker() {
  if (!workerPromise) {
    workerPromise = import("tesseract.js").then(({ createWorker, OEM }) =>
      createWorker("eng", OEM.LSTM_ONLY, {
        logger: (message: { status: string; progress: number }) => listener?.({ status: message.status, progress: message.progress }),
      }),
    );
    workerPromise.catch(() => { workerPromise = null; });
  }
  return workerPromise;
}

export async function recognizeImage(image: Blob | HTMLCanvasElement, onProgress?: (progress: OcrProgress) => void): Promise<OcrResult> {
  listener = onProgress ?? null;
  try {
    const worker = await getWorker();
    const { data } = await worker.recognize(image);
    return { text: data.text.replace(/\n{3,}/g, "\n\n").trim(), confidence: Math.round(data.confidence) };
  } finally {
    listener = null;
  }
}

export async function releaseOcr() {
  const pending = workerPromise;
  workerPromise = null;
  if (pending) await pending.then((worker) => worker.terminate()).catch(() => {});
}

/** Human label for tesseract.js progress statuses. */
export function ocrStatusLabel(status: string) {
  if (/load|initializ/i.test(status)) return "Loading recognition model";
  if (/recogniz/i.test(status)) return "Recognising text";
  return "Preparing";
}
