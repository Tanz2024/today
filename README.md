# TODAYAI

TODAYAI is a separate copy of the editorial application with the AI article workflow carried forward from FreshScene. It researches current topics, asks an OpenRouter model for strict JSON, validates the generated article, resolves an image, adds internal links, and stores the result as an Appwrite draft.

The AI article command is:

```bash
npm run editorial:articles
```

Preview generation without saving to Appwrite:

```bash
node scripts/editorial-articles.mjs --dry-run
```

The main pipeline is implemented in `lib/editorial-article-ai.mjs`. It uses Tavily for research when `TAVILY_API_KEY` is configured and OpenRouter for JSON article generation through `OPENROUTER_API_KEY` and `OPENROUTER_MODEL`. Drafts are saved in Appwrite when the Appwrite environment variables are configured. The existing FreshScene project is not modified.

**Real People. Brighter Days.**

BrisaStory is an independent youth lifestyle and culture digital magazine for Gen Z / Gen Alpha, covering relationships,
style, campus life, social media culture, entertainment, gaming, money, and self-care. Built with
Next.js App Router, TypeScript, and Tailwind CSS.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4 (CSS-based theme in `app/globals.css`, class-based dark mode)
- `@phosphor-icons/react` for all icons
- MDX content files (`content/`) parsed with `gray-matter` + rendered with `next-mdx-remote`
- Upstash Redis (`@upstash/redis`) for article reaction counters only — accessed exclusively from
  the `app/api/reactions` route handler, never from the browser
- `next/image` + `next/font` (Space Grotesk for headings, Inter for body)

No database, no auth, no CMS, no admin dashboard — content lives in git as MDX files.

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:3000. The site works fully without Redis configured — reactions will read
as 0 and writes will no-op (with a console warning) until you add Upstash credentials.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Setting up Upstash Redis (for reactions)

1. Create a free account at https://upstash.com
2. Create a new Redis database (any region close to your Vercel deployment region works best)
3. In the database dashboard, open the "REST API" section
4. Copy the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` values into `.env.local` (or
   into your Vercel project's Environment Variables for production)
5. Restart the dev server / redeploy

Reaction counts are stored as a Redis hash per article at `article:{slug}:reactions` with fields
`love`, `laugh`, `cry`, `fire`, incremented/decremented atomically via `HINCRBY`.

## How reactions work

- `components/reactions/ReactionBar.tsx` is a client component rendered on every article page.
- It reads/writes the visitor's chosen reaction to `localStorage` under
  `freshscene:reaction:{slug}` so the UI remembers their choice across visits.
- Clicking a reaction optimistically updates the UI, then calls `POST /api/reactions` with
  `{ slug, type, previous }`. The route handler (`app/api/reactions/route.ts`) validates `type`
  is one of `love | laugh | cry | fire`, decrements the previous reaction if one existed, and
  increments the new one — all server-side, via `lib/reactions.ts` and `lib/redis.ts`.
- If Redis is unreachable or unconfigured, the API returns zeroed/cached counts instead of
  throwing, so article pages always render and the reaction buttons never break the page.
- The Trending page and homepage "Popular This Week" section rank articles by total reaction
  count, read via a single Redis pipeline (`getManyReactionTotals`).

## Adding an article

1. Pick a category directory under `content/` (`relationships`, `style`, `campus`, `social`,
   `entertainment`, `gaming`, `money`, `self-care`).
2. Add a new `.mdx` file, e.g. `content/money/my-new-article.mdx`. The filename (minus `.mdx`)
   becomes the URL slug.
3. Add frontmatter:

   ```yaml
   ---
   title: "Your Title"
   description: "One or two sentence deck/summary."
   category: "money"
   tags: ["Money", "Productivity"]
   date: "2026-05-01"
   readingTime: "5 min read"
   image: "https://images.unsplash.com/photo-XXXX?auto=format&fit=crop&w=1200&q=80"
   imageAlt: "Descriptive alt text for the hero image"
   featured: false
   ---
   ```

4. Write the body in Markdown/MDX. Use `##`/`###` for headings (they auto-generate table-of-contents
   anchors), and wrap callout boxes in `<Callout>...</Callout>`.
5. That's it — `lib/articles.ts` picks it up automatically at build time: category listings, the
   search index, the topics page, and related-article suggestions are all generated from
   frontmatter, with no manual registration needed anywhere else.

## Swapping images

All article images are remote Unsplash URLs referenced directly in each article's frontmatter
(`image` field) plus a matching `imageAlt`. If any image ever looks wrong, broken, or off-theme,
just edit the `image` field of that article's `.mdx` file — no other file needs to change. Allowed
remote image hosts are configured in `next.config.ts` (`images.unsplash.com` and
`images.pexels.com`); add any additional host there before using it.

## SEO notes

- Every page uses `generateMetadata`/`export const metadata` via `lib/seo.ts` for consistent
  titles, descriptions, canonical URLs, and Open Graph/Twitter tags.
- `app/sitemap.ts` and `app/robots.ts` generate `sitemap.xml`/`robots.txt` from live content.
- Article pages emit `Article` and `BreadcrumbList` JSON-LD; the root layout emits `WebSite`
  JSON-LD with a `SearchAction` pointing at `/search`.
- Search (`/search`) is fully client-side against a static index built at request time from
  article frontmatter (`lib/articles.ts#getSearchIndex`) and supports `?q=`.

## Project structure

```
app/                  Routes (App Router): home, category + [slug] pages for all 8 categories,
                       trending, search, topics, about, contact, privacy, terms, api/reactions,
                       sitemap.ts, robots.ts, loading/error/not-found
components/
  layout/              Header, Footer, MobileMenu, DarkModeToggle, Logo
  home/                Hero, TrendingChips, CategoryGrid, NewsletterCTA
  category/            Shared CategoryPage template
  article/             ArticleView, Breadcrumbs, TableOfContents, ShareButtons, RelatedArticles,
                       MDX component overrides
  cards/               ArticleCard
  reactions/           ReactionBar (client)
  search/              SearchClient (client)
  ui/                  AdPlaceholder, CategoryPill, Container
content/{category}/*.mdx   All article content, one file per article
lib/                   articles.ts, categories.ts, redis.ts, reactions.ts, seo.ts, toc.ts, utils.ts, nav.ts
types/                 Shared TypeScript types
```

## Deploying to Vercel

1. Push this repository to GitHub (or GitLab/Bitbucket).
2. Import the repo at https://vercel.com/new.
3. Add the environment variables from `.env.example` in the Vercel project settings
   (`UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_SITE_URL` — set this to
  your production domain, e.g. `https://brisastory.live`).
4. Deploy. No build configuration changes are needed beyond the default Next.js preset.
