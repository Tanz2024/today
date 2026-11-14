"use client";

// Local-only downloads and clipboard for the workspaces. Files are built in
// memory and handed to the browser; nothing is uploaded.

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadFile(filename: string, text: string, type = "text/plain") {
  downloadBlob(filename, new Blob([text], { type: `${type};charset=utf-8` }));
}

export async function copyText(text: string) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

const escapeHtml = (text: string) => text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** A standalone HTML document (opens in Word, Pages and Google Docs). */
export function textToHtmlDocument(title: string, text: string) {
  const body = text.split(/\n\s*\n/).map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`).join("\n");
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>body{font:12pt/1.6 Georgia,serif;max-width:42rem;margin:2rem auto;padding:0 1rem;color:#111}</style></head><body>\n${body}\n</body></html>`;
}

export { escapeHtml };
