import "server-only";
import { boundedFetch } from "@/lib/bounded-fetch";

// Bounded so a slow or down provider cannot stall rendering/static generation.
const providerFetch = (input: string | URL, init: RequestInit & { next?: { revalidate?: number } } = {}) =>
  boundedFetch(input, { ...init, provider: "RAWG", timeoutMs: 6000 });


const RAWG_API_BASE = "https://api.rawg.io/api";
const REVALIDATE_SECONDS = 3600;
const SCREENSHOT_REVALIDATE_SECONDS = 86400;
const BLOCKED_GAME_SLUGS = new Set([
  "busty-beast-ear-airis-hentai-escape",
  "sex-police",
]);

export type GameScreenshot = { image: string; hidden: boolean };

export type Game = {
  id: number;
  slug: string;
  name: string;
  image: string | null;
  released: string | null;
  rating: number | null;
  ratingsCount: number;
  metacritic: number | null;
  platforms: string[];
  genres: string[];
  rawgUrl: string;
};

type RawgPlatformEntry = {
  platform?: {
    id?: number;
    name?: string;
    slug?: string;
  };
};

type RawgGenre = {
  id?: number;
  name?: string;
  slug?: string;
};

type RawgGame = {
  id?: number;
  slug?: string;
  name?: string;
  background_image?: string | null;
  released?: string | null;
  rating?: number | null;
  ratings_count?: number | null;
  metacritic?: number | null;
  platforms?: RawgPlatformEntry[];
  genres?: RawgGenre[];
};

type RawgResponse = {
  results?: RawgGame[];
};

type RawgQuery = Record<
  string,
  string | number | boolean | undefined
>;

async function requestGames(
  query: RawgQuery,
): Promise<Game[]> {
  const apiKey = process.env.RAWG_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[RAWG] RAWG_API_KEY is missing. Returning an empty game list.",
      );
    }

    return [];
  }

  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  });

  params.set("key", apiKey);

  const url = `${RAWG_API_BASE}/games?${params.toString()}`;

  try {
    const response = await providerFetch(url, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: REVALIDATE_SECONDS,
      },
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error(
          `[RAWG] Request failed with HTTP ${response.status}.`,
        );
      }

      return [];
    }

    const data = (await response.json()) as RawgResponse;

    if (!Array.isArray(data.results)) {
      return [];
    }

    return data.results
      .map(normalizeGame)
      .filter((game): game is Game => game !== null);
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error(
        "[RAWG] Unable to load games.",
        error instanceof Error ? error.message : error,
      );
    }

    return [];
  }
}

function normalizeGame(
  rawGame: RawgGame,
): Game | null {
  if (
    typeof rawGame.id !== "number" ||
    typeof rawGame.name !== "string" ||
    typeof rawGame.slug !== "string"
  ) {
    return null;
  }

  const normalizedSlug = rawGame.slug.toLowerCase();
  const normalizedName = rawGame.name.toLowerCase();
  if (
    BLOCKED_GAME_SLUGS.has(normalizedSlug) ||
    normalizedName === "sex police" ||
    normalizedName.includes("hentai")
  ) {
    return null;
  }

  const platforms = Array.isArray(rawGame.platforms)
    ? rawGame.platforms
        .map((entry) => entry.platform?.name)
        .filter((name): name is string => Boolean(name))
    : [];

  const genres = Array.isArray(rawGame.genres)
    ? rawGame.genres
        .map((genre) => genre.name)
        .filter((name): name is string => Boolean(name))
    : [];

  return {
    id: rawGame.id,
    slug: rawGame.slug,
    name: rawGame.name,

    image:
      typeof rawGame.background_image === "string"
        ? rawGame.background_image
        : null,

    released:
      typeof rawGame.released === "string"
        ? rawGame.released
        : null,

    rating:
      typeof rawGame.rating === "number"
        ? rawGame.rating
        : null,

    ratingsCount:
      typeof rawGame.ratings_count === "number"
        ? rawGame.ratings_count
        : 0,

    metacritic:
      typeof rawGame.metacritic === "number"
        ? rawGame.metacritic
        : null,

    platforms,
    genres,

    rawgUrl: `https://rawg.io/games/${rawGame.slug}`,
  };
}

