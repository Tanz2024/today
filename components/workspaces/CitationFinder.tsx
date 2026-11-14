"use client";

import { useRef, useState } from "react";
import { BookOpen, Copy, Globe, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { formatCitation, lookupCitation, type CitationStyle, type Work } from "@/lib/text/citations";
import { copyText } from "@/lib/workspace-files";

const STYLES: { key: CitationStyle; label: string }[] = [{ key: "apa", label: "APA 7" }, { key: "mla", label: "MLA 9" }, { key: "harvard", label: "Harvard" }, { key: "bibtex", label: "BibTeX" }];

/**
 * Online reference lookup via Crossref. Off until the visitor opts in, and
 * only the search box text is sent. Results come straight from Crossref's
 * records; nothing is generated.
 */
export default function CitationFinder({ onInsert }: { onInsert: (reference: string) => void }) {
  const [online, setOnline] = useState(false);
  const [query, setQuery] = useState("");
  const [style, setStyle] = useState<CitationStyle>("apa");
  const [results, setResults] = useState<Work[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");
  const abort = useRef<AbortController | null>(null);

  async function search(event: React.FormEvent) {
    event.preventDefault();
    if (!online || query.trim().length < 4) return;
    abort.current?.abort();
    abort.current = new AbortController();
    setStatus("loading");
    setError("");
    try {
      const found = await lookupCitation(query, abort.current.signal);
      setResults(found);
    } catch (caught) {
      if ((caught as Error).name !== "AbortError") setError(caught instanceof Error && caught.message.startsWith("Crossref") ? caught.message : "Couldn't reach Crossref. Check your connection and try again.");
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="ws-card" aria-labelledby="ws-cite">
      <div className="utility-output-head"><h2 id="ws-cite"><BookOpen size={16} aria-hidden="true" /> Find a real reference</h2></div>
      <p className="ws-muted">Look up a DOI or a paper&apos;s title in <a href="https://www.crossref.org/" target="_blank" rel="noreferrer">Crossref</a>, the free scholarly metadata registry. References are formatted from Crossref&apos;s record only; nothing is invented. Always check against the original publication.</p>
      <label className="ws-consent">
        <input type="checkbox" checked={online} onChange={(event) => { setOnline(event.target.checked); setResults(null); }} />
        <span><Globe size={14} aria-hidden="true" /> Allow online lookup. Only what you type in the search box is sent to api.crossref.org. Your document is not sent.</span>
      </label>
      <form className="lt-ask" onSubmit={search}>
        <label htmlFor="ws-cite-q" className="sr-only">DOI or title</label>
        <input id="ws-cite-q" className="utility-textarea lt-input" value={query} maxLength={300} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. 10.1038/nature14539 or Deep learning LeCun 2015" disabled={!online} />
        <button type="submit" className="ui-button ui-button-primary" disabled={!online || query.trim().length < 4 || status === "loading"}><MagnifyingGlass size={16} weight="bold" aria-hidden="true" /> {status === "loading" ? "Searching…" : "Search"}</button>
      </form>
      {online ? (
        <fieldset className="utility-options">
          <legend>Style</legend>
          {STYLES.map((item) => <label key={item.key} className={`utility-chip ${style === item.key ? "is-active" : ""}`}><input type="radio" name="cite-style" className="sr-only" checked={style === item.key} onChange={() => setStyle(item.key)} />{item.label}</label>)}
        </fieldset>
      ) : null}
      {error ? <p className="utility-error" role="alert">{error}</p> : null}
      {results && !results.length ? <p className="utility-placeholder">Crossref has no matching record. Check the DOI or try more of the exact title.</p> : null}
      {results?.length ? (
        <ul className="ws-refs">
          {results.map((work) => {
            const reference = formatCitation(work, style);
            return (
              <li key={work.doi}>
                <p className={style === "bibtex" ? "is-mono" : ""}>{reference}</p>
                <p className="ws-muted">{work.type.replace(/-/g, " ")} · <a href={`https://doi.org/${work.doi}`} target="_blank" rel="noreferrer">doi.org/{work.doi}</a>{!work.year ? " · no publication date in record" : ""}{!work.authors.length ? " · no authors in record" : ""}</p>
                <div className="utility-buttons">
                  <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={async () => { if (await copyText(reference)) { setCopied(work.doi); setTimeout(() => setCopied(""), 1500); } }}><Copy size={14} aria-hidden="true" /> {copied === work.doi ? "Copied" : "Copy"}</button>
                  <button type="button" className="ui-button ui-button-ghost ui-button-sm" onClick={() => onInsert(reference)}><Plus size={14} aria-hidden="true" /> Add to text</button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
