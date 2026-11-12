"use client";
import { useState } from "react";
import type { CurationConfig } from "@/lib/homepage-curation-core";

export default function CurationAdmin({ initialSections }: { initialSections: CurationConfig[] }) {
  const [token, setToken] = useState("");
  const [sections, setSections] = useState(initialSections);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  async function load(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/admin/curation", { headers: { authorization: `Bearer ${token}` } });
    if (!response.ok) { setMessage("Could not load. Check the admin token."); setLoaded(false); return; }
    const result = await response.json();
    setSections(result.sections ?? []);
    setLoaded(true);
    setMessage("");
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const config = { section: String(form.get("section")), mode: String(form.get("mode")), slots: Number(form.get("slots")), pinnedArticleIds: String(form.get("pinned") ?? "").split(",").map((item) => item.trim()).filter(Boolean) };
    const response = await fetch("/api/admin/curation", { method: "PUT", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify(config) });
    if (!response.ok) { setMessage("Could not save. Check the admin token."); return; }
    const saved = await response.json(); setSections((current) => [...current.filter((item) => item.section !== saved.section), saved]); setMessage("Saved.");
  }
  return <main className="mx-auto max-w-4xl px-6 py-12"><h1 className="font-heading text-4xl font-semibold">Homepage curation</h1><p className="mt-3 text-muted">Enter the curation token to view or change homepage settings.</p><form onSubmit={load} className="mt-8 flex gap-3"><input className="min-w-0 flex-1 border p-3" aria-label="Curation admin token" type="password" value={token} onChange={(event) => setToken(event.target.value)} required /><button className="border bg-black px-4 py-3 text-white" type="submit">Load</button></form>{loaded && <><div className="mt-8 space-y-4">{sections.map((section) => <div className="border p-5" key={section.section}><div className="flex justify-between"><strong>{section.section}</strong><span>{section.mode} · {section.slots} slots</span></div><p className="mt-2 text-sm text-muted">Pinned: {section.pinnedArticleIds?.join(", ") || "none"}</p></div>)}</div><form onSubmit={save} className="mt-10 grid gap-3 border-t pt-8 sm:grid-cols-4"><input className="border p-3" name="section" placeholder="Section name" required /><select className="border p-3" name="mode" defaultValue="HYBRID"><option>AUTO</option><option>MANUAL</option><option>HYBRID</option></select><input className="border p-3" name="slots" type="number" min="1" max="20" defaultValue="3" /><input className="border p-3" name="pinned" placeholder="Published slugs, comma-separated" /><button className="border bg-black px-4 py-3 text-white sm:col-span-4" type="submit">Save curation settings</button></form></>}{message && <p className="mt-4 text-sm">{message}</p>}</main>;
}
