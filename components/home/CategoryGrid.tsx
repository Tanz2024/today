import Link from "next/link";
import { ChatCircleText, GameController, GraduationCap, Headphones, Heart, MapPin, Palette } from "@phosphor-icons/react/ssr";
import { MEGA_MENUS, NAV_DESCRIPTIONS } from "@/lib/nav";

type TopicCard = { number: string; title: string; description: string; href: string; background: string; accent: string; Icon: typeof Heart };

const ICONS_AND_COLORS: Record<string, { background: string; accent: string; Icon: typeof Heart }> = {
  "/relationships": { background: "#FFE8DE", accent: "#7A2E1B", Icon: Heart },
  "/culture": { background: "#EEE7FF", accent: "#5D3FD3", Icon: Headphones },
  "/campus": { background: "#E4F8EE", accent: "#16704C", Icon: GraduationCap },
  "/travel": { background: "#E5F2FF", accent: "#1F5F99", Icon: MapPin },
  "/style": { background: "#F6E8FF", accent: "#8B3FB5", Icon: Palette },
  "/questions": { background: "#FFF3C8", accent: "#7A5500", Icon: ChatCircleText },
  "/play": { background: "#FFE4F0", accent: "#9E285A", Icon: GameController },
};

const TOPICS: TopicCard[] = [
  ...MEGA_MENUS.map((menu) => ({ label: menu.label, href: menu.href })),
  { label: "Questions", href: "/questions" },
  { label: "Play", href: "/play" },
]
  .filter((item) => ICONS_AND_COLORS[item.href])
  .map((item, index) => ({
    number: String(index + 1).padStart(2, "0"),
    title: item.label,
    description: NAV_DESCRIPTIONS[item.href] ?? "",
    href: item.href,
    ...ICONS_AND_COLORS[item.href],
  }));

export default function CategoryGrid() {
  return (
    <section aria-labelledby="explore-topics-heading" className="py-4 sm:py-8">
      <div className="max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-electric">Explore topics</p>
        <h2 id="explore-topics-heading" className="mt-3 font-heading text-3xl font-bold tracking-[-0.04em] text-[#111111] sm:text-5xl">Find your next read</h2>
        <p className="mt-3 text-base leading-7 text-[#4B5563] sm:text-lg">Stories, advice and ideas for wherever life takes you.</p>
      </div>
      {/* Mobile keeps the same editorial signals as desktop, in a tighter grid. */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:hidden">
        {TOPICS.map(({ number, title, href, background, accent, Icon }) => (
          <Link
            key={title}
            href={href}
            className="group flex min-h-[154px] flex-col justify-between gap-4 rounded-2xl border border-black/10 px-4 py-4 text-[#111111] transition duration-200 hover:-translate-y-0.5 hover:border-black/20 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-electric motion-reduce:transform-none"
            style={{ backgroundColor: background }}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="font-script text-[10px] font-bold tracking-[0.12em]" style={{ color: accent }}>{number}</span>
              <Icon aria-hidden="true" size={18} weight="bold" style={{ color: accent }} />
            </div>
            <span className="text-[18px] font-semibold leading-[1.08] tracking-[-0.025em]">{title}</span>
            <span className="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: accent }}>Explore <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">→</span></span>
          </Link>
        ))}
      </div>

      {/* Tablet/desktop: full editorial cards with numbering + description. */}
      <div className="hidden md:grid md:grid-cols-2 md:gap-4 lg:grid-cols-3 lg:gap-5 mt-8">
        {TOPICS.map(({ number, title, description, href, background, accent, Icon }) => (
          <Link key={title} href={href} className="group flex min-h-[220px] flex-col justify-between rounded-[20px] border border-black/10 p-7 text-[#111111] shadow-none transition duration-200 ease-out hover:-translate-y-1 hover:border-black/20 hover:shadow-[0_10px_24px_rgba(17,17,17,0.08)] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-electric motion-reduce:transform-none motion-reduce:transition-none sm:p-8" style={{ backgroundColor: background }}>
            <div className="flex items-start justify-between gap-4">
              <span className="font-script text-xs font-bold tracking-[0.12em]" style={{ color: accent }}>{number}</span>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/75" style={{ color: accent }}><Icon aria-hidden="true" size={23} weight="bold" /></span>
            </div>
            <div className="mt-8"><h3 className="font-heading text-2xl font-bold tracking-[-0.03em]">{title}</h3><p className="mt-2 max-w-[28ch] text-sm leading-6 text-[#4B5563]">{description}</p></div>
            <span className="mt-7 inline-flex min-h-11 items-center gap-2 text-sm font-bold" style={{ color: accent }}>Explore <span aria-hidden="true" className="transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none">→</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}
