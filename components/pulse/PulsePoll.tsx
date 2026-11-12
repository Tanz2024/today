"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AppleLogo, SpotifyLogo } from "@phosphor-icons/react";
import type { Poll, PollCounts } from "@/lib/polls";

type DisplayPoll = Poll & { optionLabels?: Record<string, string> };

function optionIcon(option: string) {
  if (option === "Spotify") return <SpotifyLogo size={18} weight="fill" aria-hidden="true" className="text-[#1db954]" />;
  if (option === "Apple Music") return <AppleLogo size={18} weight="fill" aria-hidden="true" className="text-near-black" />;
  return null;
}

export default function PulsePoll({
  poll,
  layout = "stacked",
  resultsLink,
}: {
  poll: DisplayPoll;
  layout?: "stacked" | "split";
  resultsLink?: { label: string; href: string };
}) {
  const key = `freshscene:poll:${poll.id}`;
  const [counts, setCounts] = useState<PollCounts>({});
  const [voted, setVoted] = useState<string | null>(null);

  useEffect(() => {
    Promise.resolve().then(() => setVoted(localStorage.getItem(key)));
    fetch(`/api/pulse/${poll.id}`).then((r) => r.json()).then((d) => setCounts(d.counts ?? {}));
  }, [poll.id, key]);

  async function vote(option: string) {
    if (voted) return;
    const res = await fetch(`/api/pulse/${poll.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ option }),
    });
    const data = await res.json();
    if (!res.ok || !data.counts) return;
    setCounts(data.counts ?? counts);
    setVoted(option);
    localStorage.setItem(key, option);
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const split = layout === "split";

  return (
    <div className={split ? "lg:grid lg:grid-cols-[1.1fr_.9fr] lg:items-start lg:gap-20" : undefined}>
      <h2 className={`font-heading font-semibold leading-snug ${split ? "max-w-[560px] text-2xl sm:text-3xl" : "max-w-lg text-2xl sm:text-3xl"}`}>
        {poll.question}
      </h2>

      <div className={split ? "mt-4 w-full sm:mt-6 lg:mt-0" : "mt-4 sm:mt-6"}>
        {voted ? (
          <div className="max-w-md space-y-4 border-t border-card-border pt-4">
            {poll.options.map((o) => (
              <div key={o}>
                <div className="mb-1 flex justify-between gap-4 text-sm">
                  <span className="flex min-w-0 items-center gap-2 font-medium">
                    {optionIcon(o)}
                    <span className="truncate">{poll.optionLabels?.[o] ?? o}</span>
                    {voted === o && <span className="shrink-0 text-xs font-semibold text-electric">✓ Your vote</span>}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-muted">{total ? `${Math.round(((counts[o] ?? 0) / total) * 100)}% chose this` : "0%"}</span>
                </div>
                <div className="h-1 bg-card-border">
                  <div
                    className="h-full bg-electric transition-[width] duration-500 ease-out motion-reduce:transition-none"
                    style={{ width: `${total ? ((counts[o] ?? 0) / total) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
            <p className="mt-4 text-xs text-muted">
              {total.toLocaleString()} {total === 1 ? "person chose" : "people chose"}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {resultsLink && (
                <Link href={resultsLink.href} className="inline-block text-sm font-semibold text-electric hover:underline">
                  {resultsLink.label}
                </Link>
              )}
            </div>
          </div>
        ) : (
          <>
            <p className="mb-3 hidden text-xs font-medium uppercase tracking-[0.1em] text-muted sm:block">Choose one</p>
            <div className="flex flex-wrap gap-2">
            {poll.options.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => vote(o)}
                aria-label={`Choose ${poll.optionLabels?.[o] ?? o}`}
                aria-pressed={false}
                className="tap-target group inline-flex items-center justify-center gap-1.5 rounded-full border border-card-border bg-white px-4 py-2 text-center text-[14px] font-semibold text-[#151417] shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-[background-color,border-color,color,transform] duration-150 hover:border-electric hover:bg-electric hover:text-white active:scale-[0.97] motion-reduce:transform-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2F2942] active:translate-y-0"
              >
                {optionIcon(o)}
                <span>{poll.optionLabels?.[o] ?? o}</span>
              </button>
            ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
