import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import TwoChoiceGame from "@/components/play/TwoChoiceGame";
import { weekendPicker } from "@/lib/games";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Weekend Picker",
  description: "Quick prompts to help you and your friends actually decide on weekend plans.",
  path: "/play/weekend-picker",
});

export default function WeekendPickerPage() {
  return (
    <Container className="py-8 sm:py-14">
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-electric">Play</p>
      <h1 className="mt-3 max-w-full break-words font-heading text-4xl font-bold leading-[1.05] sm:text-7xl">
        What are we doing this weekend?
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
        Quick picks to help the group actually land on a plan.
      </p>
      <div className="mt-7 max-w-5xl sm:mt-8">
        <TwoChoiceGame
          title="This weekend…"
          subtitle="Weekend Picker"
          questions={weekendPicker}
          shareText="Help me figure out our weekend plans on BrisaStory."
          currentHref="/play/weekend-picker"
          accent="#E8703A"
        />
      </div>
    </Container>
  );
}
