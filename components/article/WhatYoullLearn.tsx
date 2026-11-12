import type { TocItem } from "@/lib/toc";

export default function WhatYoullLearn({
  items,
}: {
  items: TocItem[];
}) {
  const sections = items
    .filter((item) => item.level === 2)
    .slice(0, 5);

  if (sections.length < 3) {
    return null;
  }

  return (
    <section
      aria-labelledby="what-youll-learn-heading"
      className="
        my-12
        border-y border-card-border
        py-6
      "
    >
      <h2
        id="what-youll-learn-heading"
        className="
          text-[11px]
          font-semibold
          uppercase
          tracking-[0.13em]
          text-muted
        "
      >
        What you&apos;ll learn
      </h2>

      <ol className="mt-5 space-y-3">
        {sections.map((item, index) => (
          <li
            key={item.id}
            className="
              flex items-start
              gap-4
              text-[16px]
              leading-[1.5]
              text-near-black
            "
          >
            <span
              className="
                mt-[2px]
                w-6 shrink-0
                font-mono
                text-[11px]
                text-muted
              "
            >
              {String(index + 1).padStart(
                2,
                "0",
              )}
            </span>

            <span>{item.text}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}