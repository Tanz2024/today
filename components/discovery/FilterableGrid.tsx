"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MagnifyingGlass, X } from "@phosphor-icons/react";

export type FilterItem = { key: string; category: string; text: string; node: ReactNode };

/**
 * Search box + category chips over a server-rendered list. Every item is in
 * the HTML from the first render, so the full list stays crawlable; filtering
 * only hides items on the client.
 */
export default function FilterableGrid({ items, categories, label, placeholder, emptyHint }: { items: FilterItem[]; categories: { slug: string; name: string }[]; label: string; placeholder: string; emptyHint: ReactNode }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const present = categories.filter((item) => items.some((entry) => entry.category === item.slug));
  const q = query.trim().toLowerCase();
  const visible = useMemo(() => new Set(items.filter((item) => (category === "all" || item.category === category) && (!q || item.text.toLowerCase().includes(q))).map((item) => item.key)), [items, category, q]);

  return (
    <div>
      <div className="d-filter-bar">
        <label className="d-search">
          <MagnifyingGlass size={18} aria-hidden="true" />
          <span className="sr-only">{label}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label="Clear search"><X size={16} aria-hidden="true" /></button> : null}
        </label>
        <div className="d-chips" role="group" aria-label="Filter by category">
          <button type="button" className={`topic-chip ${category === "all" ? "is-selected" : ""}`} aria-pressed={category === "all"} onClick={() => setCategory("all")}>All</button>
          {present.map((item) => (
            <button key={item.slug} type="button" className={`topic-chip ${category === item.slug ? "is-selected" : ""}`} aria-pressed={category === item.slug} onClick={() => setCategory(item.slug)}>{item.name}</button>
          ))}
        </div>
      </div>
      <p className="sr-only" aria-live="polite">{visible.size} results</p>
      <ul className="card-grid card-grid-3 mt-6">
        {items.map((item) => <li key={item.key} hidden={!visible.has(item.key)}>{item.node}</li>)}
      </ul>
      {visible.size === 0 ? <div className="empty-state"><h2>Nothing matches “{query}”</h2><p>{emptyHint}</p></div> : null}
    </div>
  );
}
