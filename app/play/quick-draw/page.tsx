import { buildMetadata } from "@/lib/seo";
import QuickDrawGame from "@/components/play/QuickDrawGame";

export const metadata = buildMetadata({
  title: "Quick Draw — BrisaStory Play",
  description: "Draw a prompt before the timer runs out, then save your sketch as an image or PDF.",
  path: "/play/quick-draw",
});

export default function QuickDrawPage() {
  return <QuickDrawGame />;
}
