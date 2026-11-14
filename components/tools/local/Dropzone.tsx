"use client";

import { useRef, useState } from "react";
import { UploadSimple } from "@phosphor-icons/react";

/** Click-or-drop file picker. Validation is the caller's job. */
export default function Dropzone({ accept, hint, label, onFile, disabled = false }: { accept: string; hint: string; label: string; onFile: (file: File) => void; disabled?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <div
      className={`lt-drop ${over ? "is-over" : ""}`}
      onDragOver={(event) => { event.preventDefault(); if (!disabled) setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const file = event.dataTransfer.files?.[0];
        if (file && !disabled) onFile(file);
      }}
    >
      <UploadSimple size={28} weight="bold" aria-hidden="true" />
      <button type="button" className="ui-button ui-button-primary" onClick={() => input.current?.click()} disabled={disabled}>{label}</button>
      <p className="lt-drop-hint">or drop a file here · {hint}</p>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onFile(file);
        }}
      />
    </div>
  );
}

export function ProgressBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="lt-progress" role="status" aria-live="polite">
      <div className="lt-progress-head"><span>{label}</span>{value !== null ? <span>{Math.round(value * 100)}%</span> : null}</div>
      <div className="lt-progress-track" aria-hidden="true"><span className={value === null ? "is-indeterminate" : ""} style={value !== null ? { width: `${Math.max(2, value * 100)}%` } : undefined} /></div>
    </div>
  );
}

export function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
