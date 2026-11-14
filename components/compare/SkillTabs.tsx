"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

/** Accessible tabs (arrow keys, Home/End). Every panel stays in the HTML; inactive ones are hidden. */
export default function SkillTabs({ tabs }: { tabs: { key: string; label: string; panel: ReactNode }[] }) {
  const [active, setActive] = useState(0);
  const base = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setActive(next);
    buttons.current[next]?.focus();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowRight: active + 1, ArrowLeft: active - 1, Home: 0, End: tabs.length - 1 };
    if (event.key in moves) { event.preventDefault(); select(moves[event.key]); }
  };

  return (
    <div className="skill-tabs">
      <div role="tablist" aria-label="Skill" className="skill-tablist">
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            ref={(node) => { buttons.current[index] = node; }}
            type="button"
            role="tab"
            id={`${base}-tab-${tab.key}`}
            aria-selected={index === active}
            aria-controls={`${base}-panel-${tab.key}`}
            tabIndex={index === active ? 0 : -1}
            onClick={() => setActive(index)}
            onKeyDown={onKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {tabs.map((tab, index) => (
        <div key={tab.key} role="tabpanel" id={`${base}-panel-${tab.key}`} aria-labelledby={`${base}-tab-${tab.key}`} hidden={index !== active} className="skill-panel">
          {tab.panel}
        </div>
      ))}
    </div>
  );
}
