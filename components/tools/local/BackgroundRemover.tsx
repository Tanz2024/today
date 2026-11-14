"use client";

import { useEffect, useRef, useState } from "react";
import { DownloadSimple, Eraser, MagicWand } from "@phosphor-icons/react";
import Dropzone, { ProgressBar } from "./Dropzone";
import { BG_MAX_BYTES, BG_MAX_SIDE } from "@/lib/local-ai-tools";

const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MODEL_ID = "Xenova/modnet";

type Loaded = { model: (inputs: Record<string, unknown>) => Promise<Record<string, { mul: (n: number) => { to: (t: string) => unknown } }[]>>; processor: (image: unknown) => Promise<{ pixel_values: unknown }> };
let modelPromise: Promise<Loaded> | null = null;

/** MODNet portrait matting, loaded once per page view (cached by the browser). */
function loadModel(onProgress: (value: number | null) => void) {
  if (!modelPromise) {
    const files = new Map<string, { loaded: number; total: number }>();
    modelPromise = import("@huggingface/transformers").then(async ({ AutoModel, AutoProcessor }) => {
      const progress_callback = (event: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (event.status !== "progress" || !event.file || !event.total) return;
        files.set(event.file, { loaded: event.loaded ?? 0, total: event.total });
        const all = [...files.values()];
        onProgress(all.reduce((sum, f) => sum + f.loaded, 0) / all.reduce((sum, f) => sum + f.total, 0));
      };
      const [model, processor] = await Promise.all([
        AutoModel.from_pretrained(MODEL_ID, { dtype: "fp32", progress_callback }),
        AutoProcessor.from_pretrained(MODEL_ID, { progress_callback }),
      ]);
      return { model, processor } as unknown as Loaded;
    });
    modelPromise.catch(() => { modelPromise = null; });
  }
  return modelPromise;
}

export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState("");
  const [result, setResult] = useState("");
  const [view, setView] = useState<"after" | "before">("after");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState<{ label: string; value: number | null }>({ label: "", value: null });
  const [error, setError] = useState("");
  const urls = useRef<string[]>([]);

  const track = (url: string) => { urls.current.push(url); return url; };
  const revokeAll = () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); urls.current = []; };
  useEffect(() => revokeAll, []);

  function fail(message: string) { setError(message); setStatus("error"); }

  async function choose(next: File) {
    setError("");
    if (!TYPES.includes(next.type)) return fail("Please choose a JPG, PNG or WebP image.");
    if (next.size > BG_MAX_BYTES) return fail(`That image is larger than ${BG_MAX_BYTES / 1024 / 1024} MB.`);
    const bitmap = await createImageBitmap(next).catch(() => null);
    if (!bitmap) return fail("That image couldn't be opened. Try another file.");
    const tooBig = Math.max(bitmap.width, bitmap.height) > BG_MAX_SIDE;
    bitmap.close();
    if (tooBig) return fail(`Please use an image no larger than ${BG_MAX_SIDE}px on its longest side.`);
    revokeAll();
    setFile(next);
    setOriginal(track(URL.createObjectURL(next)));
    setResult("");
    setStatus("idle");
  }

  async function run() {
    if (!file) return;
    setStatus("working");
    setError("");
    setProgress({ label: "Downloading model (about 26 MB, first time only)", value: 0 });
    try {
      const { model, processor } = await loadModel((value) => setProgress({ label: "Downloading model (about 26 MB, first time only)", value }));
      setProgress({ label: "Finding the subject", value: null });
      const { RawImage } = await import("@huggingface/transformers");
      const image = await RawImage.fromURL(original);
      const { pixel_values } = await processor(image);
      const { output } = await model({ input: pixel_values });
      const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8") as never).resize(image.width, image.height);

      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d")!;
      const bitmap = await createImageBitmap(file);
      context.drawImage(bitmap, 0, 0, image.width, image.height);
      bitmap.close();
      const pixels = context.getImageData(0, 0, image.width, image.height);
      for (let i = 0; i < mask.data.length; i += 1) pixels.data[i * 4 + 3] = mask.data[i];
      context.putImageData(pixels, 0, 0);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      canvas.width = canvas.height = 0;
      if (!blob) throw new Error("encode");
      setResult(track(URL.createObjectURL(blob)));
      setView("after");
      setStatus("done");
    } catch {
      fail("Background removal failed. Check your connection (the model downloads on first use) and try again, or try a smaller image.");
    }
  }

  function clear() {
    revokeAll();
    setFile(null);
    setOriginal("");
    setResult("");
    setError("");
    setStatus("idle");
  }

  const filename = `${file?.name.replace(/\.[^.]+$/, "") || "image"}-no-background.png`;

  return (
    <div className="utility-panel lt-panel">
      {!file ? (
        <Dropzone accept={TYPES.join(",")} label="Choose a photo" hint={`JPG, PNG, WebP · up to ${BG_MAX_BYTES / 1024 / 1024} MB · works best with people`} onFile={choose} />
      ) : (
        <>
          {result ? (
            <div className="lt-toggle" role="group" aria-label="Preview">
              <button type="button" aria-pressed={view === "before"} onClick={() => setView("before")}>Before</button>
              <button type="button" aria-pressed={view === "after"} onClick={() => setView("after")}>After</button>
            </div>
          ) : null}
          <figure className={`lt-media lt-stage ${result && view === "after" ? "is-checker" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={result && view === "after" ? result : original} alt={result && view === "after" ? "Your photo with the background removed" : "Your original photo"} />
          </figure>
          {status === "working" ? <ProgressBar label={progress.label} value={progress.value} /> : null}
        </>
      )}
      {status === "error" ? <p className="utility-error" role="alert">{error}</p> : null}
      <div className="utility-actions">
        <p className="utility-count">Runs in your browser · portraits work best</p>
        <div className="utility-buttons">
          <button type="button" className="ui-button ui-button-ghost" onClick={clear} disabled={!file || status === "working"}><Eraser size={16} aria-hidden="true" /> {result ? "New image" : "Clear"}</button>
          {result ? <a className="ui-button ui-button-primary" href={result} download={filename}><DownloadSimple size={16} weight="bold" aria-hidden="true" /> Download PNG</a> : (
            <button type="button" className="ui-button ui-button-primary" onClick={run} disabled={!file || status === "working"}><MagicWand size={16} weight="bold" aria-hidden="true" /> {status === "working" ? "Working…" : "Remove background"}</button>
          )}
        </div>
      </div>
    </div>
  );
}
