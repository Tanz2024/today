import Image from "@/components/ui/MediaImage";
import Link from "next/link";
import { clampToLaunch, DISPLAY_TIME_ZONE } from "@/lib/launch";

import type React from "react";

import type {
  Article,
  GamingCategory,
} from "@/types/article";

import type { Game } from "@/lib/rawg";
import { formatArticleRecency } from "@/lib/article-recency";

export const GAMING_SECTIONS: Record<
  GamingCategory,
  {
    label: string;
    href: string;
    description: string;
    seoDescription: string;
  }
> = {
  "what-to-play": {
    label: "What to Play",
    href: "/play/what-to-play",
    description:
      "Fresh releases, standout games, and picks actually worth your time.",
    seoDescription:
      "Discover new and highly rated PC, mobile, console, and indie games worth playing.",
  },

  multiplayer: {
    label: "Multiplayer",
    href: "/play/multiplayer",
    description:
      "Co-op, competitive, party games, and everything better with other people.",
    seoDescription:
      "TodayAI multiplayer coverage including co-op games, competitive games, online updates, and games to play with friends.",
  },

  "gaming-culture": {
    label: "Gaming Culture",
    href: "/play/gaming-culture",
    description:
      "The communities, trends, memes, creators, and conversations around games.",
    seoDescription:
      "Gaming culture, communities, internet trends, creators, nostalgia, memes, and the social side of games.",
  },
};

const SECTION_ORDER: GamingCategory[] = [
  "what-to-play",
  "multiplayer",
  "gaming-culture",
];

interface GamingLandingProps {
  articles: Article[];
  games: Game[];
  activeSection?: GamingCategory;
}

export default function GamingLanding({
  articles,
  games,
  activeSection,
}: GamingLandingProps) {
  const activeMeta = activeSection
    ? GAMING_SECTIONS[activeSection]
    : null;

  return (
    <div className="mx-auto w-full max-w-[1320px] px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <header className="max-w-4xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-electric sm:text-xs">
          Gaming
        </p>

        <h1 className="mt-4 max-w-4xl font-heading text-[42px] font-bold leading-[0.98] tracking-[-0.035em] text-near-black sm:text-6xl lg:text-7xl">
          {activeMeta?.label ?? "What are we playing?"}
        </h1>

        <p className="mt-5 max-w-2xl text-base leading-7 text-muted sm:text-lg">
          {activeMeta?.description ??
            "Fresh games worth trying, multiplayer energy, and the internet culture surrounding the games everyone is talking about."}
        </p>
      </header>

      <GamingNavigation activeSection={activeSection} />

      {activeSection ? (
        <SingleSection
          section={activeSection}
          articles={articles}
          games={games}
        />
      ) : (
        <div className="mt-16 space-y-20 sm:mt-20 lg:space-y-24">
          {SECTION_ORDER.map((section) => (
            <LandingSection
              key={section}
              section={section}
              articles={articles}
              games={games}
            />
          ))}
        </div>
      )}

      {games.length > 0 && (
        <p className="mt-20 border-t border-card-border pt-5 text-xs leading-5 text-muted">
          Game metadata and imagery provided by{" "}
          <a
            href="https://rawg.io"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-near-black underline decoration-card-border underline-offset-4 transition hover:text-electric"
          >
            RAWG
          </a>
          .
        </p>
      )}
    </div>
  );
}

