import Link from "next/link";
import { getOtherActivities } from "@/lib/play-nav";

// After a social game or quiz: two other activities, kept compact.
export default function TryAnotherGame({ currentHref }: { currentHref: string }) {
  const activities = getOtherActivities(currentHref, 2);
  if (activities.length === 0) return null;

  return (
    <div className="mt-5 text-left">
      <p className="text-[13px] font-semibold text-near-black">Play something else</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        {activities.map((activity) => (
          <Link
            key={activity.href}
            href={activity.href}
            className="group block rounded-[10px] border border-card-border bg-white px-3.5 py-2.5 transition-colors hover:border-electric focus-visible:outline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-electric"
          >
            <span className="block font-heading text-[15px] font-semibold text-near-black group-hover:text-electric">{activity.label}</span>
            <span className="block truncate text-[12px] text-muted">{activity.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
