"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowClockwise, ArrowCounterClockwise, ArrowDown, ArrowUp, ArrowsHorizontal, ArrowsVertical, Copy, Crop as CropIcon, DownloadSimple, Eraser, FilePdf, Plus, Scan, TextAa, Trash, WarningCircle } from "@phosphor-icons/react";
import Dropzone, { ProgressBar } from "@/components/tools/local/Dropzone";
import BackgroundRemover from "@/components/tools/local/BackgroundRemover";
import { ocrStatusLabel, recognizeImage, releaseOcr } from "@/lib/ocr-client";
import { extractPdf, PdfError } from "@/lib/pdf-extract";
import { buildImagePdf } from "@/lib/pdf-writer";
import { DEFAULT_ADJUST, DEFAULT_OPS, canvasToBlob, formatBytes, makeCanvas, orient, render, scanFilter, type Crop, type Ops, type ScanMode } from "@/lib/image-ops";
import { copyText, downloadBlob, downloadFile, textToHtmlDocument } from "@/lib/workspace-files";
import { PDF_MAX_BYTES } from "@/lib/local-ai-tools";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"];
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_SIDE = 8_000;
const SCAN_MAX_PAGES = 30;
type Tab = "edit" | "scan" | "text" | "background";

async function openImage(file: File): Promise<ImageBitmap> {
  if (!IMAGE_TYPES.includes(file.type)) throw new Error("Please choose a PNG, JPG, WebP, BMP or GIF image.");
  if (file.size > MAX_BYTES) throw new Error(`That image is larger than ${MAX_BYTES / 1024 / 1024} MB.`);
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions).catch(() => null);
  if (!bitmap) throw new Error("That image couldn't be opened. Try another file.");
  if (Math.max(bitmap.width, bitmap.height) > MAX_SIDE) { bitmap.close(); throw new Error(`Please use an image no larger than ${MAX_SIDE}px on its longest side.`); }
  return bitmap;
}

export default function ImageDocumentStudio() {
  const [tab, setTab] = useState<Tab>("edit");
  const [handoff, setHandoff] = useState<Blob | null>(null);
  useEffect(() => () => { void releaseOcr(); }, []);
  return (
    <div className="utility-panel ws">
      <p className="ws-model-copy ws-muted">Everything here runs in your browser. Files are never uploaded; OCR and background removal download their models on first use (about 4 MB and 26 MB).</p>
      <div className="ws-tabs" role="tablist" aria-label="Studio tools">
        {([["edit", "Edit & convert"], ["scan", "Scan to PDF"], ["text", "Extract text"], ["background", "Remove background"]] as [Tab, string][]).map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === "edit" ? <ImageEditor onSendToOcr={(blob) => { setHandoff(blob); setTab("text"); }} /> : null}
        {tab === "scan" ? <DocumentScanner onSendToOcr={(blob) => { setHandoff(blob); setTab("text"); }} /> : null}
        {tab === "text" ? <TextExtractor initial={handoff} onConsumed={() => setHandoff(null)} /> : null}
        {tab === "background" ? <BackgroundRemover /> : null}
      </div>
    </div>
  );
}

