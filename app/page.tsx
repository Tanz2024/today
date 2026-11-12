import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";

import Container from "@/components/ui/Container";

import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import WorthReadingAfterTravel from "@/components/home/WorthReadingAfterTravel";
import TrendingStories from "@/components/home/TrendingStories";


import { selectFreshStories, getHomepageTrendingArticles, selectMostEngagedFeature, rankByEngagement } from "@/lib/story-discovery";
import { getCategoryMeta } from "@/lib/categories";
import { categoryAccentStyle } from "@/lib/category-colors";
import { getCachedHomepageEngagement } from "@/lib/homepage-engagement";
import { getCurrentDailyDrop as getLocalDailyDrop, getDailyDropStoryArticle } from "@/lib/daily-drop";
import { todayInSiteTimezone } from "@/lib/daily-drop-select";
import MetroPicks from "@/components/home/MetroPicks";
import { getMetroPicks } from "@/lib/metro-picks";
import { buildMetadata } from "@/lib/seo";
import { formatArticleRecency } from "@/lib/article-recency";



import { getCurrentDailyDrop as getEditorialDailyDrop, getCurrentDailySong } from "@/lib/editorial-content";

import type { Article, ArticleCardData } from "@/types/article";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { getHomepageCurationData, resolveCuratedArticlesFromData } from "@/lib/homepage-curation";
import HomepageSignals from "@/components/home/HomepageSignals";
import InterestSelector from "@/components/home/InterestSelector";
import HomepageReturnSignal from "@/components/home/HomepageReturnSignal";
import AdSlot from "@/components/ui/AdSlot";
import { dedupeHomepageArticles } from "@/lib/homepage-personalization";

// Homepage content is public and can tolerate a short freshness window.
// Visitor-specific reactions/votes remain client-side or use their own
// mutation paths and are not included in this route cache.
export const revalidate = 3600;

/* =========================================================
   PLAY IMAGE

   Real Pexels youth / skatepark image.
========================================================= */

/* =========================================================
   SEO
========================================================= */

const HOME_TITLE = "TodayAI | Youth Culture, Relationships & City Life";

export const metadata = {
  ...buildMetadata({
  title: HOME_TITLE,
  description:
    "Youth culture, relationships, entertainment and city life from around the world.",
  path: "/",
  image: "/BrisaStory.jpg",
  imageAlt: "TodayAI",
  // True size of public/BrisaStory.jpg. A 1200×630 social card does not exist yet.
  imageWidth: 1024,
  imageHeight: 559,
  }),
  // Absolute: the root title template would repeat the brand.
  title: { absolute: HOME_TITLE },
};

/* =========================================================
   HELPERS
========================================================= */

function articleHref(article: Article) {
  return `/${article.category}/${article.slug}`;
}

function toCardData(article: Article): ArticleCardData {
  const isConsumingIdentity = article.title.toLowerCase().startsWith("consuming identity");
  return {
    slug: article.slug,
    category: article.category,
    title: article.title,
    displayTitle: article.displayTitle,
    description: article.description,
    image: isConsumingIdentity ? "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1600&q=85" : article.image,
    imageAlt: isConsumingIdentity ? "A smartphone resting in a young person's hand" : article.imageAlt,
    date: article.date,
  };
}

function categoryLabel(article: Article) {
  return (
    article.editorialLabel ??
    getCategoryMeta(article.category)?.name ??
    article.category
  );
}

function hasPremiumImage(article: Article) {
  if (!article.image) {
    return false;
  }

  if (article.needsImageReview) {
    return false;
  }

  const source = String(
    article.imageSourceType ?? "",
  );

  return [
    "pexels",
    "editorial",
    "licensed",
  ].includes(source);
}

function isYouthTrendArticle(article: Article) {
  const text = `${article.title} ${article.description} ${article.tags.join(" ")}`;
  return /gen alpha|gen z|tiktok|youtube|roblox|discord|meme|viral|dating|fragrance|beauty|fashion|style|gaming|streaming|internet culture|social media|campus/i.test(text);
}

