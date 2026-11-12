import Link from "next/link";
import { Fragment } from "react";
import { CaretRight } from "@phosphor-icons/react/ssr";
import type { BreadcrumbItem } from "@/lib/breadcrumbs";

// Renders the trail from getArticleBreadcrumbs(), the same data that feeds the
// BreadcrumbList schema. The last item is the current page.
export default function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="
        flex min-w-0 items-center
        gap-2
        text-[12px]
        leading-none
        text-muted
      "
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <Fragment key={item.path}>
            {index > 0 && (
              <CaretRight
                size={11}
                weight="regular"
                aria-hidden="true"
                className="shrink-0"
              />
            )}
            {isLast ? (
              <span
                aria-current="page"
                className="min-w-0 truncate text-near-black"
              >
                {item.name}
              </span>
            ) : (
              <Link
                href={item.path}
                className="
                  inline-flex min-h-11 shrink-0 items-center
                  transition-colors duration-150
                  hover:text-near-black
                "
              >
                {item.name}
              </Link>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
}