export async function getLatestGames(
  pageSize = 12,
): Promise<Game[]> {
  const end = new Date();
  const start = new Date();

  start.setDate(start.getDate() - 120);

  return requestGames({
    dates: `${formatApiDate(start)},${formatApiDate(end)}`,
    ordering: "-released",
    page_size: clampPageSize(pageSize),
  });
}

export async function getLatestMobileMultiplayerGames(pageSize = 12): Promise<Game[]> {
  const end = new Date();
  const start = new Date();
  start.setMonth(start.getMonth() - 6);
  return requestGames({ platforms: "3,21", tags: "multiplayer", dates: `${formatApiDate(start)},${formatApiDate(end)}`, ordering: "-released", page_size: Math.min(12, clampPageSize(pageSize)) });
}

export async function getGameBySlug(slug: string): Promise<Game | null> {
  const apiKey = process.env.RAWG_API_KEY;
  if (!apiKey || !slug) return null;
  try {
    const response = await providerFetch(`${RAWG_API_BASE}/games/${encodeURIComponent(slug)}?key=${encodeURIComponent(apiKey)}`, { headers: { Accept: "application/json" }, next: { revalidate: REVALIDATE_SECONDS } });
    if (!response.ok) return null;
    const raw = (await response.json()) as RawgGame;
    return normalizeGame(raw);
  } catch { return null; }
}

export async function getGameScreenshots(gameSlug: string, limit = 5): Promise<GameScreenshot[]> {
  const game = await getGameBySlug(gameSlug);
  const apiKey = process.env.RAWG_API_KEY;
  if (!game || !apiKey) return [];
  try {
    const response = await providerFetch(`${RAWG_API_BASE}/games/${game.id}/screenshots?key=${encodeURIComponent(apiKey)}&page_size=${Math.min(10, Math.max(1, limit))}`, { headers: { Accept: "application/json" }, next: { revalidate: SCREENSHOT_REVALIDATE_SECONDS } });
    if (!response.ok) return [];
    const data = (await response.json()) as { results?: Array<{ image?: string; hidden?: boolean }> };
    return (data.results ?? []).filter((item) => typeof item.image === "string" && item.image.length > 0 && !item.hidden).slice(0, limit).map((item) => ({ image: item.image as string, hidden: false }));
  } catch { return []; }
}

export async function getTopRatedGames(
  pageSize = 12,
): Promise<Game[]> {
  const end = new Date();
  const start = new Date();

  start.setFullYear(start.getFullYear() - 2);

  return requestGames({
    dates: `${formatApiDate(start)},${formatApiDate(end)}`,
    metacritic: "70,100",
    ordering: "-metacritic",
    page_size: clampPageSize(pageSize),
  });
}

export async function getPCGames(
  pageSize = 12,
): Promise<Game[]> {
  const end = new Date();
  const start = new Date();

  start.setFullYear(start.getFullYear() - 2);

  return requestGames({
    platforms: "4",
    dates: `${formatApiDate(start)},${formatApiDate(end)}`,
    ordering: "-rating",
    page_size: clampPageSize(pageSize),
  });
}

export async function getMobileGames(
  pageSize = 12,
): Promise<Game[]> {
  const end = new Date();
  const start = new Date();

  start.setFullYear(start.getFullYear() - 2);

  return requestGames({
    // RAWG platform IDs:
    // 3 = iOS
    // 21 = Android
    platforms: "3,21",
    dates: `${formatApiDate(start)},${formatApiDate(end)}`,
    ordering: "-rating",
    page_size: clampPageSize(pageSize),
  });
}

export async function getFreeToPlayGames(
  pageSize = 12,
): Promise<Game[]> {
  return requestGames({
    tags: "free-to-play",
    ordering: "-rating",
    page_size: clampPageSize(pageSize),
  });
}

function clampPageSize(value: number) {
  if (!Number.isFinite(value)) {
    return 12;
  }

  return Math.min(
    24,
    Math.max(1, Math.floor(value)),
  );
}

function formatApiDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
