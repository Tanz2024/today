import Container from "@/components/ui/Container";
import { clampToLaunch, DISPLAY_TIME_ZONE } from "@/lib/launch";
import { getMetroPicks, DEFAULT_CITY } from "@/lib/metro-picks";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Global Picks",
  description: "Verified places and cultural spaces worth knowing around the world.",
  path: "/metro",
  // Empty pages stay out of the index until picks are published.
  noindex: getMetroPicks(DEFAULT_CITY, 1).length === 0,
});

function formatVerifiedDate(dateStr: string) {
  return clampToLaunch(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: DISPLAY_TIME_ZONE });
}

export default function MetroPage() {
  const picks = getMetroPicks(DEFAULT_CITY, 100);

  return (
    <Container className="flex flex-col gap-8 py-12 sm:py-16">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-electric">Global Picks</p>
        <h1 className="mt-3 font-heading text-3xl font-bold sm:text-5xl">Places worth knowing.</h1>
        <p className="mt-3 max-w-xl text-muted">
          Real places, verified through provider data and worth saving for later.
        </p>
      </div>

      {picks.length === 0 ? (
        <p className="max-w-md text-muted">
          We&apos;re still verifying our first Global Picks edition — nothing published here yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {picks.map((pick) => (
            <a
              key={pick.id}
              href={pick.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 rounded-[8px] border border-card-border p-4 transition-colors hover:border-electric"
            >
              <div className="flex flex-wrap gap-1.5">
                {pick.labels.map((label) => (
                  <span key={label} className="rounded-full bg-electric/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-electric">
                    {label}
                  </span>
                ))}
              </div>
              <h2 className="font-heading text-[18px] font-semibold text-near-black group-hover:text-electric">
                {pick.title}
              </h2>
              <p className="text-[13px] text-muted">
                {pick.location} · {pick.priceRange} · {pick.nearestTransit}
              </p>
              <p className="text-[14px] leading-[1.5] text-near-black">{pick.description}</p>
              <p className="mt-1 text-[11px] text-muted">Verified {formatVerifiedDate(pick.verifiedDate)}</p>
            </a>
          ))}
        </div>
      )}
    </Container>
  );
}
