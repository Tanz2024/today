import Container from "@/components/ui/Container";
import RushGame from "@/components/play/rush/RushGame";
import PlaySeo from "@/components/play/PlaySeo";
import { getPlayArticleCandidates } from "@/lib/play/candidates";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "TodayAI Rush — Free Endless Runner Game",
  description: "Play TodayAI Rush, a free browser endless runner. Switch lanes, jump road obstacles and beat your best distance on mobile or desktop.",
  path: "/play/rush",
});

export default async function RushPage() {
  const candidates = await getPlayArticleCandidates();
  return (
    <Container className="py-4 sm:py-8">
      <RushGame candidates={candidates} />
      <PlaySeo name="TodayAI Rush" path="/play/rush" genre="Endless runner" description="TodayAI Rush is a fast, free browser runner where you switch lanes, jump delivery vans and road barriers, collect story markers and chase a new distance record." controls="Tap left or right to switch lanes, swipe up to jump, or use the arrow keys and Space on desktop." />
    </Container>
  );
}
