# Current versus target architecture

## Current: VERIFIED

- Next.js App Router with React Server Components.
- Local MDX plus Appwrite-backed generated/community content.
- Shared SEO, structured-data, image-loader and discovery utilities.
- Appwrite for authentication, editorial/community data and interactions.
- Upstash Redis for selected rate limits and idempotency.
- Resend and MailerLite integrations.
- Cloudflare R2/media and Cloudflare/Vinext deployment support.
- Existing AI directory at `/ai-tools`, practical utilities at `/tools`, games at `/play`, and unified article search at `/search`.
- Vercel deployment instructions remain in the README; Cloudflare worker configuration is also present.

## Target: staged, not yet implemented

1. Preserve the current content and route model.
2. Add a provider-agnostic, server-only AI execution boundary for selected utilities.
3. Give every AI utility explicit input/output limits, model allowlists, timeout behavior, rate limits and usage accounting.
4. Use browser-side/deterministic processing whenever a task does not need a model.
5. Connect tool pages, editorial guides and games through contextual links rather than a second CMS.
6. Keep private, temporary and low-value pages out of the index.
7. Select one authoritative deployment path before production changes.

## Boundary decisions

- No payment gateway is planned in this phase.
- No AI provider is activated without a configured secret and explicit approval.
- No user-uploaded document is sent to a provider until retention, deletion and consent behavior are documented.
- No new route replaces an existing route without a redirect and regression test.
