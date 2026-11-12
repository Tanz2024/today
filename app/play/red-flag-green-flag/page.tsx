import type { Metadata } from "next";
import Container from "@/components/ui/Container";
import BackToPlay from "@/components/play/BackToPlay";
import RedFlagGreenFlag from "@/components/play/RedFlagGreenFlag";
import { redFlagGreenFlag } from "@/lib/games";
import { buildMetadata } from "@/lib/seo";

const FALLBACK_STATEMENTS = [
  { id: "fallback-1", statement: "They remember the tiny details you mentioned once." },
  { id: "fallback-2", statement: "They only reply when they need something." },
  { id: "fallback-3", statement: "They respect your no without making it weird." },
  { id: "fallback-4", statement: "They keep cancelling and never suggest another time." },
  { id: "fallback-5", statement: "They hype your good news without making it about themselves." },
  { id: "fallback-6", statement: "They make jokes about your boundaries." },
  { id: "fallback-7", statement: "They check in after a difficult day." },
  { id: "fallback-8", statement: "They leave every plan until the last minute." },
];

export const metadata: Metadata = buildMetadata({
  title: "Red Flag / Green Flag",
  description: "Quick relationship behaviors — call each one a red flag or a green flag.",
  path: "/play/red-flag-green-flag",
});

export default function RedFlagGreenFlagPage() {
  const statements = redFlagGreenFlag.length > 0 ? redFlagGreenFlag : FALLBACK_STATEMENTS;

  return (
    <Container className="py-8 sm:py-14">
      <BackToPlay />
      <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.14em] text-electric">Play</p>
      <h1 className="mt-3 max-w-full break-words font-heading text-4xl font-bold leading-[1.05] sm:text-7xl">
        Red flag or green flag?
      </h1>
      <p className="mt-4 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
        Quick behaviors, no context. Call it how you see it.
      </p>
      <div className="mt-7 max-w-5xl sm:mt-8">
        <RedFlagGreenFlag statements={statements} />
      </div>
    </Container>
  );
}