function chooseFeature(
  articles: Article[],
  predicate: (article: Article) => boolean,
) {
  return (
    articles.find(
      (article) =>
        predicate(article) &&
        hasPremiumImage(article),
    ) ??
    articles.find(predicate)
  );
}

// A newly published generated article is the daily editorial lead when it has
// a verified/premium image. Static stories retain the existing curated order.
function chooseBrandFeature(articles: Article[]) {
  const categoryPriority: Record<string, number> = {
    culture: 80,
    relationships: 76,
    entertainment: 72,
    style: 68,
    "self-care": 64,
    gaming: 58,
    campus: 52,
    money: 46,
    "sex-health": 44,
    travel: 36,
  };
  const candidates = articles.filter(hasPremiumImage);
  // The most recently published public story should lead the homepage. This
  // keeps a new article visible even when older stories still have homepage
  // hero flags or stronger engagement history.
  const latestPublished = [...articles]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (latestPublished) return latestPublished;
  const designatedHeroes = candidates
    .filter((article) => article.homepageHero)
    .sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime());
  if (designatedHeroes[0]) return designatedHeroes[0];
  const latestGenerated = [...candidates]
    .filter((article) => article.isGenerated && isYouthTrendArticle(article))
    .sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())[0];
  if (latestGenerated) return latestGenerated;
  return [...candidates].sort((a, b) => {
    const score = (article: Article) =>
      (categoryPriority[article.category] ?? 20) +
      (article.homepageHero ? 24 : 0) +
      (article.featured ? 12 : 0);
    return score(b) - score(a) || new Date(b.date).getTime() - new Date(a.date).getTime();
  })[0] ?? chooseFeature(articles, (article) => Boolean(article.homepageHero)) ?? articles[0];
}

/* =========================================================
   PAGE
========================================================= */

