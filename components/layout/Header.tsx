"use client";

import Link from "next/link";
import Image from "@/components/ui/MediaImage";
import { usePathname } from "next/navigation";
import { MagnifyingGlass, CaretDown } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/layout/Logo";
import MobileMenuButton from "@/components/layout/MobileMenuButton";
import { MEGA_MENUS, type FeaturedPrimary, type MegaMenu } from "@/lib/nav";

type Menu = MegaMenu;

const MENUS: Menu[] = MEGA_MENUS.filter((menu) => ["Culture", "Campus"].includes(menu.label));
const HEADER_ITEMS: Menu[] = MENUS;
const MORE_LINKS = [
  { label: "Money", href: "/money" },
  { label: "Questions", href: "/questions" },
  { label: "Tools", href: "/tools" },
];

function NavLink({ label, href, onClick }: { label: string; href: string; onClick?: () => void }) {
  return (
    <Link key={label} href={href} onClick={onClick} className="group flex w-fit items-center text-[16px] font-medium text-near-black transition-colors hover:text-electric">
      <span className="transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-[2px]">{label}</span>
      <span className="ml-1.5 -translate-x-[3px] opacity-0 transition-all duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0 group-hover:opacity-100">
        →
      </span>
    </Link>
  );
}

function MegaMenu({ menu, open, onNavigate, featured }: { menu: Menu; open: boolean; onNavigate: () => void; featured?: FeaturedPrimary }) {
  const primary = featured ?? menu.featured.primary;
  return (
    <div
      className={`absolute left-0 right-0 top-full z-50 border-b border-[rgba(17,17,17,0.08)] bg-white text-near-black shadow-[0_12px_30px_rgba(0,0,0,0.04)] transition-[opacity,transform] duration-[200ms] ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-white/10 dark:bg-[#111111] dark:text-white ${
        open ? "pointer-events-auto translate-y-0 opacity-100" : "pointer-events-none -translate-y-1 opacity-0"
      }`}
    >
      <div className="mx-auto grid max-w-[1340px] grid-cols-[1fr_1fr_1fr_2fr] gap-10 px-8 py-9 sm:px-10 lg:px-12">
        {menu.columns.map((column, columnIndex) => (
          <div key={`${column.title}-${column.href}-${columnIndex}`}>
            <Link href={column.href} onClick={onNavigate} className="mb-4 block w-fit text-[11px] font-semibold uppercase tracking-[.13em] text-muted transition-colors hover:text-electric">{column.title}</Link>
            <div className="flex flex-col gap-[18px]">
              {column.links.map(({ label, href }) => (
                <NavLink key={label} label={label} href={href} onClick={onNavigate} />
              ))}
              <Link
                href={column.href}
                onClick={onNavigate}
                className="group flex w-fit items-center text-[13px] font-semibold text-muted transition-colors hover:text-electric"
              >
                <span>{column.exploreLabel}</span>
                <span className="ml-1.5 -translate-x-[3px] opacity-0 transition-all duration-150 group-hover:translate-x-0 group-hover:opacity-100">→</span>
              </Link>
            </div>
          </div>
        ))}

        <div className="border-l border-black/[.07] pl-10 dark:border-white/10">
          <p className="mb-4 text-[11px] font-semibold uppercase tracking-[.13em] text-muted">Featured</p>

          <Link href={primary.href} onClick={onNavigate} className="group block">
            <div className="relative mb-3 aspect-[16/9] overflow-hidden rounded-[4px] bg-off-white">
              <Image
                src={primary.image}
                alt=""
                fill
                sizes="480px"
                className="object-cover transition duration-[260ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.012]"
              />
            </div>
            <p className="font-display text-[23px] font-semibold leading-[1.15] group-hover:text-electric">
              {primary.title}
            </p>
            <p className="mt-1.5 text-[12px] text-muted">
              {primary.category.toUpperCase()} · {primary.readingTime.toUpperCase()}
            </p>
          </Link>

          <div className="mt-5 border-t border-[rgba(17,17,17,0.09)] dark:border-white/10">
            {menu.featured.secondary.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className="group flex items-center justify-between gap-4 border-b border-[rgba(17,17,17,0.09)] py-3 text-[15px] font-medium text-near-black transition-colors hover:text-electric dark:border-white/10"
              >
                <span className="flex items-baseline gap-3">
                  <span className="text-[12px] text-muted">{String(index + 1).padStart(2, "0")}</span>
                  {item.label}
                </span>
                <span className="text-muted transition-transform group-hover:translate-x-[3px] group-hover:text-electric">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header({ featuredByMenu = {} }: { featuredByMenu?: Record<string, FeaturedPrimary | undefined> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastScrollY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);

  const show = (label: string) => {
    if (timer.current) clearTimeout(timer.current);
    setOpen(label);
  };

  const hide = () => {
    timer.current = setTimeout(() => setOpen(null), 150);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) {
        setOpen(null);
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      const delta = current - lastScrollY.current;

      if (current <= 12) {
        setHidden(false);
      } else if (delta > 6) {
        setHidden(true);
        setOpen(null);
      } else if (delta < -6) {
        setHidden(false);
      }

      lastScrollY.current = current;
    };

    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = MENUS.find((menu) => menu.label === open);

  return (
    <header
      ref={headerRef}
      onMouseLeave={hide}
      className={`sticky top-0 z-50 w-full border-b border-black/[.06] bg-white/95 backdrop-blur-md transition-transform duration-300 ease-out dark:border-white/[.08] dark:bg-[#101010]/95 ${hidden ? "-translate-y-full" : "translate-y-0"}`}
    >
      <div className="mx-auto grid h-[62px] w-full max-w-[1680px] grid-cols-[1fr_auto] items-center px-[18px] lg:h-[68px] lg:grid-cols-[auto_1fr_auto] lg:px-10 xl:px-14 2xl:px-16">
        <Link href="/" aria-label="TodayAI home" className="min-w-0">
          <Logo className="transition-opacity hover:opacity-75" />
        </Link>

        <nav aria-label="Primary navigation" className="hidden lg:flex lg:items-center lg:justify-center lg:gap-6">
          {HEADER_ITEMS.map((item) => {
            const isMenu = true;
            const isOpen = isMenu && open === item.label;
            const sectionHrefs = isMenu ? [item.href, ...item.columns.map((c) => c.href)] : [item.href];
            const isCurrentSection = item.href === "/" ? pathname === "/" : sectionHrefs.some((href) => pathname?.startsWith(href));

            return (
              <div key={item.label} onMouseEnter={() => isMenu && show(item.label)} onFocus={() => isMenu && show(item.label)}>
                <Link
                  href={item.href}
                  onClick={() => isMenu && setOpen(null)}
                  aria-expanded={isMenu ? isOpen : undefined}
                  aria-controls={isMenu && isOpen ? `desktop-menu-${item.label.toLowerCase()}` : undefined}
                  aria-current={isCurrentSection ? "page" : undefined}
                  className={`flex items-center gap-1 whitespace-nowrap py-5 text-[12px] font-medium transition-colors hover:text-electric xl:text-[13px] dark:text-white/80 ${
                    isOpen || isCurrentSection ? "text-electric" : "text-near-black"
                  }`}
                >
                  {item.label}
                  {isMenu && (
                    <CaretDown
                      size={12}
                      weight="bold"
                      className={`transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  )}
                </Link>
              </div>
            );
          })}
          <div className="relative" onMouseEnter={() => show("More")} onFocus={() => show("More")}>
            <button type="button" aria-expanded={open === "More"} className={`flex items-center gap-1 whitespace-nowrap py-5 text-[12px] font-medium transition-colors hover:text-electric xl:text-[13px] ${open === "More" ? "text-electric" : "text-near-black"}`}>
              More <CaretDown size={12} weight="bold" className={`transition-transform duration-200 ${open === "More" ? "rotate-180" : ""}`} />
            </button>
            {open === "More" && (
              <div className="absolute right-0 top-full z-50 min-w-52 border border-black/[0.09] bg-white p-2 shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
                {MORE_LINKS.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(null)} className="block px-3 py-2.5 text-[14px] text-near-black transition-colors hover:bg-off-white hover:text-electric">{link.label}</Link>)}
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/search"
            aria-label="Search TodayAI"
            className="flex h-11 w-11 items-center justify-center rounded-full text-near-black transition hover:bg-black/[.045] hover:text-electric dark:text-white dark:hover:bg-white/[0.08]"
          >
            <MagnifyingGlass size={20} />
          </Link>
          <MobileMenuButton />
        </div>
      </div>

      {active && (
        <div onMouseEnter={() => show(active.label)} onMouseLeave={hide}>
          <MegaMenu menu={active} open={Boolean(active)} onNavigate={() => setOpen(null)} featured={featuredByMenu[active.label]} />
        </div>
      )}
    </header>
  );
}
