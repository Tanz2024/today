"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Fire, MagnifyingGlass, List } from "@phosphor-icons/react";
import { useState } from "react";
import MobileMenuOverlay from "@/components/layout/MobileMenuOverlay";

const TABS = [
  { href: "/", label: "Home", icon: House },
  { href: "/trending", label: "Trending", icon: Fire },
  { href: "/search", label: "Search", icon: MagnifyingGlass },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-card-border bg-white/95 backdrop-blur pb-[env(safe-area-inset-bottom,0px)] md:hidden dark:bg-[#121212]/95"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium"
            >
              <Icon
                size={22}
                weight={active ? "fill" : "regular"}
                className={active ? "text-electric" : "text-muted"}
              />
              <span className={active ? "text-electric" : "text-muted"}>{tab.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          className="flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium text-muted"
        >
          <List size={22} />
          <span>Menu</span>
        </button>
      </nav>

      {menuOpen && <MobileMenuOverlay onClose={() => setMenuOpen(false)} />}
    </>
  );
}
