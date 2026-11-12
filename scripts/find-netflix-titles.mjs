const token = process.env.TMDB_ACCESS_TOKEN;
const region = process.env.FRESHSCENE_WATCH_REGION || "US";

if (!token) {
  console.error("Set TMDB_ACCESS_TOKEN before running this helper.");
  process.exit(1);
}

async function tmdb(path) {
  const response = await fetch(`https://api.themoviedb.org/3${path}`, { headers: { Authorization: `Bearer ${token}`, accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${path}`);
  return response.json();
}

const [movies, shows] = await Promise.all([tmdb(`/trending/movie/week?language=en-US`), tmdb(`/trending/tv/week?language=en-US`)]);
const candidates = [];
for (const item of [...movies.results, ...shows.results]) {
  const mediaType = item.media_type === "tv" || item.name ? "tv" : "movie";
  const providers = await tmdb(`/${mediaType}/${item.id}/watch/providers`);
  const regionData = providers.results?.[region];
  if (regionData?.flatrate?.some((provider) => provider.provider_name.toLowerCase().includes("netflix"))) {
    candidates.push({ title: item.title ?? item.name, type: mediaType, releaseDate: item.release_date ?? item.first_air_date, tmdbId: item.id });
  }
  if (candidates.length >= 10) break;
}
console.log("NETFLIX CANDIDATES", `(${region})`);
candidates.forEach((item, index) => console.log(`\n${index + 1}. ${item.title}\n   ${item.type === "tv" ? "TV" : "Movie"}\n   ${item.releaseDate ?? "No release date"}\n   TMDB ID: ${item.tmdbId}`));
