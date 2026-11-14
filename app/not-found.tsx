import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import Container from "@/components/ui/Container";

const SECTIONS = [
  { href: "/news", title: "AI Blog", text: "News, guides and explainers." },
  { href: "/tools", title: "AI Tools", text: "Summarize, improve prompts, explain code." },
  { href: "/play", title: "AI Games", text: "Word Detective and Quick Draw." },
  { href: "/compare", title: "Compare", text: "AI models ranked side by side." },
];

// Also served for retired pages (old lifestyle desks, polls, community).
export default function NotFound() {
  return (
    <Container className="hub">
      <p className="eyebrow">Page not found</p>
      <h1 className="detail-title">This page isn&apos;t here anymore</h1>
      <p className="detail-dek max-w-[60ch]">TodayAI now focuses on AI: news and guides, free AI tools, AI games and software comparisons. The page you were looking for may have been retired.</p>
      <form action="/search" method="get" role="search" className="blog-search mt-6">
        <label htmlFor="nf-search" className="sr-only">Search TodayAI</label>
        <input id="nf-search" name="q" type="search" placeholder="Search TodayAI" />
        <button type="submit" className="ui-button ui-button-primary">Search</button>
      </form>
      <ul className="card-grid card-grid-4 mt-10">
        {SECTIONS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="d-card">
              <span className="d-card-title">{item.title}</span>
              <span className="d-card-text">{item.text}</span>
              <span className="d-card-action">Go <ArrowRight size={14} aria-hidden="true" /></span>
            </Link>
          </li>
        ))}
      </ul>
    </Container>
  );
}
