"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretDown, MagnifyingGlass, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Logo from "@/components/layout/Logo";
import { COMPANY_LINKS, LEGAL_LINKS, PRIMARY_NAV, isNavItemActive } from "@/lib/nav";

// Mobile/tablet navigation sheet. It renders the same PRIMARY_NAV model as the
// desktop header, grouped as expandable sections, with search at the top.
export default function MobileMenu({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [expanded, setExpanded] = useState<string | null>(() => PRIMARY_NAV.find((item) => isNavItemActive(item, pathname) && item.children)?.label ?? null);
  const [query, setQuery] = useState("");
  const [visible, setVisible] = useState(false);
  const baseId = useId();

  useEffect(() => {
    const html = document.documentElement;
    const previousOverflow = html.style.overflow;
    html.style.overflow = "hidden";
    const raf = requestAnimationFrame(() => {
      setVisible(true);
      panelRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
      html.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const q = query.trim();
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search");
    onClose();
  };

  return createPortal(
    <div className={`mobile-menu-root ${visible ? "is-visible" : ""}`}>
      <button type="button" className="mobile-menu-backdrop" aria-label="Close menu" tabIndex={-1} onClick={onClose} />
      <div ref={panelRef} id="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="Site menu" className="mobile-menu-panel">
        <div className="mobile-menu-header">
          <Link href="/" onClick={onClose} aria-label="TodayAI home"><Logo /></Link>
          <button type="button" onClick={onClose} aria-label="Close menu" className="site-menu-button" data-autofocus>
            <X size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>

        <div className="mobile-menu-body">
          <form role="search" onSubmit={submitSearch} className="mobile-menu-search">
            <MagnifyingGlass size={18} aria-hidden="true" className="text-muted" />
            <label htmlFor={`${baseId}-q`} className="sr-only">Search TodayAI</label>
            <input
              ref={searchRef}
              id={`${baseId}-q`}
              type="search"
              enterKeyHint="search"
              placeholder="Search TodayAI"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button type="submit" className="mobile-menu-search-submit">Go</button>
          </form>

          <nav aria-label="Primary">
            <ul className="mobile-menu-list">
              {PRIMARY_NAV.map((item) => {
                const active = isNavItemActive(item, pathname);
                const groupId = `${baseId}-${item.label.replace(/\s+/g, "-")}`;
                const isExpanded = expanded === item.label;
                return (
                  <li key={item.href} className="mobile-menu-item">
                    <div className="mobile-menu-row">
                      <Link href={item.href} onClick={onClose} aria-current={active ? "page" : undefined} className={`mobile-menu-link ${active ? "is-active" : ""}`}>
                        <span>{item.label}</span>
                        <span className="mobile-menu-link-description">{item.description}</span>
                      </Link>
                      {item.children?.length ? (
                        <button
                          type="button"
                          className="mobile-menu-expand"
                          aria-expanded={isExpanded}
                          aria-controls={groupId}
                          aria-label={`${isExpanded ? "Hide" : "Show"} ${item.label} sections`}
                          onClick={() => setExpanded(isExpanded ? null : item.label)}
                        >
                          <CaretDown size={16} weight="bold" className={isExpanded ? "rotate-180" : ""} aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    {item.children?.length && isExpanded ? (
                      <ul id={groupId} className="mobile-menu-sublist">
                        {item.children.map((child) => (
                          <li key={child.href}>
                            <Link href={child.href} onClick={onClose} className="mobile-menu-sublink">{child.label}</Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          <nav aria-label="Company" className="mobile-menu-footer">
            {[...COMPANY_LINKS, ...LEGAL_LINKS.slice(0, 2)].map((link) => (
              <Link key={link.href} href={link.href} onClick={onClose}>{link.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </div>,
    document.body,
  );
}
