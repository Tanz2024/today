import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";

import Breadcrumbs from "@/components/article/Breadcrumbs";
import TableOfContents from "@/components/article/TableOfContents";
import ShareButtons from "@/components/article/ShareButtons";
import AuthorInfo from "@/components/article/AuthorInfo";
import QuickReadPanel from "@/components/article/QuickReadPanel";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import CommunityReportButton from "@/components/community/CommunityReportButton";
import ReadTimeTracker from "@/components/article/ReadTimeTracker";
import RecentReadTracker from "@/components/article/RecentReadTracker";
import ArticleEntryAttribution from "@/components/article/ArticleEntryAttribution";
import MobileReaderTools from "@/components/article/MobileReaderTools";
import ArticleIntroUtilities from "@/components/article/ArticleIntroUtilities";
import RelatedArticles from "@/components/article/RelatedArticles";
import QuickReactionBar from "@/components/reactions/QuickReactionBar";
import PulsePoll from "@/components/pulse/PulsePoll";
import AdSlot from "@/components/ui/AdSlot";
import { mdxComponents } from "@/components/article/MdxComponents";
import ReadNext from "@/components/article/ReadNext";
import { bodyLayout, insertReadNext, readNextBoundary, splitBodyForAd, splitBodyForMobile } from "@/lib/article-body";
import { articleTopicLinks, topicPath } from "@/lib/topics";
import { getTopicIndex } from "@/lib/topic-catalog";
import { unwrapImageParagraphs } from "@/lib/mdx-blocks";

import { extractToc } from "@/lib/toc";
import { formatDate } from "@/lib/utils";
import { getCachedQuickReactionCounts } from "@/lib/quick-reactions";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { hasIndexableImage, rankRelatedArticles, scoreRelatedArticles } from "@/lib/article-discovery";
import { getCachedHomepageEngagement } from "@/lib/homepage-engagement";
import { getHomepageTrendingArticles } from "@/lib/story-discovery";
import { getReadStats } from "@/lib/read-stats";
import { getSiteUrl } from "@/lib/seo";
import { displayArticleDescription } from "@/lib/article-display";
import { articleJsonLd, resolveArticleAuthor } from "@/lib/structured-data";
import JsonLd from "@/components/seo/JsonLd";
import { getCategoryMeta, getPublicDeskSlug } from "@/lib/categories";
import { breadcrumbListJsonLd, getArticleBreadcrumbs } from "@/lib/breadcrumbs";
import { categoryAccentStyle } from "@/lib/category-colors";
import { getGameBySlug } from "@/lib/rawg";
import { getLatestMobileMultiplayerGames } from "@/lib/rawg";
import { createContextualPoll } from "@/lib/article-polls";
import MobileMultiplayerRecommendations from "@/components/gaming/MobileMultiplayerRecommendations";
import MoreMultiplayerStories from "@/components/gaming/MoreMultiplayerStories";
import EditorialVideo from "@/components/article/EditorialVideo";
import MobileReadingTreatment, { MobileReadingProgress } from "@/components/article/MobileReadingTreatment";
import ToolReferralTracker from "@/components/article/ToolReferralTracker";

import type { Article } from "@/types/article";

const articleBodyClasses = `
  text-[calc(17px*var(--read-scale,1))]
  leading-[1.58]
  tracking-[0.002em]
  text-[#292b31]
  sm:text-[calc(18px*var(--read-scale,1))]
  sm:leading-[1.78]

  [&_p]:mb-4
  sm:[&_p]:mb-6

  [&_strong]:font-semibold

  [&_ul]:my-4
  sm:[&_ul]:my-6
  [&_ul]:space-y-2
  [&_ul]:pl-6

  [&_ol]:my-4
  sm:[&_ol]:my-6
  [&_ol]:space-y-2
  [&_ol]:pl-6

  [&_li]:pl-1

  [&_blockquote]:my-6
  sm:[&_blockquote]:my-9
`;

