# BrisaStory editorial-daily Appwrite Function

Entry point: `src/index.js`. Runtime: Node.js 20+. Run `npm install && npm run build` in this directory before deployment.

Schedule: `0 16 * * *` (daily at 16:00 UTC, midnight in Asia/Kuala_Lumpur).

The Function runs the shared daily runner. It collects current Southeast Asia trends from Tavily and TheNewsAPI, generates the five interactive formats with OpenRouter, validates and safety-checks the result, then writes one scheduled Appwrite edition. If collection, generation, validation, or credentials fail, the existing static daily content is preserved.

Required Function environment variables:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `APPWRITE_API_KEY`
- `APPWRITE_DATABASE_ID`
- `APPWRITE_EDITORIAL_CONTENT_COLLECTION_ID`
- `TAVILY_API_KEY`
- `THE_NEWS_API_TOKEN`
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (recommended: `openrouter/free`)
- `CRON_SECRET` (the same secret configured in the Next.js deployment, used to invalidate the published homepage cache)
- `NEXT_PUBLIC_SITE_URL` (optional; defaults to `https://brisastory.live`)

Use an Appwrite API key scoped only to the editorial database/collection. Do not add these variables to browser-exposed `NEXT_PUBLIC_*` names. Recommended timeout: 300 seconds.