function ImageEditor({ onSendToOcr }: { onSendToOcr: (blob: Blob) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [ops, setOps] = useState<Ops>(DEFAULT_OPS);
  const [cropping, setCropping] = useState(false);
  const [draft, setDraft] = useState<Crop | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);
  const [format, setFormat] = useState<"image/png" | "image/jpeg" | "image/webp">("image/jpeg");
  const [quality, setQuality] = useState(0.9);
  const [error, setError] = useState("");
  const [output, setOutput] = useState<{ size: number; width: number; height: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => () => bitmap?.close(), [bitmap]);

  async function choose(next: File) {
    setError("");
    try {
      const opened = await openImage(next);
      setBitmap(opened);
      setFile(next);
      setOps(DEFAULT_OPS);
      setFormat(next.type === "image/png" ? "image/png" : next.type === "image/webp" ? "image/webp" : "image/jpeg");
      setOutput(null);
    } catch (caught) { setError((caught as Error).message); }
  }

  // Preview: in crop mode show the whole oriented image; otherwise the result.
  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    const preview = cropping ? orient(bitmap, ops.rotate, ops.flipX, ops.flipY) : render(bitmap, { ...ops, width: null }, 1400);
    const target = canvasRef.current;
    const scale = Math.min(1, 1400 / Math.max(preview.width, preview.height));
    target.width = Math.round(preview.width * scale);
    target.height = Math.round(preview.height * scale);
    target.getContext("2d")!.drawImage(preview, 0, 0, target.width, target.height);
    preview.width = 0;
  }, [bitmap, ops, cropping]);

  const oriented = bitmap ? (ops.rotate % 180 ? { w: bitmap.height, h: bitmap.width } : { w: bitmap.width, h: bitmap.height }) : null;
  const cropped = oriented ? { w: Math.round(oriented.w * (ops.crop?.w ?? 1)), h: Math.round(oriented.h * (ops.crop?.h ?? 1)) } : null;
  const outWidth = ops.width ?? cropped?.w ?? 0;
  const outHeight = cropped ? Math.round((outWidth / cropped.w) * cropped.h) : 0;

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)), y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)) };
  };
  function onDown(event: React.PointerEvent<HTMLCanvasElement>) { if (!cropping) return; event.currentTarget.setPointerCapture(event.pointerId); start.current = point(event); setDraft(null); }
  function onMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!cropping || !start.current || !oriented) return;
    const p = point(event);
    let w = Math.abs(p.x - start.current.x);
    let h = Math.abs(p.y - start.current.y);
    if (aspect) { const ratio = aspect * (oriented.h / oriented.w); if (w / h > ratio) w = h * ratio; else h = w / ratio; }
    setDraft({ x: p.x < start.current.x ? start.current.x - w : start.current.x, y: p.y < start.current.y ? start.current.y - h : start.current.y, w, h });
  }
  function onUp() { start.current = null; }

  async function exportImage(download: boolean) {
    if (!bitmap) return;
    setError("");
    try {
      const canvas = render(bitmap, ops);
      if (format === "image/jpeg") {
        // JPEG has no transparency: flatten onto white rather than black.
        const flat = makeCanvas(canvas.width, canvas.height);
        const ctx = flat.getContext("2d")!;
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, flat.width, flat.height);
        ctx.drawImage(canvas, 0, 0);
        canvas.width = 0;
        const blob = await canvasToBlob(flat, format, quality);
        setOutput({ size: blob.size, width: flat.width, height: flat.height });
        flat.width = 0;
        return download ? downloadBlob(`${file?.name.replace(/\.[^.]+$/, "") || "image"}-edited.jpg`, blob) : onSendToOcr(blob);
      }
      const blob = await canvasToBlob(canvas, format, format === "image/webp" ? quality : undefined);
      if (format === "image/webp" && blob.type !== "image/webp") throw new Error("This browser can't save WebP. Choose PNG or JPEG.");
      setOutput({ size: blob.size, width: canvas.width, height: canvas.height });
      canvas.width = 0;
      if (download) downloadBlob(`${file?.name.replace(/\.[^.]+$/, "") || "image"}-edited.${format === "image/png" ? "png" : "webp"}`, blob);
      else onSendToOcr(blob);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Export failed."); }
  }

  const setAdjust = (key: keyof typeof DEFAULT_ADJUST, value: number | boolean) => setOps((o) => ({ ...o, adjust: { ...o.adjust, [key]: value } }));

  if (!bitmap) return (<>{error ? <p className="utility-error" role="alert">{error}</p> : null}<Dropzone accept={IMAGE_TYPES.join(",")} label="Choose an image" hint={`PNG, JPG, WebP, BMP, GIF · up to ${MAX_BYTES / 1024 / 1024} MB`} onFile={choose} /></>);

  return (
    <div className="ws">
      <div className="ws-canvas-wrap">
        <div className="ws-canvas-inner">
        <canvas ref={canvasRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} aria-label={cropping ? "Drag to select the area to keep" : "Edited image preview"} style={{ cursor: cropping ? "crosshair" : "default" }} />
        {cropping && draft ? <div className="ws-crop" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }} aria-hidden="true" /> : null}
        </div>
      </div>
      <div className="utility-buttons ws-start ws-export">
        <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setOps((o) => ({ ...o, rotate: ((o.rotate + 270) % 360) as Ops["rotate"], crop: null }))} disabled={cropping}><ArrowCounterClockwise size={15} aria-hidden="true" /> Rotate left</button>
        <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setOps((o) => ({ ...o, rotate: ((o.rotate + 90) % 360) as Ops["rotate"], crop: null }))} disabled={cropping}><ArrowClockwise size={15} aria-hidden="true" /> Rotate right</button>
        <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setOps((o) => ({ ...o, flipX: !o.flipX, crop: null }))} disabled={cropping}><ArrowsHorizontal size={15} aria-hidden="true" /> Flip</button>
        <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setOps((o) => ({ ...o, flipY: !o.flipY, crop: null }))} disabled={cropping}><ArrowsVertical size={15} aria-hidden="true" /> Flip vertical</button>
        {cropping ? (
          <>
            <select className="ui-button ui-button-ghost ui-button-sm" value={aspect ?? ""} onChange={(e) => { setAspect(e.target.value ? Number(e.target.value) : null); setDraft(null); }} aria-label="Crop shape">
              <option value="">Free</option><option value="1">Square</option><option value={4 / 3}>4:3</option><option value={3 / 4}>3:4</option><option value={16 / 9}>16:9</option>
            </select>
            <button type="button" className="ui-button ui-button-primary ui-button-sm" onClick={() => { if (draft && draft.w > 0.01 && draft.h > 0.01) setOps((o) => ({ ...o, crop: draft, width: null })); setCropping(false); setDraft(null); }}><CropIcon size={15} aria-hidden="true" /> {draft ? "Apply crop" : "Done"}</button>
          </>
        ) : (
          <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => { setCropping(true); setDraft(ops.crop); }}><CropIcon size={15} aria-hidden="true" /> Crop</button>
        )}
        {ops.crop && !cropping ? <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => setOps((o) => ({ ...o, crop: null, width: null }))}>Remove crop</button> : null}
      </div>
      {cropping ? <p className="ws-muted">Drag across the image to choose the area to keep.</p> : null}

      <div className="ws-grid-2">
        {(["brightness", "contrast", "saturation"] as const).map((key) => (
          <label key={key} className="ws-range">{key[0].toUpperCase() + key.slice(1)} ({ops.adjust[key] > 0 ? "+" : ""}{ops.adjust[key]})
            <input type="range" min={-100} max={100} value={ops.adjust[key]} onChange={(e) => setAdjust(key, Number(e.target.value))} />
          </label>
        ))}
        <label className="ws-consent"><input type="checkbox" checked={ops.adjust.grayscale} onChange={(e) => setAdjust("grayscale", e.target.checked)} /> Black and white</label>
      </div>

      <div className="ws-grid-2">
        <label className="ws-field">Width in pixels (height follows)
          <input type="number" min={16} max={MAX_SIDE} value={outWidth || ""} onChange={(e) => { const v = Number(e.target.value); setOps((o) => ({ ...o, width: v >= 16 && v <= MAX_SIDE ? Math.round(v) : o.width })); }} />
        </label>
        <label className="ws-field">Format
          <select value={format} onChange={(e) => setFormat(e.target.value as typeof format)}><option value="image/jpeg">JPEG (smaller, no transparency)</option><option value="image/png">PNG (lossless)</option><option value="image/webp">WebP (small, modern)</option></select>
        </label>
        {format !== "image/png" ? <label className="ws-range">Quality ({Math.round(quality * 100)}%)<input type="range" min={0.4} max={1} step={0.05} value={quality} onChange={(e) => setQuality(Number(e.target.value))} /></label> : null}
      </div>
      <p className="ws-muted">Output {outWidth} × {outHeight}px{cropped && outWidth > cropped.w ? " · enlarging uses standard smoothing; it can't add detail" : ""}{output ? ` · last export ${formatBytes(output.size)} (original ${formatBytes(file!.size)})` : ""}</p>
      {error ? <p className="utility-error" role="alert">{error}</p> : null}
      <div className="utility-actions">
        <button type="button" className="ui-button ui-button-ghost" onClick={() => { bitmap.close(); setBitmap(null); setFile(null); setOps(DEFAULT_OPS); setOutput(null); }}><Eraser size={16} aria-hidden="true" /> New image</button>
        <div className="utility-buttons ws-export">
          <button type="button" className="ui-button ui-button-ghost" onClick={() => setOps(DEFAULT_OPS)}>Reset edits</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={() => exportImage(false)}><TextAa size={16} aria-hidden="true" /> Extract text</button>
          <button type="button" className="ui-button ui-button-primary" onClick={() => exportImage(true)}><DownloadSimple size={16} weight="bold" aria-hidden="true" /> Download</button>
        </div>
      </div>
    </div>
  );
}

