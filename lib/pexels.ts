import "server-only";
import { boundedFetch } from "@/lib/bounded-fetch";

// Bounded so a slow or down provider cannot stall rendering/static generation.
const providerFetch = (input: string | URL, init: RequestInit & { next?: { revalidate?: number } } = {}) =>
  boundedFetch(input, { ...init, provider: "Pexels", timeoutMs: 6000 });


export type PexelsPhoto = { id: number; width: number; height: number; photographer: string; photographerUrl: string; pexelsUrl: string; src: { original: string; large2x: string; large: string; medium: string }; alt: string };
export type EditorialPhoto = { src: string; alt: string; photographer: string; photographerUrl: string; pexelsUrl: string };

export async function getAboutPhoto(): Promise<EditorialPhoto | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  try {
    const params = new URLSearchParams({ query: "young friends urban lifestyle candid socializing", orientation: "landscape", size: "large", per_page: "20" });
    const response = await providerFetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key, Accept: "application/json" }, next: { revalidate: 604800 } });
    if (!response.ok) return null;
    const data = await response.json() as { photos?: PexelsPhoto[] };
    const positive = ["friends", "friend", "young", "laugh", "social", "together", "urban", "city", "outdoor", "smil", "conversation"];
    const negative = ["business", "office", "corporate", "meeting", "laptop", "formal", "wedding"];
    const score = (photo: PexelsPhoto) => { const text = (photo.alt || "").toLowerCase(); return positive.reduce((total, term) => total + (text.includes(term) ? 2 : 0), 0) - negative.reduce((total, term) => total + (text.includes(term) ? 4 : 0), 0); };
    const photo = [...(data.photos ?? [])].filter((item) => item.src?.large2x || item.src?.large).sort((a, b) => score(b) - score(a))[0];
    if (!photo) return null;
    return { src: photo.src.large2x || photo.src.large, alt: photo.alt || "Friends spending time together outdoors", photographer: photo.photographer, photographerUrl: photo.photographerUrl, pexelsUrl: photo.pexelsUrl };
  } catch { return null; }
}

export function buildPexelsQuery(article: { imageConcept?: string; imageKeywords?: string[]; imageAlt?: string; title?: string; description?: string }) {
  const source = article.imageConcept || article.imageKeywords?.join(" ") || article.imageAlt || article.description || article.title || "editorial lifestyle";
  const abstract = new Set(["confidence", "wellbeing", "success", "happiness", "feelings", "life", "advice", "tips", "motivation", "realistic", "guide", "ways", "how"]);
  const words = source.replace(/[()[\]{}:,]/g, " ").split(/\s+/).map((word) => word.replace(/[^a-zA-Z0-9&'-]/g, "")).filter((word) => word.length > 2 && !abstract.has(word.toLowerCase()));
  return [...new Set(words)].slice(0, 7).join(" ") || "editorial lifestyle";
}

export async function searchPexelsPhotos(query: string, options: { perPage?: number; page?: number } = {}): Promise<PexelsPhoto[]> {
  const key = process.env.PEXELS_API_KEY;
  if (!key || !query) return [];
  try {
    const params = new URLSearchParams({ query, orientation: "landscape", per_page: String(Math.min(options.perPage ?? 15, 15)), page: String(options.page ?? 1) });
    const response = await providerFetch(`https://api.pexels.com/v1/search?${params}`, { headers: { Authorization: key, Accept: "application/json" }, next: { revalidate: 86400 } });
    if (!response.ok) return [];
    const data = await response.json() as { photos?: PexelsPhoto[] };
    return (data.photos ?? []).filter((photo) => photo.id && photo.width >= photo.height && photo.src?.large);
  } catch { return []; }
}
