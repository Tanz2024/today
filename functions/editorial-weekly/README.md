# Editorial weekly Appwrite Function

Entry point: `src/index.js`. Runtime: Node.js 20+. Run `npm install && npm run build` in this directory before deployment. Schedule it for Monday 00:00 Malaysia time, equivalent to Sunday 16:00 UTC (`0 16 * * 0`).

The build copies the weekly runner, provider, and weekly-question generator modules into the Function package. Configure `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, `APPWRITE_DATABASE_ID`, `APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `TMDB_ACCESS_TOKEN`, `APPLE_MUSIC_TEAM_ID`, `APPLE_MUSIC_KEY_ID`, `APPLE_MUSIC_PRIVATE_KEY`, and optionally `IGDB_CLIENT_ID`/`IGDB_CLIENT_SECRET`. Use an Appwrite API key permitted to read/write only the editorial database/collection. Recommended timeout: 300 seconds.
