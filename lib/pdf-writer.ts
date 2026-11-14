// Minimal PDF 1.4 writer: one JPEG image per page, fitted to A4 with a small
// margin. Pure, so it runs in the browser with no extra package.

export type PdfImagePage = { jpeg: Uint8Array; width: number; height: number };

const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 18;

export function buildImagePdf(pages: PdfImagePage[]): Uint8Array {
  if (!pages.length) throw new Error("No pages to export.");
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let length = 0;
  const write = (part: string | Uint8Array) => { const bytes = typeof part === "string" ? encoder.encode(part) : part; chunks.push(bytes); length += bytes.length; };
  const object = (id: number, body: () => void) => { offsets[id] = length; write(`${id} 0 obj\n`); body(); write("\nendobj\n"); };

  write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
  const pageIds = pages.map((_, i) => 3 + i * 3);
  object(1, () => write("<< /Type /Catalog /Pages 2 0 R >>"));
  object(2, () => write(`<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`));
  pages.forEach((page, i) => {
    const pageId = pageIds[i];
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const landscape = page.width > page.height;
    const pw = landscape ? A4.h : A4.w;
    const ph = landscape ? A4.w : A4.h;
    const scale = Math.min((pw - MARGIN * 2) / page.width, (ph - MARGIN * 2) / page.height);
    const w = page.width * scale;
    const h = page.height * scale;
    const x = (pw - w) / 2;
    const y = (ph - h) / 2;
    const content = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im0 Do Q`;
    object(pageId, () => write(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw.toFixed(2)} ${ph.toFixed(2)}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    object(imageId, () => { write(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`); write(page.jpeg); write("\nendstream"); });
    object(contentId, () => write(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  });
  const xref = length;
  const count = 3 + pages.length * 3;
  write(`xref\n0 ${count}\n0000000000 65535 f \n`);
  for (let id = 1; id < count; id += 1) write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  write(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out = new Uint8Array(length);
  let at = 0;
  for (const chunk of chunks) { out.set(chunk, at); at += chunk.length; }
  return out;
}
