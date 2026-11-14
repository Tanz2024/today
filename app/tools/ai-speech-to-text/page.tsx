import LocalAiToolPage, { localAiToolMetadata } from "@/components/tools/LocalAiToolPage";
import SpeechToText from "@/components/tools/local/SpeechToText";

export const revalidate = 3600;
export const metadata = localAiToolMetadata("ai-speech-to-text");

export default function Page() {
  return <LocalAiToolPage slug="ai-speech-to-text"><SpeechToText /></LocalAiToolPage>;
}
