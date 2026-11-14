# Test results

Run from `/Users/tanz/TODAYAI` on 14 November 2026.

| Check | Result | Notes |
|---|---|---|
| `npm run lint` | VERIFIED / PASS | ESLint exited 0 |
| `npm test` | VERIFIED / PASS | Configured test suite passed |
| `npm run build` | VERIFIED / PASS | Next production build and route generation passed |
| `npm audit --omit=dev` | VERIFIED / FAIL | 1 critical, 3 high and 5 moderate production findings reported |
| Type check | NOT TESTED | No typecheck script is configured |
| Live homepage | VERIFIED / BLOCKED | HTTP 503, `DEPLOYMENT_PAUSED` |
| Live robots/sitemap/ads.txt | VERIFIED / BLOCKED | All returned HTTP 503 |
| Lighthouse/Core Web Vitals | NOT TESTED | Production unavailable |
| Browser accessibility flows | NOT TESTED | Requires browser session against a working deployment |
