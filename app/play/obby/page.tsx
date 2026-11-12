import Container from "@/components/ui/Container";
import ObbyGame from "@/components/play/obby/ObbyGame";
import PlaySeo from "@/components/play/PlaySeo";
import { getPlayArticleCandidates } from "@/lib/play/candidates";
import { buildMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = buildMetadata({
  title: "TodayAI Obby — Free School Platformer Game",
  description: "Play TodayAI Obby, a free browser platformer set in a nostalgic school world. Jump gaps, avoid classroom obstacles and reach endless new sections.",
  path: "/play/obby",
});

export default async function ObbyPage() {
  const candidates = await getPlayArticleCandidates();
  return (
    <Container className="py-4 sm:py-8">
      <ObbyGame candidates={candidates} />
      <PlaySeo name="TodayAI Obby" path="/play/obby" genre="Platformer" description="TodayAI Obby is a free school-day platformer for the browser. Run through classrooms and corridors, jump gaps, avoid school obstacles and collect reward stickers." controls="Tap to jump on mobile, or press Space, Up, or W on desktop." />
    </Container>
  );
}