function GamingNavigation({
  activeSection,
}: {
  activeSection?: GamingCategory;
}) {
  return (
    <nav
      aria-label="Gaming sections"
      className="mt-10 border-y border-card-border sm:mt-12"
    >
      <div className="flex gap-7 overflow-x-auto py-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-10">
        <Link
          href="/gaming"
          className={`shrink-0 text-sm font-semibold transition ${
            !activeSection
              ? "text-electric"
              : "text-muted hover:text-near-black"
          }`}
        >
          Gaming Home
        </Link>

        {SECTION_ORDER.map((section) => {
          const meta = GAMING_SECTIONS[section];
          const active = activeSection === section;

          return (
            <Link
              key={section}
              href={meta.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 text-sm font-semibold transition ${
                active
                  ? "text-electric"
                  : "text-muted hover:text-near-black"
              }`}
            >
              {meta.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function LandingSection({
  section,
  articles,
  games,
}: {
  section: GamingCategory;
  articles: Article[];
  games: Game[];
}) {
  const meta = GAMING_SECTIONS[section];

  const sectionArticles = articles
    .filter((article) => article.gamingCategory === section)
    .slice(0, 4);

  return (
    <section>
      <SectionHeader
        title={meta.label}
        description={meta.description}
        href={meta.href}
      />

      {section === "what-to-play" ? (
        <>
          <div className="mt-7">
            <FeaturedGames games={games.slice(0, 4)} />
          </div>

          {sectionArticles.length > 0 && (
            <div className="mt-10 border-t border-card-border pt-7">
              <p className="mb-5 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                TodayAI picks
              </p>

              <ArticleGrid articles={sectionArticles} />
            </div>
          )}
        </>
      ) : (
        <div className="mt-7">
          <ArticleGrid articles={sectionArticles} />
        </div>
      )}
    </section>
  );
}

function SingleSection({
  section,
  articles,
  games,
}: {
  section: GamingCategory;
  articles: Article[];
  games: Game[];
}) {
  if (section === "what-to-play") {
    return (
      <section className="mt-12 sm:mt-16">
        {games.length > 0 ? (
          <GameGrid games={games} />
        ) : (
          <EmptyState>
            Game recommendations are temporarily unavailable.
          </EmptyState>
        )}

        {articles.length > 0 && (
          <div className="mt-16 border-t border-card-border pt-8">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
              TodayAI recommendations
            </p>

            <h2 className="mt-2 font-heading text-3xl font-bold text-near-black">
              More to play
            </h2>

            <div className="mt-7">
              <ArticleGrid articles={articles} />
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mt-12 sm:mt-16">
      <ArticleGrid articles={articles} />
    </section>
  );
}

function SectionHeader({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <div className="flex items-end justify-between gap-8 border-t border-card-border pt-6">
      <div className="max-w-2xl">
        <h2 className="font-heading text-3xl font-bold tracking-[-0.02em] text-near-black sm:text-4xl">
          {title}
        </h2>

        <p className="mt-2 max-w-xl text-sm leading-6 text-muted sm:text-base">
          {description}
        </p>
      </div>

      <Link
        href={href}
        className="hidden shrink-0 text-sm font-semibold text-electric transition hover:opacity-70 sm:inline"
      >
        Explore {title} →
      </Link>
    </div>
  );
}

function FeaturedGames({
  games,
}: {
  games: Game[];
}) {
  if (games.length === 0) {
    return (
      <EmptyState>
        Game recommendations are temporarily unavailable.
      </EmptyState>
    );
  }

  const [featured, ...secondary] = games;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.65fr)_minmax(320px,0.85fr)]">
      <FeaturedGameCard game={featured} />

      {secondary.length > 0 && (
        <div className="divide-y divide-card-border border-y border-card-border lg:border-t-0">
          {secondary.slice(0, 3).map((game) => (
            <CompactGameCard
              key={game.id}
              game={game}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedGameCard({
  game,
}: {
  game: Game;
}) {
  return (
    <a href={`/play/what-to-play/${game.slug}`} className="group block focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-electric">
      <div className="relative aspect-[16/9] overflow-hidden bg-black/[0.04]">
        {game.image ? (
          <Image
            src={game.image}
            alt={`${game.name} game artwork`}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 65vw"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.015]"
          />
        ) : (
          <GameImageFallback name={game.name} />
        )}

        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/[.92] via-black/30 to-transparent" />

        <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-4 sm:bottom-6 sm:left-6 sm:right-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/[.92] sm:text-xs">
              {buildGameMeta(game)}
            </p>

            <h3 className="mt-2 max-w-2xl font-heading text-2xl font-bold leading-tight text-white sm:text-4xl">
              {game.name}
            </h3>
          </div>

          <ScoreBadge game={game} dark />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
        {game.released && <span>{formatDate(game.released)}</span>}

        {game.genres.length > 0 && (
          <span>{game.genres.slice(0, 2).join(" · ")}</span>
        )}
      </div>
    </a>
  );
}

function CompactGameCard({
  game,
}: {
  game: Game;
}) {
  return (
    <article className="group grid grid-cols-[112px_minmax(0,1fr)] gap-4 py-5 first:pt-0 lg:first:pt-5">
      <div className="relative aspect-[4/3] overflow-hidden bg-black/[0.04]">
        {game.image ? (
          <Image
            src={game.image}
            alt={`${game.name} game artwork`}
            fill
            sizes="112px"
            className="object-cover transition duration-300 group-hover:scale-[1.025]"
          />
        ) : (
          <GameImageFallback name={game.name} />
        )}
      </div>

      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
          {buildGameMeta(game)}
        </p>

        <h3 className="mt-1 font-heading text-lg font-bold leading-snug text-near-black transition group-hover:text-electric">
          {game.name}
        </h3>

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-muted">
            {game.released ? formatDate(game.released) : "Release TBA"}
          </span>

          <ScoreBadge game={game} />
        </div>
      </div>
    </article>
  );
}

function GameGrid({
  games,
}: {
  games: Game[];
}) {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {games.map((game, index) => (
        <GameCard
          key={game.id}
          game={game}
          priority={index < 3}
        />
      ))}
    </div>
  );
}

function GameCard({
  game,
  priority = false,
}: {
  game: Game;
  priority?: boolean;
}) {
  return (
    <a href={`/play/what-to-play/${game.slug}`} className="group block focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-electric">
      <div className="relative aspect-[16/10] overflow-hidden bg-black/[0.04]">
        {game.image ? (
          <Image
            src={game.image}
            alt={`${game.name} game artwork`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
          />
        ) : (
          <GameImageFallback name={game.name} />
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-[10px] font-bold uppercase tracking-[0.13em] text-muted">
            {buildGameMeta(game)}
          </p>

          <ScoreBadge game={game} />
        </div>

        <h2 className="mt-2 font-heading text-xl font-bold leading-tight text-near-black sm:text-2xl">
          {game.name}
        </h2>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs leading-5 text-muted">
          {game.released && <span>{formatDate(game.released)}</span>}

          {game.genres.length > 0 && (
            <span>{game.genres.slice(0, 2).join(" · ")}</span>
          )}
        </div>

      </div>
    </a>
  );
}

function ArticleGrid({
  articles,
}: {
  articles: Article[];
}) {
  if (articles.length === 0) {
    return (
      <EmptyState>
        TodayAI stories for this section are coming soon.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
      {articles.map((article) => (
        <ArticleCard
          key={article.slug}
          article={article}
        />
      ))}
    </div>
  );
}

function ArticleCard({
  article,
}: {
  article: Article;
}) {
  return (
    <article className="group">
      <Link href={`/gaming/${article.slug}`}>
        <div className="relative aspect-[4/3] overflow-hidden bg-black/[0.04]">
          <Image
            src={article.image}
            alt={article.imageAlt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
          />
        </div>

        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
          {formatGamingCategory(article.gamingCategory)}
        </p>

        <h3 className="mt-2 font-heading text-xl font-bold leading-[1.2] tracking-[-0.015em] text-near-black transition group-hover:text-electric">
          {article.title}
        </h3>

        {article.description && (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted">
            {article.description}
          </p>
        )}

        <p className="mt-3 text-xs text-muted">
          {formatDate(article.date)}
          {article.date ? ` · ${formatArticleRecency(article.date)}` : ""}
        </p>
      </Link>
    </article>
  );
}

function ScoreBadge({
  game,
  dark = false,
}: {
  game: Game;
  dark?: boolean;
}) {
  if (game.metacritic !== null) {
    return (
      <span
        className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] ${
          dark ? "text-white" : "text-near-black"
        }`}
      >
        {game.metacritic} Meta
      </span>
    );
  }

  if (game.rating !== null && game.rating > 0) {
    return (
      <span
        className={`shrink-0 text-[10px] font-bold uppercase tracking-[0.08em] ${
          dark ? "text-white" : "text-near-black"
        }`}
      >
        {game.rating.toFixed(1)} / 5
      </span>
    );
  }

  return null;
}

function GameImageFallback({
  name,
}: {
  name: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
      <span className="font-heading text-lg font-bold text-muted">
        {name}
      </span>
    </div>
  );
}

function EmptyState({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="border-y border-card-border py-10">
      <p className="max-w-xl text-sm leading-6 text-muted">
        {children}
      </p>
    </div>
  );
}

function buildGameMeta(game: Game) {
  if (game.platforms.length === 0) {
    return "Game";
  }

  return game.platforms.slice(0, 3).join(" · ");
}

function formatGamingCategory(
  category?: GamingCategory,
) {
  if (!category) {
    return "Gaming";
  }

  return GAMING_SECTIONS[category].label;
}

function formatDate(value: string) {
  const date = clampToLaunch(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}
