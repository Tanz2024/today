import type { QuickRead } from "@/types/article";

// Fully server-rendered, plain HTML — no client JS, so the text is indexable
// and available even with JavaScript disabled. Only rendered when the
// article actually has quickRead content (see ArticleView.tsx).
export default function QuickReadPanel({ quickRead }: { quickRead: QuickRead }) {
  return (
    <section
      aria-labelledby="quick-read-heading"
      className="mt-10 pt-6 pb-3 sm:mt-12 sm:pt-7"
    >
      <h2 id="quick-read-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-near-black">
        The Quick Read
      </h2>
      <div className="mt-2.5 h-px w-10 bg-near-black/25" aria-hidden="true" />

      <div className="mt-6">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          20-Second Answer
        </h3>
        <p className="mt-2 text-[calc(16px*var(--read-scale,1))] leading-[1.6] text-near-black sm:text-[calc(17px*var(--read-scale,1))]">{quickRead.twentySecondAnswer}</p>
      </div>

      {quickRead.keyPoints.length > 0 && (
        <div className="mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">What Matters</h3>
          <ol className="mt-3 space-y-3.5">
            {quickRead.keyPoints.map((point, index) => (
              <li key={index} className="flex gap-3.5 text-[calc(15px*var(--read-scale,1))] leading-[1.55] text-near-black sm:text-[calc(16px*var(--read-scale,1))]">
                <span className="mt-[1px] shrink-0 font-mono text-[calc(12px*var(--read-scale,1))] text-muted">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{point}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {quickRead.whatShouldIDo && (
        <div className="mt-8">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            What Should I Do?
          </h3>
          <p className="mt-2 text-[calc(15px*var(--read-scale,1))] leading-[1.55] text-near-black sm:text-[calc(16px*var(--read-scale,1))]">{quickRead.whatShouldIDo}</p>
        </div>
      )}

      <div className="mt-8 border-t border-card-border" aria-hidden="true" />
    </section>
  );
}
