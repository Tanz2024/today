"use client";

import { useMemo } from "react";
import { diffWords } from "@/lib/text/diff";

/** Inline word diff: deletions struck through, insertions highlighted. */
export default function DiffView({ before, after }: { before: string; after: string }) {
  const parts = useMemo(() => diffWords(before, after), [before, after]);
  return (
    <>
      {parts.map((part, i) => part.type === "same" ? <span key={i}>{part.text}</span> : part.type === "added" ? <ins key={i} className="ws-ins">{part.text}</ins> : <del key={i} className="ws-del">{part.text}</del>)}
    </>
  );
}