export default async function ArticleView({
  article,
}: {
  article: Article;
}) {
  const primaryGame = article.category === "gaming" && article.primaryGame ? await getGameBySlug(article.primaryGame) : null;
  const heroImage = primaryGame?.image ?? article.image;
  const heroAlt = primaryGame?.image ? article.primaryGameImageAlt ?? `${primaryGame.name} game artwork` : article.imageAlt;
  const toc = extractToc(article.content);
  const allArticles = await getDiscoverableArticles();
  const related = rankRelatedArticles(article, allArticles, 3);
  const mobileGames = article.slug === "gaming-vibing-with-friends" ? await getLatestMobileMultiplayerGames(12) : [];
  const multiplayerStories = article.slug === "gaming-vibing-with-friends" ? rankRelatedArticles(article, allArticles, 6).filter((item) => item.gamingCategory === "multiplayer" && item.slug !== article.slug).slice(0, 4) : [];
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  const quickReactionCounts = isProductionBuild ? { relatable: 0, helpful: 0, surprising: 0, notForMe: 0 } : await getCachedQuickReactionCounts(article.slug);
  const trendingEngagement = isProductionBuild ? null : await getCachedHomepageEngagement(allArticles.map((item) => item.slug));
  const trendingArticles = trendingEngagement?.status === "available" ? getHomepageTrendingArticles(allArticles, new Map(allArticles.map((item) => [item.slug, trendingEngagement.data.get(item.slug)?.reactions ?? 0]))) : [];
  const isTrendingNow = trendingArticles.some((item) => item.slug === article.slug);
  const contextualPoll = createContextualPoll(article.slug, article.contextualPoll);
  const readStats = isProductionBuild ? null : await getReadStats(article.slug);

  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/${article.category}/${article.slug}`;

  const category = getCategoryMeta(article.category);
  // Public desk name for the newsletter line (hidden desks resolve via Phase 2).
  const newsletterDesk = getCategoryMeta(getPublicDeskSlug(article.category))?.name;
  const isHaunted = article.category === "travel" && article.tags.some((tag) => tag.toLowerCase() === "haunted & strange");
  const readingMinutes = Math.max(1, Number.parseInt(article.readingTime.match(/\d+/)?.[0] ?? "1", 10));
  const { qualifiesForMidpointAd, isLongForm } = bodyLayout(readingMinutes);
  // One contextual link to a topic-related story that is not already a card.
  const relatedKeys = new Set(related.map((item) => `${item.category}/${item.slug}`));
  const readNextArticle = scoreRelatedArticles(article, allArticles, 6).find((item) => !relatedKeys.has(`${item.category}/${item.slug}`));
  const readNextAt = readNextArticle ? readNextBoundary(article.content, readingMinutes) : null;
  const body = readNextArticle && readNextAt !== null ? insertReadNext(article.content, readNextAt) : article.content;
  const bodyComponents = readNextArticle ? { ...mdxComponents, ReadNext: () => <ReadNext article={readNextArticle} /> } : mdxComponents;
  const { before, after } = qualifiesForMidpointAd ? splitBodyForAd(body) : { before: body, after: "" };
  const mobileBody = isLongForm ? splitBodyForMobile(body) : null;
  const topicLinks = articleTopicLinks(article, await getTopicIndex());
  const remainingMinutes = Math.max(1, Math.ceil((article.content.trim().split(/\s+/).length * 0.58) / 220));
  // The editorial SVG placeholder is not article imagery: leave it out of
  // structured data rather than emit an empty or misleading image.
  const absoluteHeroImage = hasIndexableImage(heroImage) ? new URL(heroImage, siteUrl).toString() : undefined;
  const author = resolveArticleAuthor(article);
  const jsonLd = articleJsonLd({ ...article, description: displayArticleDescription(article) }, { siteUrl, url, section: category?.name ?? article.category, image: absoluteHeroImage });

  const breadcrumbs = getArticleBreadcrumbs(article.category, article.slug, article.title);
  const breadcrumbLd = breadcrumbListJsonLd(breadcrumbs, siteUrl);

  return (
    <div className={`mx-auto w-full max-w-[1180px] px-5 pb-28 pt-8 sm:px-7 sm:pb-24 sm:pt-12 lg:px-10 ${isHaunted ? "haunted-article bg-[#F3F0ED] shadow-[0_0_0_100vmax_#F3F0ED]" : "bg-background"}`}>
      <MobileReadingProgress />
      <RecentReadTracker slug={article.slug} />
      <ArticleEntryAttribution slug={article.slug} />
      <ToolReferralTracker />
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />

      {/* =====================================================
          ARTICLE HEADER
      ====================================================== */}

      <article>
        <header className="mx-auto max-w-[900px]">
          <Breadcrumbs items={breadcrumbs} />

          <p className={`mt-8 text-[11px] font-semibold uppercase tracking-[0.15em] sm:text-[12px] sm:tracking-[0.14em] ${isHaunted ? "text-[#6A6174]" : "text-muted"}`}>
            {isTrendingNow && <span className="text-electric">Trending now · </span>}
            <span style={isHaunted ? undefined : categoryAccentStyle(article.category)}>{article.editorialLabel ?? category?.name ?? article.category}</span>
          </p>

          <h1
            className="
              mt-4 max-w-[880px]
              font-display
              text-[38px] font-semibold
              leading-[1.14]
              tracking-[-0.03em]
              text-near-black
              sm:text-[52px]
              sm:leading-[1.04]
              sm:tracking-[-0.045em]
              lg:text-[60px]
            "
          >
            {article.title}
          </h1>

          <p
            className="
              mt-5 max-w-[760px]
              text-[18px]
              leading-[1.55]
              text-muted
              sm:text-[21px]
              sm:leading-[1.52]
            "
          >
            {displayArticleDescription(article)}
          </p>

          <div
            className="
              mt-7 flex flex-wrap
              items-center gap-x-2 gap-y-2
              text-[13px] leading-none
              text-muted
              sm:text-[14px]
            "
          >
            <span className="font-medium text-near-black">
              By{" "}
              {author.profilePath ? (
                <Link href={author.profilePath} rel="author" className="hover:text-electric hover:underline">
                  {author.name}
                </Link>
              ) : (
                author.name
              )}
            </span>

            <span aria-hidden="true">·</span>

            <time dateTime={article.date}>
              {formatDate(article.date)}
            </time>

            {article.updated &&
              article.updated !== article.date && (
                <>
                  <span aria-hidden="true">·</span>

                  <span>
                    Updated{" "}
                    <time dateTime={article.updated}>
                      {formatDate(article.updated)}
                    </time>
                  </span>
                </>
              )}

            <span aria-hidden="true">·</span>

            <span>{article.readingTime}</span>

          </div>

          <ArticleIntroUtilities slug={article.slug} category={article.category} title={article.title} reads={(readStats?.sampleCount ?? 0) > 1 ? readStats?.sampleCount : undefined} />
        </header>

        {/* =====================================================
            HERO
        ====================================================== */}

        <figure className="group relative left-1/2 mt-8 w-screen -translate-x-1/2 sm:mt-12">
          <div
            className="
              relative
              aspect-[16/9]
              w-full
              overflow-hidden
              bg-white
            "
          >
            <Image
              src={heroImage}
              alt={heroAlt}
              fill
              // The article's largest image (LCP): fetch it first.
              loading="eager"
              fetchPriority="high"
              sizes="(max-width: 768px) 100vw, 1100px"
              className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.008] ${isHaunted ? "brightness-[0.78]" : ""}`}
              style={{ objectPosition: article.homepageImagePosition ?? "center" }}
            />
            {isHaunted && <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1C1920]/35 via-transparent to-transparent" />}
          </div>
          <figcaption className="mx-auto mt-3 max-w-[1100px] px-5 text-center text-[12px] leading-[1.5] text-muted sm:px-7 lg:px-10">
            <span>{heroAlt}</span>
            {article.imageCredit && (
              <span className="ml-2 text-[#9a9da3]">
                · {article.imageCreditUrl ? (
                  <a href={article.imageCreditUrl} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                    {article.imageCredit}
                  </a>
                ) : article.imageCredit}
              </span>
            )}
          </figcaption>
        </figure>

        {/* =====================================================
            READING COLUMN
        ====================================================== */}

        <div className="mx-auto mt-12 max-w-[680px] sm:mt-14">
          <MobileReaderTools slug={article.slug} minutes={readingMinutes} reads={readStats?.sampleCount} />

          {/* Every text size inside this wrapper reads off the single
              `--read-scale` custom property (set by the Aa control), so
              Quick Read, headings, quotes and body copy all resize together. */}
          <div className="article-scale" style={{ ["--read-scale" as string]: 1 }}>
            {article.quickRead && <QuickReadPanel quickRead={article.quickRead} />}
            <div className="mt-5 sm:mt-0">
              <TableOfContents items={toc} numbered />
            </div>

            {article.video?.status !== "failed" && article.video?.status !== "rejected" && article.video?.placement !== "hero" && article.video && (
              <div className={isHaunted ? "haunted-video-moment" : undefined}>
                <EditorialVideo video={article.video} />
              </div>
            )}

            <div id="article-body-start">
              {isLongForm && mobileBody?.remaining ? (
                <MobileReadingTreatment
                  remainingMinutes={remainingMinutes}
                  preview={<div className={`article-reading-content ${articleBodyClasses} ${toc.filter((item) => item.level === 2).length >= 4 ? "mt-8 sm:mt-12" : ""}`}><MDXRemote source={mobileBody.preview} options={{ mdxOptions: { remarkPlugins: [unwrapImageParagraphs] } }} components={bodyComponents} /></div>}
                  remaining={<><AdSlot slot="article-midpoint" className="my-8 sm:my-14" /><div className={`article-reading-content ${articleBodyClasses}`}><MDXRemote source={mobileBody.remaining} options={{ mdxOptions: { remarkPlugins: [unwrapImageParagraphs] } }} components={bodyComponents} /></div></>}
                />
              ) : (
                <>
                    <div className={`article-reading-content ${articleBodyClasses} ${toc.filter((item) => item.level === 2).length >= 4 ? "mt-8 sm:mt-12" : ""}`}>
                    <MDXRemote source={before} options={{ mdxOptions: { remarkPlugins: [unwrapImageParagraphs] } }} components={bodyComponents} />
                  </div>
                  {after.trim().length > 0 && <><AdSlot slot="article-midpoint" className="my-8 sm:my-14" /><div className={`article-reading-content ${articleBodyClasses}`}><MDXRemote source={after} options={{ mdxOptions: { remarkPlugins: [unwrapImageParagraphs] } }} components={bodyComponents} /></div><div className="my-8 sm:my-12">{related[0] && <RelatedArticles articles={[related[0]]} variant="mini" />}</div></>}
                </>
              )}
            </div>
          </div>

          {/* Marks where the main article body ends — the sticky mobile
              toolbar hides once this scrolls into view, so it never lingers
              over reactions/related/newsletter/footer content. */}
          <div id="article-body-end" aria-hidden="true" />

          {article.slug === "gaming-vibing-with-friends" && <>
            <MobileMultiplayerRecommendations games={mobileGames} />
            <MoreMultiplayerStories articles={multiplayerStories} />
          </>}

          {/* =====================================================
              NEWSLETTER
          ====================================================== */}

          <div className="relative left-1/2 mt-14 sm:mt-16 w-screen -translate-x-1/2 rounded-none border-y border-line px-5 py-7 sm:px-8 sm:py-8 lg:px-12" style={{ backgroundColor: "#fafafa" }}>
            <NewsletterSignup variant="article" deskName={newsletterDesk} />
          </div>

          <div className="mt-16 space-y-2">
            <ReadTimeTracker slug={article.slug} />
          </div>

          {/* =====================================================
              REACTIONS
          ====================================================== */}

          <section
            aria-labelledby="article-reactions-heading"
            className="mt-4 border-t border-card-border pt-8"
          >
            <h2
              id="article-reactions-heading"
              className="
                text-[11px]
                font-semibold
                uppercase
                tracking-[0.13em]
                text-muted
              "
            >
              Quick reaction
            </h2>

            <div className="mt-5">
              <QuickReactionBar
                targetId={article.slug}
                initialCounts={quickReactionCounts}
                reactionIcons={article.reactionIcons}
              />
            </div>

            {contextualPoll && (
              <div className="mt-14 border-t border-card-border pt-8 sm:mt-12">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">
                  Reader poll
                </h2>
                <div className="mt-5">
                  <PulsePoll poll={contextualPoll} layout="stacked" />
                </div>
              </div>
            )}
          </section>

          {topicLinks.length > 0 && (
            <nav aria-labelledby="article-topics-heading" className="mt-10 border-t border-card-border pt-7">
              <h2 id="article-topics-heading" className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted">
                Topics
              </h2>
              <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                {topicLinks.map((topic) => (
                  <li key={topic.slug}>
                    <Link href={topicPath(topic)} className="inline-flex min-h-11 items-center text-[14px] font-medium text-electric hover:underline">
                      {topic.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          )}

          {/* =====================================================
              SHARE
          ====================================================== */}

          <section className="mt-10 border-t border-card-border pt-7">
            <ShareButtons
              url={url}
              title={article.title}
              slug={article.slug}
              category={article.category}
            />
          </section>

          {/* =====================================================
              AUTHOR
          ====================================================== */}

          <AuthorInfo author={author} />
          {article.isGenerated && <CommunityReportButton submissionId={article.slug} />}

        </div>

        {/* =====================================================
            RELATED READING
        ====================================================== */}

        <div className="mt-20 sm:mt-24">
          <RelatedArticles articles={related} category={getPublicDeskSlug(article.category)} />
        </div>
      </article>
    </div>
  );
}
