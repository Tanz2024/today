# Deployment checklist

Production deployment is intentionally out of scope until explicit approval.

## Before staging

- [ ] Confirm the intended TodayAI domain and owner.
- [ ] Confirm whether Vercel or Cloudflare/Vinext is authoritative.
- [ ] Populate required secrets in the intended environment; never commit them.
- [ ] Resolve critical/high dependency findings or document an accepted exception.
- [ ] Run lint, tests, build and audit.
- [ ] Verify homepage, article, category, tools, games, search, community and API health.
- [ ] Verify robots, sitemap, RSS and ads.txt.
- [ ] Test consent defaults and revocation.
- [ ] Test mobile and desktop keyboard/touch flows.

## Before production

- [ ] User explicitly approves deployment.
- [ ] No DNS or canonical change occurs without explicit approval.
- [ ] Search Console property and sitemap target are confirmed.
- [ ] Rollback target and owner are recorded.
- [ ] Monitoring and error alerts are active.

## Current blocker

The configured public domain currently returns HTTP 503 with `x-vercel-error: DEPLOYMENT_PAUSED`. Do not treat local build success as production readiness.
