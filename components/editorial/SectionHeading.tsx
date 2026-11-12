import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";

export default function SectionHeading({ id, kicker, title, href, linkLabel, tone = "light" }: { id: string; kicker?: string; title: string; href?: string; linkLabel?: string; tone?: "light" | "dark" }) {
  return (
    <div className={`section-heading ${tone === "dark" ? "section-heading-dark" : ""}`}>
      <div>
        {kicker ? <p className="section-heading-kicker">{kicker}</p> : null}
        <h2 id={id} className="section-heading-title">{title}</h2>
      </div>
      {href ? (
        <Link href={href} className="ui-link-arrow">
          {linkLabel ?? "See all"} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      ) : null}
    </div>
  );
}
