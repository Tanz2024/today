import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import { MDXRemote } from "next-mdx-remote/rsc";

import Breadcrumbs from "@/components/article/Breadcrumbs";
import TableOfContents from "@/components/article/TableOfContents";
import ShareButtons from "@/components/article/ShareButtons";
import AuthorInfo from "@/components/article/AuthorInfo";
import QuickReadPanel from "@/components/article/QuickReadPanel";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import ReadTimeTracker from "@/components/article/ReadTimeTracker";
import RecentReadTracker from "@/components/article/RecentReadTracker";
import ArticleEntryAttribution from "@/components/article/ArticleEntryAttribution";
import MobileReaderTools from "@/components/article/MobileReaderTools";
import ArticleIntroUtilities from "@/components/article/ArticleIntroUtilities";
import RelatedArticles from "@/components/article/RelatedArticles";
import RelatedUtilities from "@/components/article/RelatedUtilities";
import ArticleSources from "@/components/article/ArticleSources";
import AdSlot from "@/components/ui/AdSlot";
import { mdxComponents } from "@/components/article/MdxComponents";
import ReadNext from "@/components/article/ReadNext";
import { bodyLayout, insertReadNext, readNextBoundary, splitBodyForAd, splitBodyForMobile } from "@/lib/article-body";
import { articleTopicLinks, topicPath } from "@/lib/topics";
import { getTopicIndex } from "@/lib/topic-catalog";
import { unwrapImageParagraphs } from "@/lib/mdx-blocks";

import { extractToc } from "@/lib/toc";
import { formatDate } from "@/lib/utils";
import { getDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { classifyAiTopic, getAiTopic } from "@/lib/ai-taxonomy";
import { hasIndexableImage, rankRelatedArticles, scoreRelatedArticles } from "@/lib/article-discovery";
import { getCachedHomepageEngagement } from "@/lib/homepage-engagement";
import { getHomepageTrendingArticles } from "@/lib/story-discovery";
import { getReadStats } from "@/lib/read-stats";
import { getSiteUrl } from "@/lib/seo";
import { displayArticleDescription } from "@/lib/article-display";
import { articleJsonLd, resolveArticleAuthor } from "@/lib/structured-data";
import JsonLd from "@/components/seo/JsonLd";
import { getCategoryMeta } from "@/lib/categories";
import { breadcrumbListJsonLd, getArticleBreadcrumbs } from "@/lib/breadcrumbs";
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
  const heroImage = article.image;
  const heroAlt = article.imageAlt;
  const toc = extractToc(article.content);
  // Related reading, read-next and trending only draw on AI coverage.
  const allArticles = selectAiArticles(await getDiscoverableArticles());
  const related = rankRelatedArticles(article, allArticles, 3);
  const isProductionBuild = process.env.NEXT_PHASE === "phase-production-build";
  const trendingEngagement = isProductionBuild ? null : await getCachedHomepageEngagement(allArticles.map((item) => item.slug));
  const trendingArticles = trendingEngagement?.status === "available" ? getHomepageTrendingArticles(allArticles, new Map(allArticles.map((item) => [item.slug, trendingEngagement.data.get(item.slug)?.reactions ?? 0]))) : [];
  const isTrendingNow = trendingArticles.some((item) => item.slug === article.slug);
  const readStats = isProductionBuild ? null : await getReadStats(article.slug);

  const siteUrl = getSiteUrl();
  const url = `${siteUrl}/${article.category}/${article.slug}`;

  const category = getCategoryMeta(article.category);
  const aiTopic = getAiTopic(classifyAiTopic(article) ?? "");
  // Public desk name for the newsletter line (hidden desks resolve via Phase 2).
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
  const jsonLd = articleJsonLd({ ...article, description: displayArticleDescription(article) }, { siteUrl, url, section: aiTopic?.name ?? category?.name ?? article.category, image: absoluteHeroImage });

  const breadcrumbs = getArticleBreadcrumbs(article.category, article.slug, article.title, aiTopic);
  const breadcrumbLd = breadcrumbListJsonLd(breadcrumbs, siteUrl);

  return (
    <div className={`mx-auto w-full max-w-[1180px] px-5 pb-28 pt-8 sm:px-7 sm:pb-24 sm:pt-12 lg:px-10 bg-background`}>
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


          <h1
            className="
              mt-6 max-w-[860px]
              font-display
              text-[32px] font-bold
              leading-[1.08]
              tracking-[-0.035em]
              text-near-black
              [text-wrap:balance]
              sm:text-[46px]
              sm:leading-[1.03]
              sm:tracking-[-0.045em]
              lg:text-[56px]
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
              className={`object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.008]`}
              style={{ objectPosition: article.homepageImagePosition ?? "center" }}
            />
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
              <div>
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

          {/* =====================================================
              NEWSLETTER
          ====================================================== */}

          <div className="relative left-1/2 mt-14 sm:mt-16 w-screen -translate-x-1/2 rounded-none border-y border-line px-5 py-7 sm:px-8 sm:py-8 lg:px-12" style={{ backgroundColor: "#fafafa" }}>
            <NewsletterSignup variant="article" deskName="AI" />
          </div>

          <div className="mt-16 space-y-2">
            <ReadTimeTracker slug={article.slug} />
          </div>

          <ArticleSources content={article.content} />

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

          <RelatedUtilities title={article.title} description={article.description} tags={article.tags} />

          <AuthorInfo author={author} />

        </div>

        {/* =====================================================
            RELATED READING
        ====================================================== */}

        <div className="mt-20 sm:mt-24">
          <RelatedArticles articles={related} />
        </div>
      </article>
    </div>
  );
}
