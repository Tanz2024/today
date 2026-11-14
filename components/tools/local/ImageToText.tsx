"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, DownloadSimple, Eraser, TextAa } from "@phosphor-icons/react";
import Dropzone, { ProgressBar, downloadText } from "./Dropzone";
import { ocrStatusLabel, recognizeImage, releaseOcr } from "@/lib/ocr-client";
import { OCR_MAX_BYTES } from "@/lib/local-ai-tools";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/bmp", "image/gif"];

export default function ImageToText() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState<{ label: string; value: number | null }>({ label: "", value: null });
  const [text, setText] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef("");

  useEffect(() => () => { if (previewRef.current) URL.revokeObjectURL(previewRef.current); void releaseOcr(); }, []);

  function choose(next: File) {
    setError("");
    if (!TYPES.includes(next.type)) { setError("Please choose a PNG, JPG, WebP, BMP or GIF image."); setStatus("error"); return; }
    if (next.size > OCR_MAX_BYTES) { setError(`That image is larger than ${OCR_MAX_BYTES / 1024 / 1024} MB.`); setStatus("error"); return; }
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = URL.createObjectURL(next);
    setPreview(previewRef.current);
    setFile(next);
    setText("");
    setConfidence(null);
    setStatus("idle");
  }

  async function run() {
    if (!file) return;
    setStatus("working");
    setError("");
    setProgress({ label: "Loading recognition model", value: null });
    try {
      const result = await recognizeImage(file, ({ status: s, progress: p }) => setProgress({ label: ocrStatusLabel(s), value: Number.isFinite(p) ? p : null }));
      if (!result.text) throw new Error("No readable text was found. Try a sharper, larger or higher-contrast image.");
      setText(result.text);
      setConfidence(result.confidence);
      setStatus("done");
    } catch (caught) {
      setError(caught instanceof Error && caught.message.startsWith("No readable") ? caught.message : "Text recognition failed. Check your connection (the model downloads on first use) and try again.");
      setStatus("error");
    }
  }

  function clear() {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = "";
    setPreview("");
    setFile(null);
    setText("");
    setError("");
    setConfidence(null);
    setStatus("idle");
  }

  async function copy() {
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* text stays selectable */ }
  }

  return (
    <div className="utility-panel lt-panel">
      {!file ? (
        <Dropzone accept={TYPES.join(",")} label="Choose an image" hint={`PNG, JPG, WebP · up to ${OCR_MAX_BYTES / 1024 / 1024} MB`} onFile={choose} />
      ) : (
        <div className="lt-split">
          <figure className="lt-media">
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={preview} alt="The image you selected" />
            <figcaption>{file.name}</figcaption>
          </figure>
          <div className="lt-result">
            <label htmlFor="ocr-text" className="utility-label">Extracted text {confidence !== null ? <span className="lt-meta">· model confidence {confidence}%</span> : null}</label>
            {status === "working" ? <ProgressBar label={progress.label} value={progress.value} /> : null}
            <textarea id="ocr-text" className="utility-textarea" rows={12} value={text} onChange={(event) => setText(event.target.value)} placeholder={status === "working" ? "" : "Select Extract text to read this image."} />
          </div>
        </div>
      )}
      {status === "error" ? <p className="utility-error" role="alert">{error}</p> : null}
      <div className="utility-actions">
        <p className="utility-count">{text ? `${text.length.toLocaleString("en-US")} characters` : "Runs in your browser"}</p>
        <div className="utility-buttons">
          <button type="button" className="ui-button ui-button-ghost" onClick={clear} disabled={!file || status === "working"}><Eraser size={16} aria-hidden="true" /> Clear</button>
          {text ? <button type="button" className="ui-button ui-button-ghost" onClick={copy}>{copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copied ? "Copied" : "Copy"}</button> : null}
          {text ? <button type="button" className="ui-button ui-button-ghost" onClick={() => downloadText("image-text.txt", text)}><DownloadSimple size={16} aria-hidden="true" /> .txt</button> : null}
          <button type="button" className="ui-button ui-button-primary" onClick={run} disabled={!file || status === "working"}><TextAa size={16} weight="bold" aria-hidden="true" /> {status === "working" ? "Reading…" : "Extract text"}</button>
        </div>
      </div>
    </div>
  );
}
