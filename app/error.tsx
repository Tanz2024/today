"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowCounterClockwise, House } from "@phosphor-icons/react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="font-heading text-3xl font-bold">Something glitched out</h1>
      <p className="text-muted">
        Our bad — that page hit a snag on our end. It&apos;s not you, it&apos;s us. Try again, or head back
        home.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="flex items-center gap-2 rounded-full bg-electric px-5 py-2.5 text-sm font-semibold text-white"
        >
          <ArrowCounterClockwise size={16} weight="bold" />
          Try again
        </button>
        <Link
          href="/"
          className="flex items-center gap-2 rounded-full border border-card-border px-5 py-2.5 text-sm font-semibold"
        >
          <House size={16} weight="bold" />
          Go home
        </Link>
      </div>
    </div>
  );
}
