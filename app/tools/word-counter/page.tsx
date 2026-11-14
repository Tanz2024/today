import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import WordCounterTool from "@/components/tools/WordCounterTool";

export const metadata = buildMetadata({ title: "Word & Character Counter", description: "Count words, characters, sentences and reading time for drafts and AI output. Free, and your text never leaves your device.", path: "/tools/word-counter" });

export default function Page() {
  return (
    <ToolShell title="Word & Character Counter" description="Check the length of a draft or AI-generated text against word or character limits. Your text never leaves this device.">
      <WordCounterTool />
    </ToolShell>
  );
}