export default async function HomePage({
}: {
  searchParams?: never;
}) {
  const metroPicks = getMetroPicks();

  const all = await getPublicDiscoverableArticles();

  const featured =
    chooseBrandFeature(all) ??
    chooseFeature(all, (article) => Boolean(article.featured)) ??
    all.find(hasPremiumImage) ?? all[0];

  if (!featured) {
    return null;
  }

  const articleSlugs = all.map((article) => article.slug);
  const engagementResult = await getCachedHomepageEngagement(articleSlugs);
  const engagement = engagementResult.status === "available" ? engagementResult.data : new Map();
  const reactionTotals = new Map(articleSlugs.map((slug) => [slug, engagement.get(slug)?.reactions ?? 0]));
  const readTotals = new Map(articleSlugs.map((slug) => [slug, engagement.get(slug)?.reads ?? 0]));
  const engagementScores = new Map(articleSlugs.map((slug) => [slug, engagement.get(slug)?.engagementScore ?? 0]));
  const [editorialDrop, editorialDailySong] = await Promise.all([getEditorialDailyDrop(), getCurrentDailySong()]);
  const dailySongPayload = editorialDailySong?.payload as Record<string, unknown> | undefined;
  const editorialDropPayload = editorialDrop?.payload as Record<string, unknown> | undefined;
  const localDailyDrop = getLocalDailyDrop();
  const siteDate = todayInSiteTimezone();
  // An old Appwrite item can remain the latest published record when no new
  // edition was committed. Only a same-day item may override the local
  // archive; otherwise use the finite local archive and label it Latest Drop.
  const dailyDropPayload = editorialDropPayload?.date === siteDate
    ? editorialDropPayload
    : localDailyDrop?.drop as Record<string, unknown> | undefined;
  const dailyDrop = dailyDropPayload && dailySongPayload
    ? { ...dailyDropPayload, recommendationType: "song", recommendationTitle: `${editorialDailySong.title} — ${editorialDailySong.subtitle}`, recommendationHref: editorialDailySong.destinationUrl ?? "#", recommendationDescription: editorialDailySong.description ?? "Today's song pick." }
    : dailyDropPayload;
  const dailyDropResult = dailyDrop ? { drop: dailyDrop as unknown as Parameters<typeof getDailyDropStoryArticle>[0], isLatest: dailyDropPayload?.date !== siteDate } : null;
  // Resolve against local and Appwrite-generated articles so a generated
  // Daily Drop story still gets its image and is de-duplicated below.
  const dailyDropStoryArticle = dailyDropResult
    ? all.find((article) => articleHref(article) === dailyDropResult.drop.storyHref) ?? getDailyDropStoryArticle(dailyDropResult.drop)
    : undefined;
  const alreadyDisplayedArticleSlugs = new Set<string>([featured.slug, ...(dailyDropStoryArticle ? [dailyDropStoryArticle.slug] : [])]);
  const homepageCuration = await getHomepageCurationData(["trending", "fresh-stories"]);
  const configuredTrending = resolveCuratedArticlesFromData("trending", all, homepageCuration);
  const trending = dedupeHomepageArticles(configuredTrending ?? getHomepageTrendingArticles(all, reactionTotals, readTotals, 3, alreadyDisplayedArticleSlugs, engagementScores), alreadyDisplayedArticleSlugs).slice(0, 3);
  const secondary = trending;
  const finalTrendingSlugs = new Set(secondary.map((article) => article.slug));
  for (const slug of finalTrendingSlugs) alreadyDisplayedArticleSlugs.add(slug);

  const reservedForFeature = new Set([featured.slug, ...finalTrendingSlugs, ...(dailyDropStoryArticle ? [dailyDropStoryArticle.slug] : [])]);
  const cultureFeature = selectMostEngagedFeature(
    all,
    reactionTotals,
    readTotals,
    (article) => Boolean(article.homepageCulture) || article.category === "entertainment",
    reservedForFeature,
    engagementScores,
  );
  if (cultureFeature) reservedForFeature.add(cultureFeature.slug);
  const travelFeature = selectMostEngagedFeature(
    all,
    reactionTotals,
    readTotals,
    (article) => Boolean(article.homepageTravel) || article.category === "travel",
    reservedForFeature,
    engagementScores,
  );

  const travelLinks = all
    .filter((article) => article.category === "travel" && article.slug !== travelFeature?.slug)
    .slice(0, 3);

  const heroSlugs = new Set<string>([
    featured.slug,
    ...secondary.map((article) => article.slug),
    ...(dailyDropStoryArticle ? [dailyDropStoryArticle.slug] : []),
  ]);
  const removedFromFreshStories = new Set([
    "consuming-identity-how-youth-navigate-sex-health-through-digital-culture",
  ]);
  const configuredFresh = resolveCuratedArticlesFromData("fresh-stories", all, homepageCuration);
  const autoFreshStories = selectFreshStories(all, new Set([
    ...alreadyDisplayedArticleSlugs,
    ...removedFromFreshStories,
    ...heroSlugs,
    ...(cultureFeature ? [cultureFeature.slug] : []),
    ...(travelFeature ? [travelFeature.slug] : []),
    ...travelLinks.map((article) => article.slug),
  ]), 3, reactionTotals, readTotals, new Date().getTime(), engagementScores);
  const freshStories = dedupeHomepageArticles((configuredFresh ?? autoFreshStories).filter((article) => !removedFromFreshStories.has(article.slug)), alreadyDisplayedArticleSlugs).slice(0, 3);
  const latestGeneratedArticle = [...all]
    .filter((article) => article.isGenerated && !alreadyDisplayedArticleSlugs.has(article.slug) && !reservedForFeature.has(article.slug) && !removedFromFreshStories.has(article.slug))
    .sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())[0];
  const homepageFreshStories = latestGeneratedArticle && !freshStories.some((article) => article.slug === latestGeneratedArticle.slug) && !alreadyDisplayedArticleSlugs.has(latestGeneratedArticle.slug)
    ? [latestGeneratedArticle, ...freshStories].slice(0, 3)
    : freshStories;
  const freshStorySlugs = new Set(freshStories.map((article) => article.slug));

  const excluded = new Set<string>([
    featured.slug,
    ...secondary.map((article) => article.slug),
    ...(cultureFeature ? [cultureFeature.slug] : []),
    ...(travelFeature ? [travelFeature.slug] : []),
    ...(dailyDropStoryArticle ? [dailyDropStoryArticle.slug] : []),
    ...travelLinks.map((article) => article.slug),
    ...freshStorySlugs,
  ]);
  const worthReading = rankByEngagement(
    all.filter((article) => !excluded.has(article.slug)),
    reactionTotals,
    readTotals,
    engagementScores,
  );

  return (
    <Container
      className="
        home-editorial home-newspaper
        flex
        flex-col
        gap-8
        py-6
        sm:gap-10
        sm:py-9
        lg:gap-10
        lg:py-11
      "
      >
      <div className="home-editorial-intro" aria-label="Today’s edition">
        <span className="home-editorial-kicker">The TodayAI Daily / 11.11.26</span>
        <span className="home-editorial-intro-rule" />
        <span className="home-editorial-intro-copy">Culture, relationships &amp; city life</span>
      </div>
      {/* ===================================================
          HERO
      ==================================================== */}

      <PremiumHero
        primary={featured}
        secondary={secondary}
      />

      <HomepageSignals />
      <HomepageReturnSignal latestPublishedAt={[...all].sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())[0]?.updated || [...all].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]?.date || new Date(0).toISOString()} />

      <LatestAISection articles={all} featuredSlug={featured.slug} />

      <Link href="/play" aria-labelledby="play-teaser-heading" className="group block border-y border-card-border py-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-electric sm:py-9">
        <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto] sm:gap-10">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[.16em] text-electric">TodayAI / Play</p>
            <h2 id="play-teaser-heading" className="mt-3 max-w-xl font-heading text-3xl font-black leading-[.98] tracking-[-.05em] transition-colors group-hover:text-electric sm:text-5xl">The next move is yours.</h2>
            <p className="mt-3 text-sm text-muted">Stories that react. Games you can jump into.</p>
          </div>
          <span aria-hidden="true" className="relative aspect-[4/3] w-full shrink-0 overflow-hidden border border-near-black bg-near-black transition-transform duration-300 ease-out group-hover:rotate-2 group-hover:scale-105 motion-reduce:transition-none sm:aspect-auto sm:h-32 sm:w-44">
            <Image src="/images/play-teaser-character.png" alt="" fill sizes="176px" className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-110 motion-reduce:transition-none" />
            <span className="absolute inset-0 bg-near-black/20" />
          </span>
        </div>
        <span className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-near-black group-hover:text-electric">See what&apos;s inside <ArrowRight size={15} /></span>
      </Link>

      {/* ===================================================
          TRENDING STORIES
      ==================================================== */}

      <div data-homepage-impression="trending_impression" data-homepage-module="fresh"><TrendingStories articles={homepageFreshStories.map(toCardData)} /></div>


      <InterestSelector />

      <ExploreTodayAI />

      {/* ===================================================
          METRO PICKS
      ==================================================== */}

          <MetroPicks picks={metroPicks} />


      {/* ===================================================
          SELECTED CULTURE / MUSIC / TRAVEL
      ==================================================== */}

      <div
        className="
          flex
          flex-col
          gap-8
          sm:gap-10
          lg:gap-12
        "
      >
        {cultureFeature && (
          <EditorialFeature
            article={
              cultureFeature
            }
            eyebrow={categoryLabel(cultureFeature)}
          />
        )}

        {travelFeature && (
          <div data-homepage-module="travel"><TravelFeature
            feature={
              travelFeature
            }
            links={travelLinks}
          /></div>
        )}

        <WorthReadingAfterTravel
          articles={worthReading.map(toCardData)}
        />
      </div>

      <AdSlot slot="homepage-boundary" desktopOnly className="my-2 sm:my-4" />

      <section id="newsletter" className="relative left-1/2 w-screen -translate-x-1/2 scroll-mt-20 border-y border-[#e3c8c8] bg-[#fdf6f6] px-5 py-7 sm:px-8 sm:py-9">
        <div className="mx-auto max-w-xl">
          <div data-homepage-impression="newsletter_impression"><NewsletterSignup variant="homepage" /></div>
        </div>
      </section>

    </Container>
  );
}

