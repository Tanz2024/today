"use client";

// Browser-side PDF text extraction (pdf.js), with the shared Tesseract OCR
// pipeline for scanned pages. Used by the PDF assistant, the Study assistant
// and the Image & Document Studio. Page numbers are the PDF's own (1-based).

import { recognizeImage } from "./ocr-client";
import { PDF_MAX_BYTES, PDF_MAX_PAGES, PDF_OCR_MAX_PAGES } from "./local-ai-tools";

export type PdfPage = { page: number; text: string; ocr: boolean };
export type PdfExtract = { name: string; pages: number; texts: PdfPage[]; ocrPages: number[]; skippedOcr: number };
type PdfDocument = { numPages: number; getPage: (n: number) => Promise<unknown>; destroy: () => Promise<void> };

export class PdfError extends Error {}

export function validatePdf(file: File) {
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) throw new PdfError("Please choose a PDF file.");
  if (file.size > PDF_MAX_BYTES) throw new PdfError(`That PDF is larger than ${PDF_MAX_BYTES / 1024 / 1024} MB.`);
}

export async function extractPdf(file: File, onProgress: (label: string, value: number | null) => void, signal?: { cancelled: boolean }): Promise<PdfExtract> {
  validatePdf(file);
  let pdf: PdfDocument | null = null;
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
    pdf = (await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise) as unknown as PdfDocument;
    if (!pdf) throw new Error("open");
    if (pdf.numPages > PDF_MAX_PAGES) throw new PdfError(`This PDF has ${pdf.numPages} pages. Please use one with up to ${PDF_MAX_PAGES}.`);
    const texts: PdfPage[] = [];
    const ocrPages: number[] = [];
    let skippedOcr = 0;
    for (let n = 1; n <= pdf.numPages; n += 1) {
      if (signal?.cancelled) throw new PdfError("Cancelled.");
      onProgress(`Extracting text · page ${n} of ${pdf.numPages}`, n / pdf.numPages);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- pdf.js page proxy
      const page = (await pdf.getPage(n)) as any;
      const content = await page.getTextContent();
      let text = (content.items as { str?: string; hasEOL?: boolean }[]).map((item) => (item.str ?? "") + (item.hasEOL ? "\n" : " ")).join("");
      let ocr = false;
      if (text.replace(/\s/g, "").length < 20) {
        // Probably a scanned page: read it with the shared OCR pipeline.
        if (ocrPages.length < PDF_OCR_MAX_PAGES) {
          onProgress(`Scanned page ${n}: reading with OCR`, n / pdf.numPages);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          await page.render({ canvas, canvasContext: canvas.getContext("2d")!, viewport }).promise;
          text = (await recognizeImage(canvas)).text;
          canvas.width = canvas.height = 0;
          ocrPages.push(n);
          ocr = true;
        } else skippedOcr += 1;
      }
      page.cleanup?.();
      texts.push({ page: n, text: text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(), ocr });
    }
    if (!texts.some((t) => t.text)) throw new PdfError("No readable text was found in this PDF.");
    return { name: file.name, pages: pdf.numPages, texts, ocrPages, skippedOcr };
  } catch (caught) {
    if (caught instanceof PdfError) throw caught;
    const message = caught instanceof Error ? caught.message : "";
    throw new PdfError(/password/i.test(message) ? "This PDF is password-protected. Remove the password and try again." : "This PDF couldn't be read. It may be damaged or in an unsupported format.");
  } finally {
    await pdf?.destroy().catch(() => {});
  }
}
