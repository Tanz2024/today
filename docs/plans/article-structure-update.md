# Article Structure Update Plan

Goal: make every TodayAI article match the [Article Blueprint](https://claude.ai/artifact/9EfKqbqFwpPMSf4UvQPPC5). That means three fixed templates (News, How-to guide, Analysis), a readable type system, visible sources and authors, "Tested on" proof for guides, and an AI pipeline that drafts inside those templates.

- **Team:** 3 people. **A** = frontend and design, **B** = content model, SEO and tooling, **C** = editorial and AI pipeline.
- **Estimated length:** about 2 weeks (8–10 working days), in 7 phases. Phases 1–3 can run in parallel once Phase 0 is done.
- **Rule for the whole project:** existing articles must keep rendering at every step. New fields are optional for rendering and required only for new articles, enforced by a content linter (Phase 1).

---

## Phase 0: Decisions and prep (day 1, everyone, about half a day)

### Decisions to make before any code changes

| # | Decision | Recommendation | Why it matters |
|---|---|---|---|
| D1 | Named authors or the shared "TodayAI Editorial" byline? | **Named authors** with role, bio and profile links | Today [AuthorInfo.tsx](../../components/article/AuthorInfo.tsx) and `/editorial-policy` say "we publish under a shared byline". Named authors are the main trust signal for AI and dev-tool content. This also means updating the editorial policy page. |
| D2 | Body font | **Source Serif 4** for article body. Keep Geist for headings and UI. Add Geist Mono for code. | Long-form reading and visual separation from the UI. Fonts stay self-hosted like Geist (see [layout.tsx](../../app/layout.tsx)), with no font CDN. |
| D3 | Headline size | Lower the H1 from 60px to **46px** on desktop | Current headlines wrap to 3–4 lines on laptops, which pushes the hero image below the fold. |
| D4 | Where AI and tech articles live (URL) | Keep the desk URLs and use `/news` and `/guides` as hubs (both pages already exist and are driven by [lib/ai-taxonomy.ts](../../lib/ai-taxonomy.ts)). Add a new **`ai`** category folder for new AI and tech content. | Today AI pieces sit under `campus` and `culture`. A dedicated desk gives clean URLs and topical authority. |
| D5 | Ads inside guides | **No mid-article ad in guides.** Keep it for news and analysis. | The midpoint `AdSlot` in [ArticleView.tsx:301](../../components/article/ArticleView.tsx) can land between two install steps. |

### Prep tasks

- [ ] **B:** Fix the 2 Windows-only test failures. Add a `.gitattributes` with `* text=auto eol=lf`, or make the regex tests accept `\r?\n` ([tests/reaction-route.test.ts](../../tests/reaction-route.test.ts), [tests/hidden-desks.test.ts](../../tests/hidden-desks.test.ts)). All 399 tests should pass before we start.
- [ ] **B:** Create a working branch, `feature/article-structure`, from `staging`.
- [ ] **A:** Take before screenshots of 3 current articles (one each of guide, explainer and news), on desktop and mobile, for comparison later.

---

## Phase 1: Content model and templates (days 2–3, owner B)

### 1.1 Extend the article schema in [types/article.ts](../../types/article.ts)

Add these optional fields to `ArticleFrontmatter`:

```ts
contentType?: "news" | "guide" | "analysis" | "explainer" | "review" | "comparison"; // exists, now required for new articles
authorId?: string;              // key into lib/authors.ts (D1)
quickAnswer?: string[];         // 3–4 bullets shown before the intro (reuse QuickReadPanel / QuickAnswer)
testedOn?: { date: string; os: string[]; versions: Record<string, string> }; // guides only
prerequisites?: string[];       // guides only
sources?: { title: string; url: string; publisher?: string; accessed: string }[];
changelog?: { date: string; note: string }[];
faq?: { question: string; answer: string }[]; // drives FAQPage schema
```

`updated` already exists. From now on it is shown in the byline and used as `dateModified`.

### 1.2 Validate frontmatter with zod (zod is already a dependency)

- [ ] New file `lib/article-schema.ts`. It holds one zod schema per `contentType`.
  - **News:** needs at least 1 source, `date`, and `imageCredit`.
  - **Guide:** needs `testedOn`, `prerequisites`, `quickAnswer`, at least 1 source, and `changelog`.
  - **Analysis:** needs at least 2 sources and `quickAnswer` (used as key takeaways).
- [ ] Articles without `contentType` (all legacy content) skip strict validation.

### 1.3 Content linter: `scripts/lint-articles.ts`, run as `npm run lint:articles`

It checks every MDX file that has a `contentType`:

| Rule | Limit | Severity |
|---|---|---|
| Headline length | 50–70 characters | warn |
| Description (dek and meta) | 120–160 characters | warn |
| Paragraph length | 100 words or fewer | **error** |
| Words between H2s | 350 or fewer | warn |
| Total length | News 400–900, Guide 1,000–2,000, Analysis 1,200–2,500 | warn |
| Images have alt text and a caption | required | **error** |
| Numbers, % and versions in body appear in `sources` | required | warn |
| Filler phrases ("delve", "in today's fast-paced world", "it's worth noting", …) | none | **error** |
| Internal links | 3–5 | warn |

- [ ] Add `tests/article-lint.test.ts` with sample passing and failing fixtures, and add it to the `npm test` list.
- [ ] Share the paragraph and filler rules with the AI pipeline (Phase 5) so both use one source of truth. Export them from `lib/article-rules.ts`.

### 1.4 Templates

Replace [templates/ARTICLE_TEMPLATE.mdx](../../templates/ARTICLE_TEMPLATE.mdx), which is lifestyle- and travel-oriented, with three files:

- [ ] `templates/news.mdx`: Lead → Key details → Why it matters → What we don't know yet
- [ ] `templates/guide.mdx`: Before you start → Step 1…N → Check that it worked → Troubleshooting
- [ ] `templates/analysis.mdx`: Key takeaways → 3–5 argument sections → The other side → Verdict

Each template has the full frontmatter with comments, and placeholder text that states the length rule (for example "2–4 sentences, 40–80 words").

### 1.5 Author registry

- [ ] New file `lib/authors.ts` with `{ id, name, role, bio, links: { github?, linkedin?, x? }, avatar }` for each team member.
- [ ] Update `resolveArticleAuthor` in [lib/structured-data.ts](../../lib/structured-data.ts) to use `authorId`. Fall back to the current organization byline.
- [ ] New route `app/authors/[id]/page.tsx` listing each author's articles. Add it to [app/sitemap.ts](../../app/sitemap.ts).

**Done when:** the linter runs on all content, legacy articles pass because they're skipped, and one sample article per template passes.

---

## Phase 2: Typography and tokens (days 2–3, owner A)

### 2.1 Fonts

- [ ] Download the Source Serif 4 (variable, latin and latin-ext) and Geist Mono woff2 files into `app/fonts/`. Load them with `localFont` next to Geist in [app/layout.tsx](../../app/layout.tsx). Use variables `--font-reading` and `--font-code`.
- [ ] In [app/globals.css](../../app/globals.css) (around lines 182–185), add `--font-reading` and point `--font-script` (used as mono) at Geist Mono. Keep `--font-heading` and `--font-display` on Geist.
- [ ] Preload only the latin subsets to keep LCP unchanged. Check that the font payload stays under 120 KB total.

### 2.2 Article type scale

Update `articleBodyClasses` in [ArticleView.tsx:54](../../components/article/ArticleView.tsx) and the header classes:

| Element | Now | New |
|---|---|---|
| H1 | Geist 38 / 52 / **60px** | Geist **32px mobile / 46px desktop**, line-height 1.08, weight 750, −0.022em |
| Dek | 18 / 21px | Source Serif 4, 19 / 21px, 1.45 |
| Body | Geist 17 / 18px, 1.58 / 1.78 | **Source Serif 4 18 / 19px, 1.68** |
| H2 | (check MdxComponents) | Geist 24 / 29px, 1.2, weight 700, 48px above |
| H3 | (check MdxComponents) | Geist 19 / 21px, 1.3, weight 650, 32px above |
| Paragraph gap | 16 / 24px | 18px |
| Reading column | 680px | **700px** (`--reading-width` already exists) |
| Code | system mono | Geist Mono 14 / 15px, 1.6 |

- [ ] Keep the `--read-scale` multiplier, so the existing reader text-size control still works.
- [ ] Replace hardcoded colours in the article body (for example `text-[#292b31]` and `bg-[#eae5ff]` in AuthorInfo) with tokens, so dark mode stays correct.

**Done when:** before and after screenshots show the new type scale, the reader's text-size control works, and there's no layout shift from late-loading fonts.

---

## Phase 3: Article page components (days 3–6, owner A, with B on data)

Work in [components/article/](../../components/article/). Change the header and body order in [ArticleView.tsx](../../components/article/ArticleView.tsx) to:

1. Breadcrumbs + **desk pill + content-type pill**. Content type comes from `classifyContentType()` in [lib/ai-taxonomy.ts](../../lib/ai-taxonomy.ts).
2. H1
3. Dek
4. **Byline strip**: author (from the registry), role, Published, **Updated** (when present), read time, and **TestedOnBadge** (guides).
5. Hero image with caption and credit (already there)
6. **Quick answer box**: reuse [QuickAnswer.tsx](../../components/article/QuickAnswer.tsx) / [QuickReadPanel.tsx](../../components/article/QuickReadPanel.tsx), fed from `quickAnswer`
7. Intro, then a table of contents. Show the TOC only when the article is **over 1,000 words** (today it depends on H2 count).
8. **Prerequisites** block (guides)
9. Body
10. **Sources** list and **Changelog**
11. Author box (rewritten, see below)
12. Related articles: **hub link first**, then 2 related
13. Newsletter CTA (once, after the article)

### New components

- [ ] `TestedOnBadge.tsx`: green badge showing "Tested on Windows 11 · Node 22 · 13 Nov 2026"
- [ ] `Prerequisites.tsx`: list styled as a checklist
- [ ] `SourcesList.tsx`: numbered primary sources with the accessed date
- [ ] `Changelog.tsx`: small mono list, newest first
- [ ] `CodeBlock.tsx`: an MDX `pre` override with a language label and a **Copy** button (client component), styled dark
- [ ] `FaqSection.tsx`: renders `faq` frontmatter as H3 question and answer pairs

### Changes to existing components

- [ ] **[AuthorInfo.tsx](../../components/article/AuthorInfo.tsx):** show the named author's bio and links from `lib/authors.ts`. Keep the organization fallback text.
- [ ] **[MdxComponents.tsx](../../components/article/MdxComponents.tsx):** reduce callouts to **Tip / Heads up / Note**. Keep `QuickTip`, `WorthKnowing`, `Remember`, `TryThis` and `GoodToKnow` as aliases so old MDX still renders. Use the new H2 and H3 styles.
- [ ] **[ArticleView.tsx](../../components/article/ArticleView.tsx):** skip the `article-midpoint` AdSlot when `contentType === "guide"` (D5).
- [ ] **[RelatedArticles.tsx](../../components/article/RelatedArticles.tsx):** put the topic hub link first (`/guides`, `/news` or a topic page).
- [ ] **Images:** add a `<Figure>` MDX component with required `alt` and `caption` and an optional `credit`, and a 16:10 ratio for screenshots.

**Done when:** a sample article of each template renders the full blueprint order on desktop and mobile, and every legacy article still renders. Spot-check 10 legacy articles across all desks.

---

## Phase 4: SEO and structured data (days 5–6, owner B)

- [ ] **Schema type:** extend `articleSchemaType` in [lib/structured-data.ts:72](../../lib/structured-data.ts). News uses `NewsArticle`, guides use `TechArticle` plus a `HowTo` block built from the "Step N:" H2s, and analysis uses `Article`.
- [ ] Add a **`FAQPage`** block when `faq` is present.
- [ ] Use **`dateModified`** from `updated`, and give `author` a `Person` with `sameAs` links from the registry.
- [ ] **Meta:** default `seoDescription` to the dek. Warn in the linter when `seoTitle` is over 60 characters.
- [ ] **Sitemap:** include author pages, and set `lastmod` from `updated`.
- [ ] Extend [tests/structured-data.test.ts](../../tests/structured-data.test.ts) and [tests/final-seo.test.ts](../../tests/final-seo.test.ts) for each content type.

**Done when:** each sample article passes Google's Rich Results Test (run manually against staging), and the tests cover all three schema shapes.

---

## Phase 5: AI pipeline alignment (days 4–8, owner C)

The AI writer in [lib/editorial-article-ai.mjs](../../lib/editorial-article-ai.mjs) still targets Gen Z lifestyle. It needs to draft inside the new templates.

- [ ] **Categories:** add `ai` to `CATEGORIES`, and stop aliasing `technology` to `campus` (it should go to `ai`).
- [ ] **Content types:** map the generator's 10 `ARTICLE_TYPES` onto the 3 templates (news, guide, analysis). Use word ranges from `lib/article-rules.ts` instead of `ARTICLE_TYPE_RANGES`.
- [ ] **Writing brief:** replace `BRISASTORY_WRITING_BRIEF` with a tech-reader brief. Include template section order, paragraph limits and the filler blocklist, all from `lib/article-rules.ts`.
- [ ] **Output schema:** have the model return `quickAnswer`, `sources` (from the Tavily research packet only), `faq`, and `prerequisites` for guides.
- [ ] **Topic sources:** add an AI and tech topic feed next to `collectSoutheastAsiaTrends()`. Start with official changelog and blog RSS feeds for the tools we cover.
- [ ] **Guardrail:** guides are **never auto-published**. They always need a human to run the steps and fill in `testedOn`.
- [ ] **Bug fix:** set `generatedBy` to the real `OPENROUTER_MODEL`, not the hardcoded `"openrouter/free"`.
- [ ] **Validation:** run the Phase 1 linter on generated drafts, and store the lint results on the draft so the moderator dashboard shows them.
- [ ] **Tests:** update [tests/editorial-article-ai.test.ts](../../tests/editorial-article-ai.test.ts).

**Later (not in this plan):** a writer-first assistant inside the editor, with outlining, fact-check lists and a "say it shorter" pass.

**Done when:** `node scripts/editorial-articles.mjs --dry-run` produces a draft that matches a template and passes the linter.

---

## Phase 6: Content migration (days 7–9, owner C, with everyone writing)

- [ ] **Audit:** list every article where `isAiArticle()` is true. The likely set is about 7: `campus/how-to-use-ai-for-studying`, `campus/can-teachers-detect-chatgpt`, `campus/how-to-tell-if-a-photo-or-video-is-ai-generated`, `culture/is-ai-replacing-jobs-gen-z`, `culture/ai-is-becoming-the-thing-you-open-to-get-stuff-done`, and others.
- [ ] Add `contentType`, `authorId`, `quickAnswer` and `sources` to each one, and fix lint errors. Move them to the `ai` desk only with a **301 redirect** in [next.config.ts](../../next.config.ts).
- [ ] **Write 3 launch pieces, one per person, one per template:**
  - Guide: "How to install Claude Code on Windows 11"
  - Guide: "How to set up OpenAI Codex CLI"
  - News or analysis: latest model release roundup
- [ ] Leave non-AI legacy articles alone. They render with the new fonts but skip strict rules.

---

## Phase 7: QA and rollout (days 9–10, everyone)

- [ ] `npm test`, `npm run lint`, `npm run lint:articles` and `npm run build` all pass.
- [ ] Visual QA at 375px, 768px and 1280px, in light and dark mode, on 3 new articles and 5 legacy ones. Compare with the Phase 0 screenshots.
- [ ] Lighthouse on an article page: Performance, Accessibility and SEO all 90 or above. CLS below 0.05 after the font change.
- [ ] **Cloudflare staging check:** confirm MDX articles actually load on the Workers deploy. `getAllArticles()` in [lib/articles.ts](../../lib/articles.ts) reads `content/` from disk at runtime, which may not work on Workers. If it fails, generate a content manifest at build time first.
- [ ] Deploy to staging, review together, then merge to production.

---

## Timeline at a glance

| Day | A (frontend) | B (model / SEO) | C (editorial / AI) |
|---|---|---|---|
| 1 | Phase 0 decisions, screenshots | Phase 0: fix tests, branch | Phase 0 decisions |
| 2–3 | Phase 2: fonts and type scale | Phase 1: schema, linter, templates, authors | Draft the 3 launch articles in the new templates |
| 4–6 | Phase 3: components and page order | Phase 4: structured data | Phase 5: AI pipeline |
| 7–8 | Phase 3 polish, legacy spot-checks | Phase 4 tests, sitemap | Phase 5 finish, Phase 6 migration |
| 9–10 | Phase 7 QA | Phase 7 QA | Phase 6 launch pieces, Phase 7 QA |

## Risks

| Risk | Mitigation |
|---|---|
| Legacy MDX breaks with new components | Every new field is optional at render time, old callout names stay as aliases, and the 10-article spot-check |
| Serif body font hurts load speed | Self-host latin subsets, preload one weight, `font-display: swap` with a matched fallback |
| Named-author change conflicts with the current editorial policy page | Update `/editorial-policy` in the same PR as the author registry |
| AI drafts invent sources or versions | Sources come only from the research packet, the existing claim validation stays, and guides are never auto-published |
| Cloudflare Workers can't read `content/` | Check early on staging (Phase 7), with the build-time manifest as the fallback |
