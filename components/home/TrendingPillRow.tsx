import Link from "next/link";

export default function TrendingPillRow({ pills }: { pills: string[] }) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[.12em] text-muted">
        Trending now
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-2 border-y border-card-border py-4">
        {pills.map((pill) => {
          return (
            <Link
              key={pill}
              href={`/search?q=${encodeURIComponent(pill)}`}
              className="text-sm font-medium underline decoration-card-border underline-offset-4 transition hover:text-electric"
            >
              {pill}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
