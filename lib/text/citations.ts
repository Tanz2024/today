// Citation lookup against Crossref's free public REST API. Called only when
// the visitor explicitly searches; only the search string (a DOI or title)
// is sent, never their document. Formatting uses the returned metadata
// alone: a field Crossref doesn't have is left out, never guessed.

export type Work = {
  doi: string;
  title: string;
  authors: { given?: string; family?: string; name?: string }[];
  year: number | null;
  month: number | null;
  container: string;
  volume: string;
  issue: string;
  pages: string;
  publisher: string;
  type: string;
  url: string;
};

export const CROSSREF_API = "https://api.crossref.org";
const DOI_RE = /\b(10\.\d{4,9}\/[^\s"<>]+)/i;

export function extractDoi(input: string) {
  const match = input.trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "").match(DOI_RE);
  return match ? match[1].replace(/[.,;]+$/, "") : null;
}

type CrossrefItem = {
  DOI: string; title?: string[]; author?: { given?: string; family?: string; name?: string }[];
  issued?: { "date-parts"?: (number | null)[][] }; published?: { "date-parts"?: (number | null)[][] };
  "container-title"?: string[]; volume?: string; issue?: string; page?: string; publisher?: string; type?: string; URL?: string;
};

export function toWork(item: CrossrefItem): Work {
  const parts = item.issued?.["date-parts"]?.[0] ?? item.published?.["date-parts"]?.[0] ?? [];
  return {
    doi: item.DOI,
    title: (item.title?.[0] ?? "").replace(/<[^>]+>/g, "").trim(),
    authors: item.author ?? [],
    year: typeof parts[0] === "number" ? parts[0] : null,
    month: typeof parts[1] === "number" ? parts[1] : null,
    container: item["container-title"]?.[0] ?? "",
    volume: item.volume ?? "",
    issue: item.issue ?? "",
    pages: item.page ?? "",
    publisher: item.publisher ?? "",
    type: item.type ?? "",
    url: item.URL ?? `https://doi.org/${item.DOI}`,
  };
}

export async function lookupCitation(query: string, signal?: AbortSignal): Promise<Work[]> {
  const doi = extractDoi(query);
  const url = doi
    ? `${CROSSREF_API}/works/${encodeURIComponent(doi)}`
    : `${CROSSREF_API}/works?rows=5&select=DOI,title,author,issued,published,container-title,volume,issue,page,publisher,type,URL&query.bibliographic=${encodeURIComponent(query.trim().slice(0, 300))}`;
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (response.status === 404) return [];
  if (!response.ok) throw new Error(`Crossref returned an error (${response.status}). Try again later.`);
  const data = (await response.json()) as { message: CrossrefItem | { items: CrossrefItem[] } };
  const items = "items" in data.message ? data.message.items : [data.message];
  return items.filter((item) => item.DOI && item.title?.[0]).map(toWork);
}

const initials = (given = "") => given.split(/[\s-]+/).filter(Boolean).map((part) => `${part[0].toUpperCase()}.`).join(" ");
const nameOf = (a: Work["authors"][number]) => a.name ?? a.family ?? "";

function apaAuthors(authors: Work["authors"]) {
  const list = authors.map((a) => (a.family ? `${a.family}, ${initials(a.given)}`.replace(/, $/, "") : nameOf(a))).filter(Boolean);
  if (list.length <= 1) return list[0] ?? "";
  if (list.length <= 20) return `${list.slice(0, -1).join(", ")}, & ${list.at(-1)}`;
  return `${list.slice(0, 19).join(", ")}, … ${list.at(-1)}`;
}

export type CitationStyle = "apa" | "mla" | "harvard" | "bibtex";

export function formatCitation(work: Work, style: CitationStyle): string {
  const doiUrl = `https://doi.org/${work.doi}`;
  const year = work.year ? String(work.year) : "n.d.";
  const loc = [work.volume && (style === "apa" ? `${work.volume}` : `vol. ${work.volume}`), work.issue && (style === "apa" ? `(${work.issue})` : `no. ${work.issue}`)].filter(Boolean);
  if (style === "apa") {
    const source = [work.container, [work.volume, work.issue ? `(${work.issue})` : ""].join("") || "", work.pages].filter(Boolean).join(", ");
    return [apaAuthors(work.authors) || work.title, `(${year}).`, apaAuthors(work.authors) ? `${work.title}.` : "", source ? `${source}.` : work.publisher ? `${work.publisher}.` : "", doiUrl].filter(Boolean).join(" ");
  }
  if (style === "mla") {
    const first = work.authors[0];
    const who = !first ? "" : work.authors.length === 1 ? (first.family ? `${first.family}, ${first.given ?? ""}`.trim() : nameOf(first)) : work.authors.length === 2 ? `${first.family}, ${first.given ?? ""}, and ${work.authors[1].given ?? ""} ${work.authors[1].family ?? nameOf(work.authors[1])}`.replace(/\s+/g, " ") : `${first.family ?? nameOf(first)}, ${first.given ?? ""}, et al`.replace(/\s+/g, " ");
    const pieces = [who ? `${who.replace(/[.,\s]+$/, "")}.` : "", `“${work.title}.”`, work.container ? `${work.container},` : "", loc.length ? `${loc.join(", ")},` : "", work.year ? `${work.year},` : "", work.pages ? `pp. ${work.pages},` : "", `${doiUrl}.`];
    return pieces.filter(Boolean).join(" ").replace(/,\s*(https)/, ", $1");
  }
  if (style === "harvard") {
    const names = work.authors.map((a) => (a.family ? `${a.family}, ${initials(a.given)}` : nameOf(a))).filter(Boolean);
    const who = names.length > 3 ? `${names[0]} et al.` : names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0] ?? "";
    return [who || work.title, `(${year})`, who ? `'${work.title}',` : "", work.container ? `${work.container},` : "", loc.length ? `${loc.join(", ")},` : "", work.pages ? `pp. ${work.pages}.` : "", `Available at: ${doiUrl}.`].filter(Boolean).join(" ").replace(/,\s*Available/, ". Available");
  }
  const key = `${(work.authors[0]?.family ?? work.authors[0]?.name ?? "ref").replace(/[^A-Za-z]/g, "").toLowerCase()}${work.year ?? ""}`;
  const authors = work.authors.map((a) => (a.family ? `${a.family}, ${a.given ?? ""}`.replace(/, $/, "") : nameOf(a))).join(" and ");
  const fields: [string, string][] = [["author", authors], ["title", work.title], [work.type === "journal-article" ? "journal" : "booktitle", work.container], ["year", work.year ? String(work.year) : ""], ["volume", work.volume], ["number", work.issue], ["pages", work.pages.replace("-", "--")], ["publisher", work.publisher], ["doi", work.doi]];
  return `@${work.type === "journal-article" ? "article" : "misc"}{${key},\n${fields.filter(([, v]) => v).map(([k, v]) => `  ${k} = {${v}}`).join(",\n")}\n}`;
}
