import chartJson from "@/content/on-screen.json";

export type OnScreenSection =
  | "Anime"
  | "Movies"
  | "Trending TV";

export type OnScreenMediaType =
  | "movie"
  | "series";

type ChartEntry = {
  section: OnScreenSection;
  rank: number;
  title: string;
  season?: string;
  platform: string;
  mediaType: OnScreenMediaType;
  tmdbId?: number | null;
  netflixId?: string;
  watchUrl?: string;
  // Curated local (or otherwise trusted) poster, used for titles that are
  // not yet in TMDB — e.g. a Netflix release too new to be indexed. Always
  // wins over a TMDB-resolved poster; see resolvePosterUrl() below.
  posterOverride?: string;
  editorNote: string;
};

type ChartFile = {
  region: string;
  week: string;
  source: string;
  sourceUrl: string;
  items: ChartEntry[];
};

const chart =
  chartJson as ChartFile;

export type OnScreenItem =
  ChartEntry & {
    editionWeek?: string;
    posterUrl?: string;
    backdropUrl?: string;
    tmdbUrl?: string;
    posterStatus:
      | "matched"
      | "needs-review";
  };

type TmdbRecord = {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
};

type TmdbSearchResponse = {
  results?: TmdbRecord[];
};

type AniListSearchResponse = {
  data?: {
    Media?: {
      coverImage?: { large?: string | null };
      siteUrl?: string | null;
    } | null;
  };
};

const token =
  process.env.TMDB_ACCESS_TOKEN;

const TMDB_BASE =
  "https://api.themoviedb.org/3";

const TMDB_IMAGE_BASE =
  "https://image.tmdb.org/t/p";

function normalizeTitle(
  value: string,
) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(
      /[\u0300-\u036f]/g,
      "",
    )
    .replace(
      /\bseason\s+\d+\b/gi,
      "",
    )
    .replace(
      /[^a-z0-9]+/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function endpointType(
  entry: ChartEntry,
) {
  return entry.mediaType ===
    "movie"
    ? "movie"
    : "tv";
}

function recordTitle(
  record: TmdbRecord,
) {
  return (
    record.title ??
    record.name ??
    record.original_title ??
    record.original_name ??
    ""
  );
}

function isReasonableMatch(
  target: string,
  candidate: string,
) {
  const a =
    normalizeTitle(target);

  const b =
    normalizeTitle(candidate);

  if (!a || !b) {
    return false;
  }

  if (a === b) {
    return true;
  }

  /*
   * Allow mild naming differences,
   * but do not accept completely
   * unrelated first search results.
   */
  return (
    a.includes(b) ||
    b.includes(a)
  );
}

async function tmdbFetch<T>(
  path: string,
): Promise<T | null> {
  if (!token) {
    return null;
  }

  try {
    const response =
      await fetch(
        `${TMDB_BASE}${path}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            accept:
              "application/json",
          },

          next: {
            revalidate: 86400,
          },
        },
      );

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

async function getAniListPoster(entry: ChartEntry): Promise<{ imageUrl: string; sourceUrl?: string } | null> {
  if (entry.section !== "Anime") return null;
  try {
    const response = await fetch("https://graphql.anilist.co", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: "query ($search: String) { Media(search: $search, type: ANIME) { coverImage { large } siteUrl } }",
        variables: { search: entry.title },
      }),
      next: { revalidate: 86400 },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as AniListSearchResponse;
    const imageUrl = data.data?.Media?.coverImage?.large;
    return imageUrl ? { imageUrl, sourceUrl: data.data?.Media?.siteUrl ?? undefined } : null;
  } catch {
    return null;
  }
}

async function getExactRecord(
  entry: ChartEntry,
): Promise<TmdbRecord | null> {
  if (
    !entry.tmdbId ||
    entry.tmdbId <= 0
  ) {
    return null;
  }

  const type =
    endpointType(entry);

  return tmdbFetch<TmdbRecord>(
    `/${type}/${entry.tmdbId}?language=en-US`,
  );
}

async function searchRecord(
  entry: ChartEntry,
): Promise<TmdbRecord | null> {
  const type =
    endpointType(entry);

  const data =
    await tmdbFetch<TmdbSearchResponse>(
      `/search/${type}?query=${encodeURIComponent(
        entry.title,
      )}&include_adult=false&language=en-US&page=1`,
    );

  const results =
    data?.results ?? [];

  if (results.length === 0) {
    return null;
  }

  /*
   * Exact title match wins.
   */
  const exact =
    results.find(
      (candidate) =>
        normalizeTitle(
          recordTitle(candidate),
        ) ===
        normalizeTitle(
          entry.title,
        ),
    );

  if (exact) {
    return exact;
  }

  /*
   * Otherwise use a conservative
   * partial-title match.
   */
  return (
    results.find(
      (candidate) =>
        isReasonableMatch(
          entry.title,
          recordTitle(
            candidate,
          ),
        ),
    ) ?? null
  );
}

/*
 * Poster resolution priority (never substitute an unrelated image):
 *
 *   entry.posterOverride  (curated local/trusted asset)
 *         ↓
 *   verified TMDB poster  (exact id, or a confidently-matched search result)
 *         ↓
 *   undefined — the UI falls back to the neutral BrisaStory placeholder.
 */
function finalizeItem(
  entry: ChartEntry,
  record: TmdbRecord | null,
): OnScreenItem {
  const type =
    endpointType(entry);

  const tmdbPosterUrl =
    record?.poster_path
      ? `${TMDB_IMAGE_BASE}/w780${record.poster_path}`
      : undefined;

  const posterUrl =
    entry.posterOverride ??
    tmdbPosterUrl ??
    undefined;

  return {
    ...entry,

    posterUrl,

    backdropUrl:
      record?.backdrop_path
        ? `${TMDB_IMAGE_BASE}/w1280${record.backdrop_path}`
        : undefined,

    tmdbUrl:
      record
        ? `https://www.themoviedb.org/${type}/${record.id}`
        : undefined,

    posterStatus:
      posterUrl
        ? "matched"
        : "needs-review",
  };
}

export async function resolveItem(
  entry: ChartEntry,
): Promise<OnScreenItem> {
  if (!token) {
    const anime = await getAniListPoster(entry);
    if (anime) {
      return finalizeItem({ ...entry, posterOverride: anime.imageUrl, watchUrl: entry.watchUrl ?? anime.sourceUrl }, null);
    }
    return finalizeItem(
      entry,
      null,
    );
  }

  /*
   * Best case:
   * use explicitly curated TMDB ID.
   */
  const exact =
    await getExactRecord(entry);

  if (exact) {
    return finalizeItem(
      entry,
      exact,
    );
  }

  /*
   * Fallback:
   * search by title using the
   * correct movie/TV endpoint.
   */
  const searched =
    await searchRecord(entry);

  if (
    !searched ||
    !isReasonableMatch(
      entry.title,
      recordTitle(searched),
    )
  ) {
    return finalizeItem(
      entry,
      null,
    );
  }

  return finalizeItem(
    entry,
    searched,
  );
}

export async function getOnScreen(): Promise<
  OnScreenItem[]
> {
  /*
   * Preserve editorial JSON order:
   *
   * Anime 1–3
   * Movies 1–3
   * Trending TV 1–3
   */
  return Promise.all(
    chart.items.map(resolveItem),
  );
}


export const onScreenChart = {
  region: chart.region,
  week: chart.week,
  source: chart.source,
  sourceUrl: chart.sourceUrl,
} as const;
