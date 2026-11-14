import Link from "next/link";
import Container from "@/components/ui/Container";
import JsonLd from "@/components/seo/JsonLd";
import { getPublicDiscoverableArticles } from "@/lib/article-catalog";
import { selectAiArticles } from "@/lib/ai-content";
import { buildMetadata, getSiteUrl } from "@/lib/seo";
import { modelBenchmarks } from "@/lib/model-benchmarks";
import { getMostUsedModels } from "@/lib/model-usage";
import { arenaChartRows, dayLabel, eciChartRows, priceChartRows, skillChartRows, valuePoints } from "@/lib/model-rankings";
import RankedChart from "@/components/compare/RankedChart";
import SkillTabs from "@/components/compare/SkillTabs";
import ValueScatter from "@/components/compare/ValueScatter";
import SourceNote, { ExternalLink } from "@/components/compare/SourceNote";
import { AccessFilterControl, AccessFilterProvider } from "@/components/compare/AccessFilter";
import { GuideCard } from "@/components/editorial/Story";

export const revalidate = 3600;

export const metadata = buildMetadata({
  title: "Compare AI models",
  description: "Ranked charts of AI models — capability, people's votes, coding, maths, science, API price and value — with open-weight and closed models side by side, every number sourced and dated.",
  path: "/compare",
});

/** Cheapest and best-value charts cover models released in this many months before Epoch's data date. */
const PRICE_WINDOW_MONTHS = 12;

const CC_BY = "https://creativecommons.org/licenses/by/4.0/";

