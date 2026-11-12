import { ArrowRight } from "@phosphor-icons/react/ssr";

export default function NewsletterCTA() {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 border-y border-black/[0.08] bg-soft-pink px-6 py-12 text-near-black sm:px-12 sm:py-16 lg:px-20">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 sm:flex-row sm:items-end sm:justify-between sm:gap-12">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[.14em] text-electric">The Fresh Drop</p>
          <h2 className="mt-4 max-w-2xl font-heading text-[34px] font-extrabold leading-[1.02] tracking-[-.045em] sm:text-[50px]">
            Stories worth opening.
          </h2>
          <p className="mt-3 text-sm text-[#6b7280]">A small weekly hit of culture, life and things worth knowing.</p>
        </div>
        <p className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-electric">
          Coming soon <ArrowRight size={14} weight="bold" />
        </p>
      </div>
    </div>
  );
}
