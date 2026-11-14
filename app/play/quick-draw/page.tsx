import GameDetailLayout from "@/components/play/GameDetailLayout";
import QuickDrawGame from "@/components/play/QuickDrawGame";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Draw & Guess — sketch while AI guesses",
  description: "Draw a prompt before the timer runs out while an image-recognition model running in your browser tries to guess your sketch. Free, no sign-up.",
  path: "/play/quick-draw",
});

export default function QuickDrawPage() {
  return (
    <GameDetailLayout
      slug="quick-draw"
      howToPlay={[
        "Read the prompt, then draw it on the canvas with your mouse, finger or stylus.",
        "Pause for a moment and the AI model guesses what your sketch shows.",
        "If it recognises the prompt before the timer ends, the round counts as recognised.",
        "Use Shuffle for a new prompt. After five rounds you can save your drawing as a PNG or PDF.",
      ]}
      about={
        <>
          <p>Guesses come from <strong>quickdraw-mobilevit-small</strong>, an open-source image classifier trained on simple doodles of 345 everyday things. Every prompt in this game is one of those 345, so each round can be won.</p>
          <p>The model downloads once and runs entirely in your browser, so your drawings aren&apos;t uploaded anywhere.</p>
        </>
      }
    >
      <QuickDrawGame />
    </GameDetailLayout>
  );
}
