import Link from "next/link";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { PLAY_ACTIVITIES } from "@/lib/play-nav";
import { PRACTICAL_TOOLS } from "@/lib/practical-tools";
import { TOPIC_LINKS } from "@/lib/nav";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Explore TodayAI",
  description: "Games, trivia, questions and polls, community stories, the Daily Drop, Pulse, practical calculators and your saved stories.",
  path: "/explore",
});

const GAMES = [
  { label: "Obby", href: "/play/obby", description: "A browser platformer set in a nostalgic school world." },
  { label: "Rush", href: "/play/rush", description: "An endless runner: switch lanes and jump obstacles." },
  { label: "Breaker", href: "/play/breaker", description: "Clear colourful boards and build combos." },
  { label: "Trivia", href: "/play/trivia", description: "Low-stakes trivia and personality questions." },
  { label: "Quick Draw", href: "/play/quick-draw", description: "Draw a prompt before the timer runs out." },
  ...PLAY_ACTIVITIES,
];

const FEATURES = [
  { label: "Questions & Polls", href: "/questions", description: "Straight answers to real questions, and polls you can vote in." },
  { label: "Community", href: "/community", description: "Stories and perspectives written by readers." },
  { label: "Daily Drop", href: "/daily-drop", description: "One story, one song and one find each day." },
  { label: "Pulse", href: "/pulse", description: "What readers are reacting to right now." },
  { label: "Trending", href: "/trending", description: "The stories getting the most attention." },
  { label: "Saved stories", href: "/saved", description: "Stories you bookmarked, kept on this device." },
];

const MORE = [
  { label: "Gaming hub", href: "/gaming", description: "What to play, multiplayer picks and gaming culture." },
  { label: "Music", href: "/music", description: "Songs on repeat." },
  { label: "Metro Picks", href: "/metro", description: "City recommendations." },
];

function LinkList({ items }: { items: { label: string; href: string; description: string }[] }) {
  return (
    <ul className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} className="group block border-b border-card-border py-4">
            <strong className="block text-base font-bold tracking-tight group-hover:text-electric">{item.label} <span aria-hidden="true">→</span></strong>
            <span className="mt-1 block text-sm leading-6 text-muted">{item.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function ExplorePage() {
  return (
    <Container className="hub">
      <PageHeader eyebrow="Explore" title="Explore TodayAI" description="Everything beyond the news: games and interactive features, questions and polls, community stories and handy tools." />
      <section className="hub-section" aria-labelledby="games-heading">
        <h2 id="games-heading" className="section-rule-heading">Games &amp; Interactive</h2>
        <LinkList items={GAMES} />
        <Link href="/play" className="ui-link-arrow mt-3">All games →</Link>
      </section>
      <section className="hub-section" aria-labelledby="features-heading">
        <h2 id="features-heading" className="section-rule-heading">Community &amp; daily features</h2>
        <LinkList items={FEATURES} />
      </section>
      <section className="hub-section" aria-labelledby="practical-heading">
        <h2 id="practical-heading" className="section-rule-heading">Practical tools</h2>
        <LinkList items={PRACTICAL_TOOLS.map((tool) => ({ label: tool.title, href: tool.href, description: tool.description }))} />
      </section>
      <section className="hub-section" aria-labelledby="more-heading">
        <h2 id="more-heading" className="section-rule-heading">More from TodayAI</h2>
        <LinkList items={MORE} />
        <p className="mt-6 flex flex-wrap items-center gap-2 text-sm text-muted">Archive desks: {TOPIC_LINKS.map((link) => <Link key={link.href} href={link.href} className="topic-chip">{link.label}</Link>)}</p>
      </section>
    </Container>
  );
}
