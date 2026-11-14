import Link from "next/link";
import { ArrowRight, Microphone, Scan, Scissors } from "@phosphor-icons/react/ssr";

import Container from "@/components/ui/Container";
import AdSlot from "@/components/ui/AdSlot";
import NewsletterSignup from "@/components/newsletter/NewsletterSignup";
import HomepageSignals from "@/components/home/HomepageSignals";
import HomepageReturnSignal from "@/components/home/HomepageReturnSignal";
import ModelWatch from "@/components/home/ModelWatch";
import { CompactStory, FeatureHero, StoryCard } from "@/components/editorial/Story";

import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles, type AiArticle } from "@/lib/ai-content";
import { hasIndexableImage } from "@/lib/article-discovery";
import { CATALOG_GAMES, CATALOG_TOOLS } from "@/lib/site-catalog";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
import { toolAvailability } from "@/components/discovery/Cards";
import { getLatestModelsByMaker } from "@/lib/model-data";
import { buildMetadata } from "@/lib/seo";
import MarketStrip from "@/components/markets/MarketStrip";
import TradingViewTickers from "@/components/markets/TradingViewTickers";
import { getMarketSnapshot } from "@/lib/market-data";

export const revalidate = 3600;

const HOME_TITLE = "TodayAI — AI news, tools, games and comparisons";

export const metadata = {
  ...buildMetadata({
    title: HOME_TITLE,
    description: "AI news and guides, AI tools, AI games and factual AI software comparisons — in one place on TodayAI.",
    path: "/",
    // Generated TodayAI card (app/og-default.png/route.tsx).
    image: "/og-default.png",
    imageAlt: "TodayAI — AI news, tools, games and comparisons",
    imageWidth: 1200,
    imageHeight: 630,
  }),
  // Absolute: the root title template would repeat the brand.
  title: { absolute: HOME_TITLE },
};

// One-line "what you do" per game (accurate to the game code).
const GAME_HOW: Record<string, string> = {
  "word-detective": "Guess the hidden word. A language model scores how close each guess is in meaning.",
  "quick-draw": "Sketch the prompt while an image model guesses.",
};

// Homepage tools: three on-device tools that work without any provider.
const HOME_TOOLS = [
  { href: "/tools/ai-speech-to-text", name: "Transcribe a lecture", line: "Turn recordings and voice notes into editable text.", action: "Transcribe", Icon: Microphone },
  { href: "/tools/ai-image-to-text", name: "Extract text from an image", line: "Copy text from screenshots, slides and photos.", action: "Extract text", Icon: Scan },
  { href: "/tools/ai-background-remover", name: "Remove an image background", line: "Create a transparent image for presentations and projects.", action: "Remove background", Icon: Scissors },
];
const FRESH_DAYS = 14;
const TREND_CATEGORIES = new Set(["culture", "entertainment", "gaming"]);

