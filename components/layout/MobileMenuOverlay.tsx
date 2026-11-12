"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, MagnifyingGlass, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import Logo from "@/components/layout/Logo";
import { FOR_YOU, MEGA_MENUS, SECONDARY_LINKS, ABOUT } from "@/lib/nav";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

type SubView = "culture" | "life" | "campus" | "travel" | "style";
type View = "root" | SubView;

// ─────────────────────────────────────────────
// Navigation data — derived from lib/nav so labels/hrefs match the
// desktop mega menus and footer exactly.
// ─────────────────────────────────────────────

const SUB_VIEW_KEYS: SubView[] = ["culture", "life", "campus", "travel", "style"];

const PRIMARY_NAV: { label: string; view?: View; href?: string }[] = [
  ...MEGA_MENUS.map((menu, index) => ({ label: menu.label, view: SUB_VIEW_KEYS[index] })),
];

const MORE_LINKS = [
  { label: "Money", href: "/money" },
  { label: "Sex & Health", href: "/sex-health" },
];

function toTitleCase(label: string) {
  return label
    .split(" ")
    .map((word) => (word === "AI" ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join(" ");
}

const SUBMENUS: Record<SubView, { title: string; sections: { title: string; href: string; links: { label: string; href: string }[] }[] }> =
  Object.fromEntries(
    MEGA_MENUS.map((menu, index) => [
      SUB_VIEW_KEYS[index],
      {
        title: menu.label,
        sections: menu.columns.map((column) => ({
          title: toTitleCase(column.title),
          href: column.href,
          links: column.links,
        })),
      },
    ]),
  ) as Record<SubView, { title: string; sections: { title: string; href: string; links: { label: string; href: string }[] }[] }>;

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function isSubView(v: View): v is SubView {
  return v !== "root";
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export default function MobileMenuOverlay({ onClose }: { onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const [view, setView] = useState<View>("root");
  const [moreOpen, setMoreOpen] = useState(false);
  // direction: "forward" | "back" — drives the transition direction
  const [transitioning, setTransitioning] = useState(false);
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Mount / Esc / body scroll ──────────────
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      setVisible(true);
      closeButtonRef.current?.focus();
    });

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  // ── Navigation ─────────────────────────────
  const navigateTo = (next: View, dir: "forward" | "back" = "forward") => {
    setDirection(dir);
    setTransitioning(true);
    window.setTimeout(() => {
      setView(next);
      requestAnimationFrame(() => setTransitioning(false));
    }, 160);
  };

  const goBack = () => navigateTo("root", "back");

  // ── Transition classes ─────────────────────
  // When transitioning OUT: slide in the opposite direction it will arrive from
  const outClass = transitioning
    ? direction === "forward"
      ? "-translate-x-2 opacity-0"
      : "translate-x-2 opacity-0"
    : "translate-x-0 opacity-100";

  const submenu = isSubView(view) ? SUBMENUS[view] : null;

  // ─────────────────────────────────────────────────────────
  return createPortal(
    <div
      ref={panelRef}
      id="mobile-menu-panel"
      role="dialog"
      aria-modal="true"
      aria-label="Navigation"
      className={`fixed left-0 top-0 z-[9999] flex h-[100dvh] w-[100vw] max-w-none flex-col overflow-hidden bg-[#F8F8F6] text-[#111111] isolation-isolate transition-[opacity,transform] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-[#111111] dark:text-[#F0F0EE] ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0"
      }`}
    >
      {/* ── Header ──────────────────────────────────── */}
      <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-black/[0.07] px-5 sm:px-6 dark:border-white/[0.09]">
        <div className="flex items-center gap-3">
          <Logo className="origin-left scale-[0.96]" />
          <span className="hidden border-l border-black/[0.12] pl-3 text-[9px] font-semibold uppercase tracking-[0.18em] text-muted sm:block dark:border-white/[0.14]">Editorial menu</span>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-11 w-11 items-center justify-center text-[#111111] transition-opacity hover:opacity-50 dark:text-[#F0F0EE]"
        >
          <X size={22} />
        </button>
      </header>

      {/* ── Content area (animated on view change) ── */}
      <div
        className={`flex flex-1 flex-col overflow-y-auto overscroll-contain transition-[opacity,transform] duration-[170ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${outClass}`}
      >
        {/* ══ ROOT VIEW ══════════════════════════════ */}
        {view === "root" && (
          <div className="flex flex-1 flex-col px-5 sm:px-6">
            {/* Section label */}
            <p className="mt-7 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">
              Explore
            </p>

            {/* Primary navigation */}
            <nav aria-label="Primary navigation" className="mt-4 border-t border-black/[0.09] dark:border-white/[0.08]">
              <Link
                href={FOR_YOU.href}
                onClick={onClose}
                className="group flex min-h-[72px] items-center justify-between border-b border-black/[0.09] transition-colors hover:text-electric dark:border-white/[0.08]"
              >
                <span className="max-w-[82%] font-display text-[clamp(25px,8vw,35px)] leading-[1.08] tracking-[-0.03em]">Editor&apos;s Picks</span>
                <ArrowRight size={15} className="text-[#999999]/60 transition-opacity group-hover:opacity-100 dark:text-[#777777]" />
              </Link>
              {PRIMARY_NAV.map(({ label, view: target, href }) =>
                href ? (
                  <Link
                    key={label}
                    href={href}
                    onClick={onClose}
                    className="group flex min-h-[72px] items-center justify-between border-b border-black/[0.09] transition-colors hover:text-electric dark:border-white/[0.08]"
                  >
                    <span className="max-w-[82%] font-display text-[clamp(25px,8vw,35px)] leading-[1.08] tracking-[-0.03em]">
                      {label}
                    </span>
                    <ArrowRight size={15} className="text-[#999999]/60 transition-opacity group-hover:opacity-100 dark:text-[#777777]" />
                  </Link>
                ) : (
                  <button
                    key={label}
                    type="button"
                    onClick={() => navigateTo(target!, "forward")}
                    className="group flex min-h-[72px] w-full items-center justify-between border-b border-black/[0.09] text-left transition-colors hover:text-electric dark:border-white/[0.08]"
                  >
                    <span className="max-w-[82%] font-display text-[clamp(25px,8vw,35px)] leading-[1.08] tracking-[-0.03em]">
                      {label}
                    </span>
                    <ArrowRight size={15} className="text-[#999999]/60 transition-opacity group-hover:opacity-100 dark:text-[#777777]" />
                  </button>
                )
              )}
            </nav>

            {/* Secondary links */}
            <nav
              aria-label="Secondary navigation"
              className="mt-10 flex flex-col gap-0 border-t border-black/[0.09] dark:border-white/[0.08]"
            >
              <Link
                href="/search"
                onClick={onClose}
                className="group flex min-h-11 items-center justify-between border-b border-black/[0.09] text-[15px] text-[#444444] transition-colors hover:text-[#111111] dark:border-white/[0.08] dark:text-[#888888] dark:hover:text-[#F0F0EE]"
              >
                <span>Search</span>
                <MagnifyingGlass size={16} className="text-[#BBBBBB] dark:text-[#555555]" />
              </Link>

              {SECONDARY_LINKS.filter(({ label }) => label === "Questions").map(({ label, href }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className="flex min-h-11 items-center border-b border-black/[0.09] text-[15px] text-[#444444] transition-colors hover:text-[#111111] dark:border-white/[0.08] dark:text-[#888888] dark:hover:text-[#F0F0EE]"
                >
                  {label}
                </Link>
              ))}

              <button type="button" onClick={() => setMoreOpen((open) => !open)} aria-expanded={moreOpen} className="flex min-h-14 items-center justify-between border-b border-black/[0.09] text-left text-[15px] font-semibold text-near-black dark:border-white/[0.08] dark:text-white">
                <span>More</span><span aria-hidden="true" className={`text-lg font-normal transition-transform ${moreOpen ? "rotate-45" : ""}`}>+</span>
              </button>
              {moreOpen && <div className="border-b border-black/[0.09] pb-2 dark:border-white/[0.08]">{[...MORE_LINKS, { label: "Play", href: "/play" }, { label: "Pulse", href: "/pulse" }, { label: "About", href: ABOUT.href }].map(({ label, href }) => <Link key={href} href={href} onClick={onClose} className="flex min-h-11 items-center text-[15px] text-[#444444] transition-colors hover:text-[#111111] dark:text-[#888888] dark:hover:text-[#F0F0EE]">{label}</Link>)}</div>}

            </nav>

            {/* Legal footer */}
            <div className="mb-[max(env(safe-area-inset-bottom),1.5rem)] mt-8 border-t border-black/[0.09] pt-5 dark:border-white/[0.08]">
              <nav aria-label="Legal links" className="flex gap-4">
                <Link
                  href="/privacy"
                  onClick={onClose}
                  className="text-[12px] text-muted transition-colors hover:text-near-black dark:text-[#555555] dark:hover:text-[#999999]"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  onClick={onClose}
                  className="text-[12px] text-muted transition-colors hover:text-near-black dark:text-[#555555] dark:hover:text-[#999999]"
                >
                  Terms
                </Link>
                <Link
                  href="/contact"
                  onClick={onClose}
                  className="text-[12px] text-muted transition-colors hover:text-near-black dark:text-[#555555] dark:hover:text-[#999999]"
                >
                  Contact
                </Link>
              </nav>
            </div>
          </div>
        )}

        {/* ══ SUB-CATEGORY VIEWS ═════════════════════ */}
        {submenu && (
          <div className="flex flex-1 flex-col px-6 pb-8">
            {/* Back */}
            <button
              type="button"
              onClick={goBack}
              className="mt-6 flex min-h-11 items-center gap-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:text-near-black dark:hover:text-[#F0F0EE]"
            >
              <ArrowLeft size={14} />
              <span>Back to Explore</span>
            </button>

            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted">Explore section</p>
            <h1 className="mt-2 font-display text-[36px] leading-[1.05] tracking-[-0.02em] text-near-black dark:text-white">{submenu.title}</h1>

            {/* Compact section groups — one per underlying category */}
            <div className="mt-8 flex flex-col gap-9">
              {submenu.sections.map((section) => (
                <div key={section.title}>
                  <Link
                    href={section.href}
                    onClick={onClose}
                    className="mb-2 flex min-h-11 items-center font-display text-[22px] leading-tight tracking-[-0.01em] text-near-black transition-colors hover:text-electric dark:text-white"
                  >
                    {section.title}
                  </Link>
                  <nav aria-label={`${section.title} navigation`} className="flex flex-col border-t border-black/[0.07] dark:border-white/[0.08]">
                    {section.links.map(({ label, href }) => (
                      <Link
                        key={label}
                        href={href}
                        onClick={onClose}
                        className="group flex min-h-11 items-center justify-between border-b border-black/[0.09] py-2 text-[15px] text-[#444444] transition-colors hover:text-electric dark:border-white/[0.08] dark:text-[#bbbbbb]"
                      >
                        <span>{label}</span>
                        <ArrowRight size={12} className="text-[#999999]/60 dark:text-[#777777]" />
                      </Link>
                    ))}
                  </nav>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
