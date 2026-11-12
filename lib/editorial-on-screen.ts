import "server-only";
import { getCurrentAnimeItems, getCurrentMovieItems, getCurrentTVItems } from "@/lib/editorial-content";
import { getOnScreen, resolveItem, type OnScreenItem } from "@/lib/on-screen";

export async function getEditorialOnScreen(): Promise<OnScreenItem[]> {
  const [anime, movies, tv] = await Promise.all([getCurrentAnimeItems(), getCurrentMovieItems(), getCurrentTVItems()]);
  const items = [...anime, ...movies, ...tv].map((item) => {
    const payload = item.payload as Record<string, unknown> | undefined;
    // AniList IDs are not TMDB IDs. Passing them through the TMDB resolver
    // can return a completely unrelated title/poster when the numeric IDs
    // happen to collide. Keep the provider's verified cover instead.
    if (item.type === "anime" && item.source === "anilist") {
      return {
        ...(payload ?? {}),
        title: item.title,
        editionWeek: item.sourcePeriodStart ?? item.publishAt ?? undefined,
        section: "Anime",
        rank: item.displayOrder ?? item.sourceRank ?? 1,
        platform: String(payload?.platform ?? "AniList"),
        mediaType: "series",
        posterOverride: item.imageUrl,
        posterUrl: item.imageUrl,
        posterStatus: item.imageUrl ? "matched" : "needs-review",
        editorNote: String(payload?.editorNote ?? item.description ?? ""),
        watchUrl: item.sourceUrl ?? item.destinationUrl,
      } as OnScreenItem;
    }
    if (payload?.section && typeof payload.rank === "number") return { ...payload, posterOverride: payload.posterOverride ?? item.imageUrl } as unknown as OnScreenItem;
    const section = item.type === "anime" ? "Anime" : item.type === "movie" ? "Movies" : "Trending TV";
    return {
      ...(payload ?? {}), title: item.title, editionWeek: item.sourcePeriodStart ?? item.publishAt ?? undefined, section, rank: item.displayOrder ?? item.sourceRank ?? 1,
      platform: String(payload?.platform ?? item.source ?? ""), mediaType: item.type === "movie" ? "movie" : "series",
      posterUrl: item.imageUrl, posterStatus: item.imageUrl ? "matched" : "needs-review",
      editorNote: String(payload?.editorNote ?? item.description ?? ""), watchUrl: item.sourceUrl ?? item.destinationUrl,
      tmdbId: item.externalId ? Number(item.externalId) || undefined : undefined,
    } as OnScreenItem;
  }).filter((item) => item?.title && item?.section && typeof item.rank === "number");
  return items.length ? Promise.all(items.sort((a, b) => a.rank - b.rank).map((item) => resolveItem(item))) : getOnScreen();
}