export default async function ComparePage() {
  const data = modelBenchmarks;
  const [articles, usage] = await Promise.all([
    getPublicDiscoverableArticles(),
    data ? getMostUsedModels(data.models) : Promise.resolve(null),
  ]);
  const ai = selectAiArticles(articles);
  const comparisons = ai.filter((article) => article.contentKind === "comparison");

  const epoch = data?.sources.epoch;
  const arena = data?.sources.lmarena;
  const prices = data?.sources.openrouter;
  const eciRows = data ? eciChartRows(data.models) : [];
  const arenaRows = data ? arenaChartRows(data.arena, data.models) : [];
  const priceRows = data && epoch ? priceChartRows(data.models, epoch.asOf, PRICE_WINDOW_MONTHS) : [];
  const points = data && epoch ? valuePoints(data.models, epoch.asOf, PRICE_WINDOW_MONTHS) : [];
  const skills = data?.skills ?? [];
  const hasRankings = Boolean(eciRows.length || arenaRows.length || skills.length || priceRows.length);

  const epochCredit = epoch ? (
    <>Source: Epoch AI, ‘Capabilities &amp; benchmarking’. Published online at epoch.ai. Retrieved from ‘<ExternalLink href="https://epoch.ai/benchmarks">https://epoch.ai/benchmarks</ExternalLink>’ [online resource]. Data as of {dayLabel(epoch.asOf)}. Licensed under <ExternalLink href={CC_BY}>CC BY 4.0</ExternalLink>.</>
  ) : null;
  const epochShort = epoch ? <>Source: <ExternalLink href="https://epoch.ai/benchmarks">Epoch AI</ExternalLink>, <ExternalLink href={CC_BY}>CC BY 4.0</ExternalLink> · {dayLabel(epoch.asOf)}</> : null;
  const priceShort = prices ? <>Prices: <ExternalLink href="https://openrouter.ai/models">OpenRouter</ExternalLink> · {dayLabel(prices.asOf)}</> : null;
  const priceCredit = prices ? <>Prices: <ExternalLink href="https://openrouter.ai/models">OpenRouter models API</ExternalLink>, as of {dayLabel(prices.asOf)}.</> : null;

  const sections = [
    { href: "#smartest", label: "Smartest", show: eciRows.length > 0 },
    { href: "#favourite", label: "People’s favourite", show: arenaRows.length > 0 },
    { href: "#skills", label: "By skill", show: skills.length > 0 },
    { href: "#cheapest", label: "Cheapest", show: priceRows.length > 0 },
    { href: "#value", label: "Best value", show: points.length > 1 },
    { href: "#most-used", label: "Most used", show: Boolean(usage) },
  ].filter((section) => section.show);

  return (
    <Container className="hub compare-page">
      <JsonLd data={{ "@context": "https://schema.org", "@type": "CollectionPage", name: "Compare AI models", url: new URL("/compare", getSiteUrl()).toString(), description: "Sourced, ranked comparisons of AI models — capability, votes, skills, API price and value." }} />
      <header className="compare-intro">
        <p className="page-header-eyebrow">Research / Compare</p>
        <h1 className="page-header-title">Compare AI</h1>
        <p className="page-header-description"><span className="compare-intro-full">Which AI model is number one — at reasoning, at winning people’s votes, at coding, maths and science, on price and on value? Open-weight and closed models are ranked together and labelled. Every number comes from a named source with its date; nothing is estimated.</span><span className="compare-intro-short">Which AI model is number one? Open and closed models, ranked from named, dated sources.</span></p>
      </header>
      {sections.length ? <nav aria-label="Compare sections" className="compare-tabs">{sections.map((section) => <a key={section.href} href={section.href}>{section.label}</a>)}</nav> : null}

      {hasRankings ? (
        <AccessFilterProvider>
          {/* The wrapper ends the sticky filter bar where the charts it scopes end. */}
          <div className="rank-scope">
          <AccessFilterControl />

          {eciRows.length && epoch ? (
            <section id="smartest" className="compare-section" aria-labelledby="smartest-heading">
              <div className="compare-section-heading"><div><p className="section-heading-kicker">Overall capability</p><h2 id="smartest-heading">Smartest models</h2></div><span className="compare-section-meta">Epoch Capabilities Index · higher is better · line shows uncertainty</span></div>
              <p className="rank-intro">Epoch AI combines many benchmark results into one capability score per model. The dot is the score; the line is Epoch’s 90% confidence interval — where lines overlap, the order between those models is not certain.</p>
              <RankedChart label="Models ranked by Epoch Capabilities Index" rows={eciRows} format="index" mode="interval" intervalLabel="90% confidence interval" />
              <SourceNote short={epochShort}>{epochCredit}</SourceNote>
            </section>
          ) : null}

          {arenaRows.length && arena ? (
            <section id="favourite" className="compare-section" aria-labelledby="favourite-heading">
              <div className="compare-section-heading"><div><p className="section-heading-kicker">Head-to-head votes</p><h2 id="favourite-heading">People’s favourite</h2></div><span className="compare-section-meta">LMArena text arena score · higher is better · line shows uncertainty</span></div>
              <p className="rank-intro">People ask two anonymous models the same question and vote for the better answer; LMArena turns millions of votes into a rating (text arena, overall category, adjusted for answer length and style). Each model appears once, at its highest-rated variant. Open or closed follows the licence LMArena lists.</p>
              <RankedChart label="Models ranked by LMArena text arena score" rows={arenaRows} format="arena" mode="interval" intervalLabel="confidence interval" />
              <SourceNote short={<>Source: <ExternalLink href={arena.url}>LMArena</ExternalLink>, <ExternalLink href={CC_BY}>CC BY 4.0</ExternalLink> · {dayLabel(arena.asOf)}</>}>Source: <ExternalLink href={arena.url}>LMArena leaderboard dataset</ExternalLink>, <ExternalLink href={CC_BY}>CC BY 4.0</ExternalLink>. Leaderboard published {dayLabel(arena.asOf)}.</SourceNote>
            </section>
          ) : null}

          {skills.length && epoch ? (
            <section id="skills" className="compare-section" aria-labelledby="skills-heading">
              <div className="compare-section-heading"><div><p className="section-heading-kicker">Benchmarks run by Epoch AI</p><h2 id="skills-heading">Best by skill</h2></div><span className="compare-section-meta">Share of problems solved · higher is better</span></div>
              <p className="rank-intro">Each model’s best run across the settings Epoch tested (for example, reasoning effort). Runs that fell back to another model are excluded. Only benchmarks Epoch runs itself are used.</p>
              <SkillTabs tabs={skills.map((skill) => ({
                key: skill.key,
                label: skill.label,
                panel: (
                  <>
                    <p className="skill-benchmark"><ExternalLink href={skill.benchmarkUrl}>{skill.benchmark}</ExternalLink> · top 5 of {skill.entries.length} models</p>
                    <RankedChart label={`Models ranked by ${skill.benchmark}`} rows={skillChartRows(skill.entries)} format="percent" mode="bar" fixedMax={1} />
                  </>
                ),
              }))} />
              <SourceNote short={epochShort}>{epochCredit}</SourceNote>
            </section>
          ) : null}

          {priceRows.length && epoch && prices ? (
            <section id="cheapest" className="compare-section" aria-labelledby="cheapest-heading">
              <div className="compare-section-heading"><div><p className="section-heading-kicker">API economics</p><h2 id="cheapest-heading">Cheapest to run</h2></div><span className="compare-section-meta">USD per 1M tokens · lower is cheaper</span></div>
              <p className="rank-intro">Models in Epoch’s index released in the {PRICE_WINDOW_MONTHS} months to {dayLabel(epoch.asOf)}, ranked by blended API price: (3 × input price + 1 × output price) ÷ 4, a typical chat mix of three input tokens per output token. Input and output prices are shown on each row. API prices are not consumer subscription prices.</p>
              <RankedChart label="Models ranked by blended API price, cheapest first" rows={priceRows} format="usd" mode="bar" />
              <SourceNote short={priceShort}>{priceCredit} Models matched to Epoch’s index by name and API id; models without a confident match are left out.</SourceNote>
            </section>
          ) : null}

          {points.length > 1 && epoch && prices ? (
            <section id="value" className="compare-section" aria-labelledby="value-heading">
              <div className="compare-section-heading"><div><p className="section-heading-kicker">Capability per dollar</p><h2 id="value-heading">Best value</h2></div><span className="compare-section-meta">Index score against blended price</span></div>
              <p className="rank-intro">Up and to the left is better: more capable for less. Same models and price rule as above.</p>
              <ValueScatter points={points} />
              <SourceNote short={<>{epochShort}. {priceShort}</>}>{epochCredit} {priceCredit}</SourceNote>
            </section>
          ) : null}

          {usage ? (
            <section id="most-used" className="compare-section" aria-labelledby="most-used-heading">
              <div className="compare-section-heading"><div><p className="section-heading-kicker">Usage through OpenRouter</p><h2 id="most-used-heading">Most used</h2></div><span className="compare-section-meta">Tokens processed, {dayLabel(usage.startDate)} – {dayLabel(usage.endDate)}</span></div>
              <p className="rank-intro">Tokens processed through OpenRouter over seven days — the sum of OpenRouter’s daily top-50 figures, so days a model spent outside the daily top 50 are not counted. This is OpenRouter traffic, not global market share, and each provider counts tokens with its own tokenizer.</p>
              <RankedChart label="Models ranked by tokens processed on OpenRouter" rows={usage.rows} format="tokens" mode="bar" />
              <SourceNote>Source: OpenRouter (<ExternalLink href="https://openrouter.ai/rankings">openrouter.ai/rankings</ExternalLink>), as of {dayLabel(usage.asOf.slice(0, 10))}. Licensed under <ExternalLink href={CC_BY}>CC BY 4.0</ExternalLink>.</SourceNote>
            </section>
          ) : null}
          </div>
        </AccessFilterProvider>
      ) : (
        <p className="compare-empty">Model rankings are unavailable right now. See <a href="https://epoch.ai/benchmarks" target="_blank" rel="noopener noreferrer">Epoch AI’s benchmarking hub</a>.</p>
      )}

      {comparisons.length ? <section className="compare-section" aria-labelledby="published-heading"><div className="compare-section-heading"><div><p className="section-heading-kicker">TodayAI editorial</p><h2 id="published-heading">Published comparisons</h2></div></div><div className="home-guides-grid">{comparisons.map((article) => <GuideCard key={article.slug} article={article} />)}</div></section> : null}
      <footer className="compare-methodology">
        <strong>Methodology and sources</strong>
        <p>Rankings come from a snapshot of openly licensed data, refreshed by hand and dated per source; a chart is hidden when its source is unavailable, and a model without a confident match in a source shows no value there rather than an estimate. Epoch AI’s model list is the reference: LMArena entries and OpenRouter prices are matched to it by normalised name, by the API ids Epoch lists for each model, and through a small reviewed alias list. “Open weights” and “Closed” follow each source’s own labels (Epoch’s accessibility field, LMArena’s licence column); “Other” means the source does not say. Benchmark scores measure specific tasks under specific settings; API price is not a subscription price; usage through OpenRouter is not global market share. See the <Link href="/editorial-policy">editorial policy</Link>.</p>
        <ul className="rank-credits">
          {epoch ? <li>Epoch AI, ‘Capabilities &amp; benchmarking’. Published online at epoch.ai. Retrieved from ‘<a href="https://epoch.ai/benchmarks" target="_blank" rel="noopener noreferrer">https://epoch.ai/benchmarks</a>’ [online resource]. Capabilities Index and Epoch-run benchmarks (SWE-bench Verified, FrontierMath, GPQA Diamond), as of {dayLabel(epoch.asOf)}. <a href={CC_BY} target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.</li> : null}
          {arena ? <li>Source: <a href={arena.url} target="_blank" rel="noopener noreferrer">LMArena leaderboard dataset</a>, CC BY 4.0. Text arena with style control, overall category, published {dayLabel(arena.asOf)}.</li> : null}
          {prices ? <li>API prices: <a href="https://openrouter.ai/models" target="_blank" rel="noopener noreferrer">OpenRouter models API</a>, as of {dayLabel(prices.asOf)}.</li> : null}
          {usage ? <li>Source: OpenRouter (<a href="https://openrouter.ai/rankings" target="_blank" rel="noopener noreferrer">openrouter.ai/rankings</a>), as of {dayLabel(usage.asOf.slice(0, 10))}. Licensed under CC BY 4.0.</li> : null}
        </ul>
      </footer>
    </Container>
  );
}