type ScanPage = { id: string; bitmap: ImageBitmap; rotate: Ops["rotate"]; url: string };

function DocumentScanner({ onSendToOcr }: { onSendToOcr: (blob: Blob) => void }) {
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [mode, setMode] = useState<ScanMode>("document");
  const [status, setStatus] = useState<{ label: string; value: number | null } | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const pagesRef = useRef(pages);
  useEffect(() => { pagesRef.current = pages; }, [pages]);
  useEffect(() => () => pagesRef.current.forEach((p) => { p.bitmap.close(); URL.revokeObjectURL(p.url); }), []);

  const processPage = useCallback((page: ScanPage, maxSide: number) => {
    const oriented = orient(page.bitmap, page.rotate, false, false);
    const scale = Math.min(1, maxSide / Math.max(oriented.width, oriented.height));
    const canvas = makeCanvas(oriented.width * scale, oriented.height * scale);
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(oriented, 0, 0, canvas.width, canvas.height);
    oriented.width = 0;
    return scanFilter(canvas, mode);
  }, [mode]);

  async function refreshThumb(page: ScanPage) {
    const canvas = processPage(page, 400);
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.8);
    canvas.width = 0;
    return URL.createObjectURL(blob);
  }

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    const added: ScanPage[] = [];
    for (const file of Array.from(files)) {
      if (pages.length + added.length >= SCAN_MAX_PAGES) { setError(`Up to ${SCAN_MAX_PAGES} pages per PDF.`); break; }
      try {
        const bitmap = await openImage(file);
        const page: ScanPage = { id: Math.random().toString(36).slice(2), bitmap, rotate: 0, url: "" };
        page.url = await refreshThumb(page);
        added.push(page);
      } catch (caught) { setError(`${file.name}: ${(caught as Error).message}`); }
    }
    setPages((list) => [...list, ...added]);
  }

  useEffect(() => {
    let live = true;
    void (async () => {
      const current = pagesRef.current;
      const urls = await Promise.all(current.map((page) => refreshThumb(page)));
      if (!live) { urls.forEach((u) => URL.revokeObjectURL(u)); return; }
      current.forEach((p) => URL.revokeObjectURL(p.url));
      setPages((list) => list.map((p) => ({ ...p, url: urls[current.findIndex((c) => c.id === p.id)] ?? p.url })));
    })();
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-render thumbnails when the clean-up mode changes
  }, [mode]);

  async function rotatePage(id: string) {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const next = { ...page, rotate: ((page.rotate + 90) % 360) as Ops["rotate"] };
    URL.revokeObjectURL(page.url);
    next.url = await refreshThumb(next);
    setPages((list) => list.map((p) => (p.id === id ? next : p)));
  }
  const move = (index: number, delta: number) => setPages((list) => { const copy = [...list]; const [item] = copy.splice(index, 1); copy.splice(index + delta, 0, item); return copy; });
  const remove = (id: string) => setPages((list) => { const page = list.find((p) => p.id === id); if (page) { page.bitmap.close(); URL.revokeObjectURL(page.url); } return list.filter((p) => p.id !== id); });

  async function exportPdf() {
    setError("");
    try {
      const out = [];
      for (let i = 0; i < pages.length; i += 1) {
        setStatus({ label: `Preparing page ${i + 1} of ${pages.length}`, value: i / pages.length });
        const canvas = processPage(pages[i], 2200);
        const blob = await canvasToBlob(canvas, "image/jpeg", mode === "document" ? 0.82 : 0.88);
        out.push({ jpeg: new Uint8Array(await blob.arrayBuffer()), width: canvas.width, height: canvas.height });
        canvas.width = 0;
      }
      setStatus({ label: "Writing PDF", value: 1 });
      downloadBlob("scan.pdf", new Blob([buildImagePdf(out) as BlobPart], { type: "application/pdf" }));
    } catch (caught) { setError(caught instanceof Error ? caught.message : "PDF export failed."); }
    finally { setStatus(null); }
  }

  async function ocrPage(index: number) {
    const canvas = processPage(pages[index], 2600);
    const blob = await canvasToBlob(canvas, "image/png");
    canvas.width = 0;
    onSendToOcr(blob);
  }

  return (
    <div className="ws">
      <input ref={input} type="file" accept="image/*" capture="environment" multiple className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { void add(e.target.files); e.target.value = ""; }} />
      <div className="utility-actions">
        <fieldset className="utility-options">
          <legend>Clean-up</legend>
          {([["document", "Document (black & white)"], ["gray", "Grayscale"], ["original", "Colour"]] as [ScanMode, string][]).map(([key, label]) => <label key={key} className={`utility-chip ${mode === key ? "is-active" : ""}`}><input type="radio" className="sr-only" checked={mode === key} onChange={() => setMode(key)} />{label}</label>)}
        </fieldset>
        <button type="button" className="ui-button ui-button-primary" onClick={() => input.current?.click()} disabled={pages.length >= SCAN_MAX_PAGES}><Plus size={16} weight="bold" aria-hidden="true" /> {pages.length ? "Add pages" : "Take or choose photos"}</button>
      </div>
      <p className="ws-muted">Photograph each page flat, in good light, filling the frame. On a phone, the button opens the camera. Crop crooked photos in Edit &amp; convert first; automatic edge detection isn&apos;t available.</p>
      {pages.length ? (
        <ol className="ws-thumbs">
          {pages.map((page, index) => (
            <li key={page.id}>
              <figure>
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={page.url} alt={`Page ${index + 1}`} />
                <figcaption>Page {index + 1}</figcaption>
              </figure>
              <div className="ws-terms">
                <button type="button" className="ws-link" onClick={() => rotatePage(page.id)} aria-label={`Rotate page ${index + 1}`}><ArrowClockwise size={14} aria-hidden="true" /></button>
                <button type="button" className="ws-link" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move page ${index + 1} up`}><ArrowUp size={14} aria-hidden="true" /></button>
                <button type="button" className="ws-link" onClick={() => move(index, 1)} disabled={index === pages.length - 1} aria-label={`Move page ${index + 1} down`}><ArrowDown size={14} aria-hidden="true" /></button>
                <button type="button" className="ws-link" onClick={() => ocrPage(index)} aria-label={`Extract text from page ${index + 1}`}><Scan size={14} aria-hidden="true" /></button>
                <button type="button" className="ws-link" onClick={() => remove(page.id)} aria-label={`Remove page ${index + 1}`}><Trash size={14} aria-hidden="true" /></button>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {status ? <ProgressBar label={status.label} value={status.value} /> : null}
      {error ? <p className="utility-error" role="alert">{error}</p> : null}
      <div className="utility-actions">
        <p className="utility-count">{pages.length} page{pages.length === 1 ? "" : "s"} · A4 PDF, one image per page</p>
        <div className="utility-buttons">
          <button type="button" className="ui-button ui-button-primary" onClick={exportPdf} disabled={!pages.length || Boolean(status)}><FilePdf size={16} weight="bold" aria-hidden="true" /> Download PDF</button>
        </div>
      </div>
    </div>
  );
}

function TextExtractor({ initial, onConsumed }: { initial: Blob | null; onConsumed: () => void }) {
  const [text, setText] = useState("");
  const [meta, setMeta] = useState("");
  const [progress, setProgress] = useState<{ label: string; value: number | null } | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const ocr = useCallback(async (image: Blob, label: string) => {
    setError("");
    setProgress({ label: "Loading recognition model", value: null });
    try {
      const result = await recognizeImage(image, ({ status, progress: p }) => setProgress({ label: ocrStatusLabel(status), value: Number.isFinite(p) ? p : null }));
      if (!result.text) throw new Error("No readable text was found. Try a sharper, larger or higher-contrast image.");
      setText((current) => (current.trim() ? `${current.trim()}\n\n${result.text}` : result.text));
      setMeta(`${label} · OCR confidence ${result.confidence}%${result.confidence < 70 ? " (low: check carefully)" : ""}`);
    } catch (caught) {
      setError(caught instanceof Error && caught.message.startsWith("No readable") ? caught.message : "Text recognition failed. Check your connection (the model downloads on first use) and try again.");
    } finally { setProgress(null); }
  }, []);

  useEffect(() => {
    if (!initial) return;
    onConsumed();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- run OCR once on the handed-over image
    void ocr(initial, "From the editor");
  }, [initial, ocr, onConsumed]);

  async function choose(file: File) {
    setError("");
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      setProgress({ label: "Opening PDF", value: null });
      try {
        const result = await extractPdf(file, (label, value) => setProgress({ label, value }));
        setText(result.texts.map((p) => `[Page ${p.page}${p.ocr ? ", OCR" : ""}]\n${p.text}`).join("\n\n"));
        setMeta(`${result.name} · ${result.pages} pages${result.ocrPages.length ? ` · ${result.ocrPages.length} scanned pages read with OCR` : ""}${result.skippedOcr ? ` · ${result.skippedOcr} scanned pages skipped` : ""}`);
      } catch (caught) { setError(caught instanceof PdfError ? caught.message : "This PDF couldn't be read."); }
      finally { setProgress(null); }
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) { setError("Please choose an image or a PDF."); return; }
    if (file.size > MAX_BYTES) { setError(`That image is larger than ${MAX_BYTES / 1024 / 1024} MB.`); return; }
    await ocr(file, file.name);
  }

  const flash = (message: string) => { setNotice(message); setTimeout(() => setNotice(""), 1600); };

  return (
    <div className="ws">
      {progress ? <ProgressBar label={progress.label} value={progress.value} /> : <Dropzone accept={`${IMAGE_TYPES.join(",")},application/pdf,.pdf`} label={text ? "Add another image or PDF" : "Choose an image or PDF"} hint={`images up to ${MAX_BYTES / 1024 / 1024} MB · PDFs up to ${PDF_MAX_BYTES / 1024 / 1024} MB`} onFile={choose} />}
      {error ? <p className="utility-error" role="alert"><WarningCircle size={16} aria-hidden="true" /> {error}</p> : null}
      <label htmlFor="ids-text" className="utility-label">Extracted text {meta ? <span className="lt-meta">· {meta}</span> : null}</label>
      <textarea id="ids-text" className="utility-textarea" rows={14} value={text} onChange={(e) => setText(e.target.value)} placeholder="Text from your image or PDF appears here. Correct anything the OCR misread." />
      <div className="utility-actions">
        <p className="utility-count" aria-live="polite">{notice || (text ? `${text.length.toLocaleString("en-US")} characters` : "English OCR · printed text works best")}</p>
        <div className="utility-buttons ws-export">
          <button type="button" className="ui-button ui-button-ghost" onClick={() => { setText(""); setMeta(""); }} disabled={!text}><Eraser size={16} aria-hidden="true" /> Clear</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={async () => flash((await copyText(text)) ? "Copied" : "Copy blocked")} disabled={!text}><Copy size={16} aria-hidden="true" /> Copy</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("extracted-text.txt", text)} disabled={!text}><DownloadSimple size={16} aria-hidden="true" /> .txt</button>
          <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadFile("extracted-text.html", textToHtmlDocument("Extracted text", text), "text/html")} disabled={!text}><DownloadSimple size={16} aria-hidden="true" /> Doc (.html)</button>
        </div>
      </div>
    </div>
  );
}
