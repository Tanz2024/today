"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { AccessFilter } from "@/lib/model-rankings";

const AccessFilterContext = createContext<{ filter: AccessFilter; setFilter: (filter: AccessFilter) => void }>({ filter: "all", setFilter: () => {} });

export function useAccessFilter() {
  return useContext(AccessFilterContext);
}

/** Shares one All / Open / Closed choice between every ranked chart below it. */
export function AccessFilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilter] = useState<AccessFilter>("all");
  return <AccessFilterContext.Provider value={{ filter, setFilter }}>{children}</AccessFilterContext.Provider>;
}

const OPTIONS: { value: AccessFilter; label: string }[] = [
  { value: "all", label: "All models" },
  { value: "open", label: "Open weights" },
  { value: "closed", label: "Closed" },
];

/** One filter row above the charts it scopes (native radios: keyboard and screen-reader friendly). */
export function AccessFilterControl() {
  const { filter, setFilter } = useAccessFilter();
  return (
    <>
      <div className="rank-filter-bar">
        <fieldset className="rank-filter">
          <legend>Show</legend>
          <div className="rank-filter-options">
            {OPTIONS.map((option) => (
              <label key={option.value} className="rank-filter-option">
                <input type="radio" name="model-access" value={option.value} checked={filter === option.value} onChange={() => setFilter(option.value)} />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="rank-filter-note"><span className="rank-key rank-key-open" aria-hidden="true" />Open weights: the model’s weights are published, so anyone can download and run it (licences vary). <span className="rank-key rank-key-closed" aria-hidden="true" />Closed: available only through the maker’s apps or API. The filter applies to every chart on this page.</p>
    </>
  );
}
