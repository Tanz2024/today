import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import TwoChoiceGame from "@/components/play/TwoChoiceGame";
import { wouldYouRather } from "@/lib/games";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Would You Rather",
  description: "Low-stakes impossible choices to argue about with your friends.",
  path: "/play/would-you-rather",
});

export default function WouldYouRatherPage() {
  return (
    <Container className="py-8 sm:py-14">
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-electric">Play</p>
      <h1 className="mt-3 max-w-full break-words font-heading text-4xl font-bold leading-[1.05] sm:text-7xl">
        Would you rather?
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
        Impossible choices, no wrong answers. Good for arguing about.
      </p>
      <div className="mt-7 max-w-5xl sm:mt-8">
        <TwoChoiceGame
          title="Would you rather…"
          subtitle="Would you rather?"
          questions={wouldYouRather}
          shareText="Come argue about Would You Rather with me on TodayAI."
          currentHref="/play/would-you-rather"
          accent="#dc1f32"
        />
      </div>
    </Container>
  );
}
