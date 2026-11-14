"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CaretDown, List, MagnifyingGlass } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import Logo from "@/components/layout/Logo";
import MobileMenu from "@/components/layout/MobileMenuOverlay";
import { PRIMARY_NAV, isNavItemActive, type NavItem } from "@/lib/nav";

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

// Short, single-column dropdown: description, links, overview link.
function Dropdown({ item, id, onNavigate }: { item: NavItem; id: string; onNavigate: () => void }) {
  const links = item.children ?? [];
  return (
    <div id={id} className="nav-dropdown nav-dropdown-simple" role="region" aria-label={`${item.label} menu`}>
      <p className="nav-dropdown-description">{item.description}</p>
      <ul className="nav-dropdown-list">
        {links.map((link) => <li key={`${link.label}-${link.href}`}><Link href={link.href} onClick={onNavigate} className="nav-dropdown-link">{link.label}</Link></li>)}
      </ul>
      {item.overview ? <Link href={item.overview.href} onClick={onNavigate} className="nav-dropdown-overview">{item.overview.label} →</Link> : null}
    </div>
  );
}

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerHidden, setHeaderHidden] = useState(false);
  const lastScrollY = useRef(0);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(null), 120);
  };

  // Close any open surface after navigation.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(null);
    setMenuOpen(false);
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(null);
      // "/" jumps to search from anywhere that isn't a text field.
      if (event.key === "/" && !event.metaKey && !event.ctrlKey && !event.altKey && !isTypingTarget(event.target)) {
        event.preventDefault();
        router.push("/search");
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) setOpen(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [router]);

  useEffect(() => {
    const onScroll = () => {
      const current = window.scrollY;
      if (menuOpen || open || current <= 12 || document.activeElement?.closest(".site-header")) setHeaderHidden(false);
      else if (current > lastScrollY.current + 4) setHeaderHidden(true);
      else if (current < lastScrollY.current - 4) setHeaderHidden(false);
      lastScrollY.current = current;
    };
    lastScrollY.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen, open]);

  useEffect(() => () => cancelClose(), []);

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
    // Return focus to the control that opened the menu.
    requestAnimationFrame(() => menuButtonRef.current?.focus());
  }, []);

  return (
    <header className={`site-header editorial-site-header ${headerHidden ? "is-scroll-hidden" : ""}`}>
      <div className="site-header-inner">
        <Link href="/" aria-label="TodayAI home" className="site-header-logo">
          <Logo />
        </Link>

        <nav ref={navRef} aria-label="Primary" className="site-nav" onMouseLeave={scheduleClose}>
          <ul className="site-nav-list">
            {PRIMARY_NAV.map((item) => {
              const active = isNavItemActive(item, pathname);
              const hasMenu = Boolean(item.children?.length);
              const isOpen = open === item.label;
              const menuId = `nav-menu-${item.label.toLowerCase().replace(/\s+/g, "-")}`;
              return (
                <li
                  key={item.href}
                  className="site-nav-item"
                  onMouseEnter={() => {
                    cancelClose();
                    setOpen(hasMenu ? item.label : null);
                  }}
                >
                  <Link href={item.href} aria-current={active ? "page" : undefined} className={`site-nav-link ${active ? "is-active" : ""}`}>
                    {item.label}
                  </Link>
                  {hasMenu ? (
                    <button
                      type="button"
                      className="site-nav-toggle"
                      aria-expanded={isOpen}
                      aria-controls={menuId}
                      aria-label={`Show ${item.label} menu`}
                      onClick={() => setOpen(isOpen ? null : item.label)}
                    >
                      <CaretDown size={11} weight="bold" className={isOpen ? "rotate-180" : ""} />
                    </button>
                  ) : null}
                  {hasMenu && isOpen ? <Dropdown item={item} id={menuId} onNavigate={() => setOpen(null)} /> : null}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="site-header-actions">
          <Link href="/search" className="site-search-button" aria-label="Search TodayAI">
            <MagnifyingGlass size={18} weight="bold" aria-hidden="true" />
            <span className="site-search-label">Search</span>
            <kbd className="site-search-kbd" aria-hidden="true">/</kbd>
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            className="site-menu-button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu-panel"
            onClick={() => setMenuOpen(true)}
          >
            <List size={22} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
      {menuOpen ? <MobileMenu onClose={closeMenu} /> : null}
    </header>
  );
}
