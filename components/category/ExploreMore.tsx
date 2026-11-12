import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/ssr";

export type ExploreMoreItem = { name: string; slug: string };

// Shared "Explore more." destination list used at the bottom of every
// category page. Plain navigation links, not an expandable menu — hence a
// right arrow, never a chevron.
export default function ExploreMore({ items }: { items: ExploreMoreItem[] }) {
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="explore-more-heading" className="mt-12 border-t border-black/[0.09] pt-8 pb-9">
      <p id="explore-more-heading" className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#777a82]">
        Explore more.
      </p>

      <div className="mt-4 flex flex-col divide-y divide-black/[0.07] sm:grid sm:grid-cols-3 sm:gap-x-10 sm:divide-y-0">
        {items.map((item) => (
          <Link
            key={item.slug}
            href={`/${item.slug}`}
            className="group flex min-h-[52px] items-center justify-between gap-5 py-4 transition-colors duration-150 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-electric sm:min-h-11 sm:py-3"
          >
            <span className="font-heading text-[17px] font-medium tracking-[-0.02em] text-[#111111] transition-colors duration-150 group-hover:text-electric group-focus-visible:text-electric sm:text-[20px]">
              {item.name}
            </span>

            <ArrowRight
              aria-hidden="true"
              size={18}
              weight="bold"
              className="shrink-0 text-[#92959c] transition-transform duration-150 group-hover:translate-x-1 group-hover:text-electric group-focus-visible:translate-x-1 group-focus-visible:text-electric"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}
