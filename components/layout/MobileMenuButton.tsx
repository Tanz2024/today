"use client";

import { List } from "@phosphor-icons/react";
import { useState, type PointerEvent } from "react";
import MobileMenuOverlay from "@/components/layout/MobileMenuOverlay";

export default function MobileMenuButton() {
  const [open, setOpen] = useState(false);
  const openMenu = () => setOpen(true);
  const openMenuOnTouch = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    openMenu();
  };

  return (
    <>
      <button
        type="button"
        onClick={openMenu}
        onPointerDown={openMenuOnTouch}
        aria-label="Open menu"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        className="relative z-[70] flex h-11 w-11 touch-manipulation items-center justify-center rounded-full text-near-black transition hover:bg-black/[0.04] hover:text-electric focus-visible:outline focus-visible:outline-2 focus-visible:outline-electric dark:text-white dark:hover:bg-white/[0.08]"
      >
        <List size={20} weight="bold" />
      </button>
      {open && <MobileMenuOverlay onClose={() => setOpen(false)} />}
    </>
  );
}
