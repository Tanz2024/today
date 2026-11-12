import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";
import Container from "@/components/ui/Container";
import PageHeader from "@/components/ui/PageHeader";
import { buildMetadata } from "@/lib/seo";
import ToolsHubAnalytics from "@/components/tools/ToolsHubAnalytics";
import { PRACTICAL_TOOL_GROUPS } from "@/lib/practical-tools";

export const metadata = buildMetadata({
  title: "Practical tools",
  description: "Free TodayAI calculators and utilities for budgets, grades, attendance, trips, dates and focus. No account needed, and your numbers stay on your device.",
  path: "/tools",
});

export default function ToolsPage() {
  return (
    <>
      <ToolsHubAnalytics />
      <Container className="py-10 sm:py-14">
        <PageHeader
          eyebrow="Explore / Practical tools"
          title="Practical tools"
          description="Small calculators and utilities built by TodayAI for everyday decisions. No account required, and everything runs on your device. Looking for AI software instead? Browse the AI Tools directory."
        >
          <Link href="/ai-tools" className="ui-link-arrow">Browse AI tools <ArrowRight size={14} aria-hidden="true" /></Link>
        </PageHeader>
        <div className="mt-10 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {PRACTICAL_TOOL_GROUPS.map((group) => (
            <section key={group.name} aria-labelledby={`tools-${group.name}`}>
              <h2 id={`tools-${group.name}`} className="section-rule-heading">{group.name}</h2>
              <ul>
                {group.items.map((tool) => (
                  <li key={tool.href}>
                    <Link href={tool.href} className="group flex items-start justify-between gap-4 border-b border-card-border py-5">
                      <span>
                        <strong className="block text-lg font-semibold tracking-tight group-hover:text-electric">{tool.title}</strong>
                        <span className="mt-1 block text-sm leading-6 text-muted">{tool.description}</span>
                      </span>
                      <ArrowRight size={16} aria-hidden="true" className="mt-1.5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-electric" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </Container>
    </>
  );
}
