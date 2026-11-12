import Container from "@/components/ui/Container";
import BreakerGame from "@/components/play/breaker/BreakerGame";
import PlaySeo from "@/components/play/PlaySeo";
import { getPlayArticleCandidates } from "@/lib/play/candidates";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "TodayAI Breaker — Free Brick Breaker Game",
  description: "Play TodayAI Breaker, a free browser brick-breaker game. Clear colorful boards, build combos and beat your best score on mobile or desktop.",
  path: "/play/breaker",
});

export default async function BreakerPage() {
  const candidates = await getPlayArticleCandidates();
  return (
    <Container className="py-4 sm:py-8">
      <BreakerGame candidates={candidates} />
      <PlaySeo name="TodayAI Breaker" path="/play/breaker" genre="Brick breaker" description="TodayAI Breaker is a free arcade brick-breaker for the browser. Control the paddle, clear colorful boards, collect story tokens and progress through tougher patterns." controls="Drag or move your mouse to steer, tap to launch on mobile, or use the arrow keys and Space on desktop." />
    </Container>
  );
}
