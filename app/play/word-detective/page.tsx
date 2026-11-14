import Link from "next/link";
import GameDetailLayout from "@/components/play/GameDetailLayout";
import WordDetectiveGame from "@/components/play/WordDetectiveGame";
import { HINT_AFTER } from "@/lib/play/word-detective";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "AI Word Detective — a daily semantic word game",
  description: "Guess the secret word. An AI language model running in your browser scores how close each guess is in meaning. A new puzzle every day, free, no sign-up.",
  path: "/play/word-detective",
});

export default function WordDetectivePage() {
  return (
    <GameDetailLayout
      slug="word-detective"
      howToPlay={[
        "Type any single word and press Guess.",
        "Each guess gets a closeness score from 0 to 100. Higher means its meaning is nearer the secret word.",
        "Use your warmest guesses to steer the next ones. Your guesses stay sorted, closest first.",
        `Stuck? A category hint appears after ${HINT_AFTER.category} guesses, the first letter after ${HINT_AFTER.firstLetter} and the length after ${HINT_AFTER.length}.`,
        "Solve it in as few guesses as you can, then share your result or play a practice word.",
      ]}
      about={
        <>
          <p>Closeness comes from <strong>all-MiniLM-L6-v2</strong>, a small open-source sentence-embedding model. It turns each word into a list of numbers that reflects how the word is used in text; words used in similar ways end up close together.</p>
          <p>The model downloads once (about 25&nbsp;MB) and runs entirely in your browser, so your guesses aren&apos;t sent to a server. It measures usage, not dictionary meaning, so the occasional score will surprise you; that&apos;s part of the puzzle.</p>
          <p>Want to find out more about how AI understands words? <Link href="/guides" className="underline">Read our AI guides</Link>.</p>
        </>
      }
    >
      <WordDetectiveGame />
    </GameDetailLayout>
  );
}