export default async function HomePage() {
  const [articles, market, modelSnapshot] = await Promise.all([getPublicDiscoverableArticles(), getMarketSnapshot(), getLatestModelsByMaker()]);
  const ai = selectAiArticles(articles);
  const aiOn = isAiUtilitiesEnabled();

  // Shared selection: every article appears at most once on the page,
  // keyed by its canonical path.
  const used = new Set<string>();
  const key = (article: (typeof ai)[number]) => `/${article.category}/${article.slug}`;
  const take = (list: typeof ai, count: number) => {
    const picked = list.filter((article) => !used.has(key(article))).slice(0, count);
    picked.forEach((article) => used.add(key(article)));
    return picked;
  };

  // 1 — Featured article: editor's pick, else newest that can carry the hero.
  const now = Date.now();
  const validDate = (article: (typeof ai)[number]) => Number.isFinite(new Date(article.date).getTime()) && new Date(article.date).getTime() <= now;
  const suitable = (article: (typeof ai)[number]) =>
    Boolean(article.slug && article.category && article.title?.trim().length >= 10 && (article.description?.trim().length ?? 0) >= 40 && hasIndexableImage(article.image)) && validDate(article);
  const lead = ai.find((article) => article.homepageHero && suitable(article)) ?? ai.find(suitable) ?? ai.find((article) => (article.description?.trim().length ?? 0) >= 40) ?? ai[0];
  if (lead) used.add(key(lead));

  // 2 — One editorial section: a secondary story with image + up to four
  // text-led headlines, newest first across news, guides and explainers.
  const secondary = take(ai.filter((article) => hasIndexableImage(article.image) && validDate(article)), 1)[0];
  const headlines = take(ai.filter(validDate), 4);
  const reporting = [secondary, ...headlines].filter(Boolean);
  const fresh = reporting.some((article) => now - new Date(article.date).getTime() < FRESH_DAYS * 86_400_000);

  // Culture & trends: newest non-AI pieces from the trend desks, as a compact
  // headline list (no "viral" or "breaking" labels; real dates only).
  const aiPaths = new Set(ai.map(key));
  const trends = articles
    .filter((article) => TREND_CATEGORIES.has(article.category) && !aiPaths.has(`/${article.category}/${article.slug}`))
    .filter((article) => Number.isFinite(new Date(article.date).getTime()) && new Date(article.date).getTime() <= now)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4)
    .map((article) => ({ ...article, aiTopic: "everyday-ai", aiTopicName: "", contentKind: "news" }) as AiArticle);

  // Real availability per tool: on-device tools always work; hosted-AI
  // tools say "Setup required" until the provider is switched on.
  const tools = HOME_TOOLS.flatMap((tool) => {
    const entry = CATALOG_TOOLS.find((item) => item.href === tool.href);
    return entry ? [{ ...tool, ready: toolAvailability(entry, aiOn) === "available" }] : [];
  });
  const [game, ...otherGames] = CATALOG_GAMES.filter((item) => item.featured);
  const newest = ai[0];

  return (
    <Container className="home home-editorial">
      <HomepageSignals />
      {newest ? <HomepageReturnSignal latestPublishedAt={newest.updated || newest.date} /> : null}
      <h1 className="sr-only">TodayAI — AI news, tools, games and comparisons</h1>

      {/* 1 — Featured article */}
      {lead ? (
        <section aria-label="Featured story" data-homepage-impression="trending_impression" data-homepage-module="featured">
          <FeatureHero article={lead} />
        </section>
      ) : (
        <div className="empty-state"><h2>No AI articles yet</h2><p>New AI coverage will appear here as soon as it is published.</p></div>
      )}

      {/* Compact market context between the hero and the editorial feed. */}
      <aside className="home-markets" aria-label="AI market context">
        {market ? <MarketStrip snapshot={market} /> : <TradingViewTickers />}
      </aside>

      {/* 2 — Recent reporting */}
      {reporting.length ? (
        <section className="home-section" aria-labelledby="reporting-heading" data-homepage-impression="fresh_impression" data-homepage-module="fresh">
          <div className="home-section-head">
            <h2 id="reporting-heading" className="home-section-title">{fresh ? "Recent reporting" : "From the Journal"}</h2>
            <Link href="/news" className="home-section-link">All articles <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>
          <div className={`home-news ${secondary && headlines.length ? "" : "home-news-single"}`}>
            {secondary ? <div className="home-news-lead"><StoryCard article={secondary} /></div> : null}
            {headlines.length ? <div className="compact-list home-news-list">{headlines.map((article) => <CompactStory key={article.slug} article={article} />)}</div> : null}
          </div>
        </section>
      ) : null}

      {/* 2b — Culture & trends (non-AI trend desks), compact */}
      {trends.length ? (
        <section className="home-section" aria-labelledby="trends-heading">
          <div className="home-section-head">
            <h2 id="trends-heading" className="home-section-title">Culture &amp; trends</h2>
          </div>
          <div className="compact-list home-trends">{trends.map((article) => <CompactStory key={article.slug} article={article} />)}</div>
        </section>
      ) : null}

      {/* 3 — Useful AI tools */}
      {tools.length ? (
        <section className="home-section home-tools-section" aria-labelledby="tools-heading">
          <div className="home-section-head">
            <div className="home-tools-intro">
              <h2 id="tools-heading" className="home-section-title">What are you working on?</h2>
              <p>Simple tools for studying, creating and everyday tasks.</p>
            </div>
            <Link href="/tools" className="home-section-link">All tools <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>
          <ul className="home-tools">
            {tools.map(({ href, name, line, action, Icon, ready }) => (
              <li key={href}>
                <Link href={href} className={`home-tool ${ready ? "" : "is-setup"}`}>
                  <span className="home-tool-icon" aria-hidden="true"><Icon size={24} weight="bold" /></span>
                  <span className="home-tool-name">{name}</span>
                  <span className="home-tool-line">{line}</span>
                  <span className="home-tool-cta">{ready ? action : "Setup required"} <ArrowRight size={13} aria-hidden="true" /></span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* 4 — Compact model / comparison preview */}
      <ModelWatch snapshot={modelSnapshot} />

      {/* 5 — Featured game */}
      {game ? (
        <section className="home-section" aria-labelledby="games-heading" data-homepage-impression="play_impression" data-homepage-module="play">
          <div className="home-section-head">
            <h2 id="games-heading" className="home-section-title">Play with AI</h2>
            <Link href="/play" className="home-section-link">All games <ArrowRight size={13} aria-hidden="true" /></Link>
          </div>
          <div className="home-game">
            <div className="home-game-main">
              <h3 className="home-game-title"><Link href={game.href}>{game.title}</Link></h3>
              <p className="home-game-line">{GAME_HOW[game.slug] ?? game.description}</p>
              <Link href={game.href} className="ui-button ui-button-primary home-game-cta">Play now</Link>
            </div>
            {otherGames.length ? (
              <ul className="home-game-side">
                {otherGames.map((item) => (
                  <li key={item.slug}><Link href={item.href} className="home-game-alt"><strong>{item.title}</strong><span>{GAME_HOW[item.slug] ?? item.description}</span></Link></li>
                ))}
              </ul>
            ) : null}
          </div>
        </section>
      ) : null}

      <AdSlot slot="homepage-boundary" />

      {/* 6 — Newsletter */}
      <section className="home-newsletter" aria-label="Newsletter">
        <NewsletterSignup variant="homepage" />
      </section>
    </Container>
  );
}