/* =========================================================
   HERO
========================================================= */

function PremiumHero({
  primary,
  secondary,
}: {
  primary: Article;
  secondary: Article[];
}) {
  return (
    <section
      aria-labelledby="homepage-lead"
    className="home-hero
        relative
        left-1/2
        w-screen
        -translate-x-1/2
        -mt-6
        grid
        gap-0
        lg:grid-cols-[minmax(0,1.58fr)_minmax(310px,.72fr)]
        lg:gap-0
        sm:-mt-10
        lg:-mt-12
      "
    >
      <Link
        href={
          articleHref(primary)
        }
        className="
          group
          block
          min-w-0
        "
      >
        <article>
          <div
            className="
              home-hero-media
              relative
              aspect-[4/3]
              overflow-hidden
              bg-[#eeeff1]
              sm:aspect-[16/10]
              lg:aspect-[16/10]
              min-[1280px]:max-[1439px]:aspect-[16/9]
            "
          >
            <Image
              src={primary.image}
              alt={
                primary.imageAlt
              }
              fill
              // The page's largest image (LCP): fetch it first. `priority` is
              // deprecated in Next 16 and no longer sets fetch priority.
              loading="eager"
              fetchPriority="high"
              sizes="
                (max-width: 1024px) 100vw,
                68vw
              "
              className="
                object-cover
                transition-transform
                duration-700
                ease-[cubic-bezier(.22,1,.36,1)]
                group-hover:scale-[1.018]
              "
              style={{
                filter: `brightness(${Math.min(1.2, Math.max(0.5, primary.homepageImageBrightness ?? 1))})`,
                objectFit: primary.homepageImageFit ?? "cover",
                objectPosition: primary.homepageImagePosition ?? "center",
                border: primary.homepageImageBorder ? "1px solid rgba(17, 24, 39, 0.18)" : undefined,
              }}
            />

            <div
              className="home-hero-overlay
                absolute
                inset-0
                bg-gradient-to-t
                from-[#111111]/[.98]
                via-[#111111]/[.48]
                to-transparent
                sm:from-[#111111]/[.96]
                sm:via-[#111111]/[.32]
              "
              style={{
                opacity: Math.min(1, Math.max(0, primary.homepageOverlayOpacity ?? 1)),
              }}
            />

            <div
              className="home-hero-copy
                absolute
                inset-x-0
                bottom-0
                p-5
                sm:p-7
                lg:p-9
                xl:p-10
              "
            >
              <p
                className="
                  text-[12px]
                  font-semibold
                  uppercase
                  tracking-[0.08em]
                  text-white
                  whitespace-nowrap
                  drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]
                  sm:text-[11px]
                  sm:tracking-[0.14em]
                  sm:text-white
                  sm:drop-shadow-none
                "
              >
                {categoryLabel(
                  primary,
                )}

                <span
                  className="
                    mx-2
                    text-white/70
                    sm:text-white/40
                  "
                >
                  ·
                </span>

                {
                  formatArticleRecency(primary.date)
                }
              </p>

              <h1
                id="homepage-lead"
                className="
                  sr-only
                "
              >
                TodayAI
              </h1>

              <h2
                className="
                  home-hero-title
                  mt-3
                  max-w-[870px]
                  font-heading
                  text-[24px]
                  font-semibold
                  leading-[1.08]
                  tracking-[-0.04em]
                  text-white
                  sm:text-[34px]
                  lg:text-[40px]
                "
              >
                {primary.title}
              </h2>

              <span
                className="
                  mt-5
                  inline-flex
                  items-center
                  gap-2
                  text-[13px]
                  font-semibold
                  text-white
                "
              >
                Read story

                <ArrowRight
                  size={14}
                  className="
                    transition-transform
                    group-hover:translate-x-1
                  "
                />
              </span>
            </div>
          </div>
        </article>
      </Link>

      <aside
        aria-labelledby="homepage-trending-heading"
        className="
          home-hero-rail
          border-black/[0.10]
          px-4
          sm:px-6
          lg:border-l
          lg:border-t-0
          lg:pl-8
          lg:pr-8
        "
      >
        <div className="home-rail-heading" aria-hidden="true"><span>02—04</span><span>Next reads</span></div>
        <h2 id="homepage-trending-heading" className="sr-only">Trending — What everyone&apos;s reading</h2>
        {secondary
          .slice(0, 3)
          .map(
            (
              article,
              index,
            ) => (
              <Link
                key={
                  article.slug
                }
                href={
                  articleHref(
                    article,
                  )
                }
                className={`
                  group
                  grid
                  grid-cols-[76px_minmax(0,1fr)]
                  gap-3.5
                  border-b
                  border-black/[0.06]
                  py-4
                  sm:grid-cols-[120px_minmax(0,1fr)]
                  sm:gap-4
                  sm:py-5
                  lg:block
                  lg:py-7
                  ${index >= 2 ? "hidden lg:block" : ""}
                `}
              >
                <div
                  className="
                    relative
                    aspect-[4/3]
                    overflow-hidden
                    bg-[#eef0f2]
                    lg:hidden
                  "
                >
                  <Image
                    src={
                      article.image
                    }
                    alt={
                      article.imageAlt
                    }
                    fill
                    sizes="120px"
                    className="
                      object-cover
                      transition-transform
                      duration-500
                      group-hover:scale-[1.025]
                    "
                  />
                </div>

                <div>
                  <div
                    className="
                      flex
                      items-center
                      gap-3
                    "
                  >
                    <span
                      className="
                        hidden
                        font-mono
                        text-[10px]
                        text-muted
                        lg:inline
                      "
                    >
                      {String(
                        index + 1,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>

                    <span
                      className="
                        text-[9px]
                        font-semibold
                        uppercase
                        tracking-[0.11em]
                      text-muted
                    "
                      style={categoryAccentStyle(article.category)}
                    >
                      {
                        categoryLabel(
                          article,
                        )
                      }
                    </span>
                  </div>

                  <h2
                    className="
                      mt-1.5
                      line-clamp-2
                      font-heading
                      text-[16px]
                      font-semibold
                      leading-[1.22]
                      tracking-[-0.02em]
                      text-[#111111]
                      transition-colors
                      group-hover:text-[#5b45d6]
                      sm:mt-2
                      sm:text-[21px]
                      lg:text-[25px]
                    "
                  >
                    {
                      article.displayTitle ?? article.title
                    }
                  </h2>

                  <p
                    className="
                      mt-3
                      hidden
                      text-[12px]
                      text-muted
                      lg:block
                    "
                  >
                    {
                      formatArticleRecency(article.date)
                    }
                  </p>
                </div>
              </Link>
            ),
          )}
      </aside>
    </section>
  );
}

function LatestAISection({ articles, featuredSlug }: { articles: Article[]; featuredSlug: string }) {
  const latest = articles
    .filter((article) => article.slug !== featuredSlug)
    .filter((article) => /\b(ai|artificial intelligence|technology|tool|chatgpt|claude|gemini|automation|coding|digital)\b/i.test(`${article.title} ${article.description} ${article.tags.join(" ")}`))
    .sort((a, b) => new Date(b.updated || b.date).getTime() - new Date(a.updated || a.date).getTime())
    .slice(0, 5);

  if (!latest.length) return null;

  return (
    <section className="home-news-section" aria-labelledby="latest-ai-heading">
      <div className="home-section-heading">
        <div>
          <p className="home-section-kicker">The TodayAI desk</p>
          <h2 id="latest-ai-heading">Latest AI news</h2>
        </div>
        <Link href="/culture" className="home-section-link">View all news <ArrowRight size={14} /></Link>
      </div>
      <div className="home-news-grid">
        {latest.map((article, index) => (
          <Link key={article.slug} href={articleHref(article)} className={`home-news-item ${index === 0 ? "home-news-item-lead" : ""}`}>
            {index === 0 && <div className="home-news-thumb"><Image src={article.image} alt={article.imageAlt} fill sizes="(max-width: 768px) 100vw, 360px" className="object-cover" /></div>}
            <div className="home-news-copy">
              <p className="home-news-meta">{categoryLabel(article)} · {formatArticleRecency(article.date)}</p>
              <h3>{article.displayTitle ?? article.title}</h3>
              {index === 0 && <p className="home-news-description">{article.description}</p>}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ExploreTodayAI() {
  const links = [
    ["AI tools & practical utilities", "/tools", "Useful calculators, planning tools and everyday helpers."],
    ["Questions & explainers", "/questions", "Clear answers to the things people are asking now."],
    ["Games & interactive", "/play", "Low-stakes ways to explore, play and share."],
    ["Saved stories", "/saved", "Keep the stories worth coming back to."],
  ] as const;

  return (
    <section className="home-explore-section" aria-labelledby="explore-todayai-heading">
      <div className="home-section-heading">
        <div>
          <p className="home-section-kicker">Beyond the feed</p>
          <h2 id="explore-todayai-heading">Explore TodayAI</h2>
        </div>
      </div>
      <div className="home-explore-grid">
        {links.map(([title, href, description]) => (
          <Link key={href} href={href} className="home-explore-card">
            <span className="home-explore-arrow">↗</span>
            <h3>{title}</h3>
            <p>{description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* =========================================================
   CULTURE FEATURE
========================================================= */

function EditorialFeature({
  article,
  eyebrow,
}: {
  article: Article;
  eyebrow: string;
}) {
  return (
    <section>
      <div className="mb-7 sm:mb-9">
        <h2 className="font-heading text-[30px] font-semibold leading-[1.04] tracking-[-0.04em] text-[#111111] sm:text-[38px] lg:text-[44px]">
          Worth your attention right now.
        </h2>
        <p className="mt-2 hidden max-w-[490px] text-[13px] leading-[1.55] text-[#585c63] sm:block">
          A standout story chosen for a clear reason — useful context, a strong angle or a moment worth understanding before it disappears.
        </p>
      </div>
      <Link
        href={
          articleHref(article)
        }
        className="
          group
          relative
          left-1/2
          w-screen
          -translate-x-1/2
          block
        "
      >
        <div
          className="
            relative
            aspect-[4/3]
            overflow-hidden
            bg-[#eceef1]
            sm:aspect-[16/9]
            lg:aspect-[21/9]
          "
        >
          <Image
            src={article.image}
            alt={
              article.imageAlt
            }
            fill
            sizes="100vw"
            className="
              object-cover
              transition-transform
              duration-700
              ease-[cubic-bezier(.22,1,.36,1)]
              group-hover:scale-[1.015]
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-[#111111]/[.96]
              via-[#111111]/[.38]
              to-transparent
            "
          />

          <div
            className="
              absolute
              inset-x-0
              bottom-0
              p-5
              sm:p-8
              lg:p-10
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.14em]
                text-white/[.88]
              "
            >
              {eyebrow}
            </p>

            <h2
              className="
                mt-3
                max-w-[850px]
                font-heading
                text-[28px]
                font-semibold
                leading-[1.05]
                tracking-[-0.04em]
                text-white
                sm:text-[38px]
                lg:text-[46px]
              "
            >
              {article.displayTitle ?? article.title}
            </h2>

            <p
              className="
                mt-4
                hidden
                max-w-[600px]
                text-[14px]
                leading-[1.6]
                text-white/[.9]
                sm:block
              "
            >
              {article.description}
            </p>

            <span
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                text-[13px]
                font-semibold
                text-white
              "
            >
              Read story

              <ArrowRight
                size={14}
                className="
                  transition-transform
                  group-hover:translate-x-1
                "
              />
            </span>
          </div>
        </div>
      </Link>
    </section>
  );
}

/* =========================================================
   TRAVEL
========================================================= */

function TravelFeature({
  feature,
  links,
}: {
  feature: Article;
  links: Article[];
}) {
  return (
    <section
      aria-labelledby="travel-heading"
      className="
        pt-2
      "
    >
      <div
        className="
          flex
          items-end
          justify-between
          gap-8
        "
      >
        <div>
          <h2
            id="travel-heading"
            className="
              mt-2
              font-heading
              text-[32px]
              font-semibold
              tracking-[-0.045em]
              text-[#111111]
              sm:text-[41px]
            "
          >
            Go somewhere.
          </h2>

          <p
            className="
              mt-2
              hidden
              max-w-[490px]
              text-[13px]
              leading-[1.55]
              text-[#585c63]
              sm:block
            "
          >
            Places worth
            leaving the group
            chat for.
          </p>
        </div>

      </div>

      <Link
        href={
          articleHref(feature)
        }
        className="
          group
          relative
          left-1/2
          w-screen
          -translate-x-1/2
          mt-7
          block
        "
      >
        <div
          className="
            relative
            aspect-[4/3]
            overflow-hidden
            bg-[#eceef1]
            sm:aspect-[16/9]
            lg:aspect-[21/9]
          "
        >
          <Image
            src={feature.image}
            alt={
              feature.imageAlt
            }
            fill
            sizes="
              (max-width: 1024px) 100vw,
              1320px
            "
            className="
              object-cover
              transition-transform
              duration-700
              ease-[cubic-bezier(.22,1,.36,1)]
              group-hover:scale-[1.015]
            "
          />

          <div
            className="
              absolute
              inset-0
              bg-gradient-to-t
              from-[#111111]/[.96]
              via-[#111111]/[.38]
              to-transparent
            "
          />

          <div
            className="
              absolute
              inset-x-0
              bottom-0
              p-5
              sm:p-8
              lg:p-10
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.13em]
                text-white/[.88]
              "
            >
              Destination

              <span className="mx-2">
                ·
              </span>

              {
                formatArticleRecency(feature.date)
              }
            </p>

            <h3
              className="
                mt-3
                max-w-[880px]
                font-heading
                text-[28px]
                font-semibold
                leading-[1.05]
                tracking-[-0.04em]
                text-white
                sm:text-[38px]
                lg:text-[47px]
              "
            >
              {feature.title.includes(": A Simple Route") ? <>{feature.title.replace(": A Simple Route", ":")}<br />A Simple Route</> : feature.title}
            </h3>

            <p
              className="
                mt-4
                hidden
                max-w-[620px]
                text-[14px]
                leading-[1.6]
                text-white/[.9]
                sm:block
              "
            >
              {
                feature.description
              }
            </p>

            <span
              className="
                mt-5
                inline-flex
                items-center
                gap-2
                text-[13px]
                font-semibold
                text-white
              "
            >
              Read travel story

              <ArrowRight
                size={14}
                className="
                  transition-transform
                  group-hover:translate-x-1
                "
              />
            </span>
          </div>
        </div>
      </Link>

      {links.length > 0 && (
        <div
          className="
            mt-1
            hidden
            divide-y
            divide-black/[0.09]
            border-b
            border-black/[0.09]
            sm:block
          "
        >
          {links.map(
            (article) => (
              <Link
                key={
                  article.slug
                }
                href={
                  articleHref(
                    article,
                  )
                }
                className="
                  group
                  grid
                  min-h-[70px]
                  grid-cols-[1fr_auto]
                  items-center
                  gap-6
                  py-4
                "
              >
                <div>
                  <p
                    className="
                      font-heading
                      text-[17px]
                      font-medium
                      leading-[1.25]
                      tracking-[-0.02em]
                      text-[#111111]
                      transition-colors
                      group-hover:text-[#5b45d6]
                      sm:text-[19px]
                    "
                  >
                    {
                      article.displayTitle ?? article.title
                    }
                  </p>

                  <p
                    className="
                      mt-1
                      text-[11px]
                      text-[#585c63]
                    "
                  >
                    Travel &amp; City Life ·{" "}
                    {
                      formatArticleRecency(article.date)
                    }
                  </p>
                </div>

              </Link>
            ),
          )}
        </div>
      )}

    </section>
  );
}
