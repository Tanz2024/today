import LocalAiToolPage, { localAiToolMetadata } from "@/components/tools/LocalAiToolPage";
import PdfAssistant from "@/components/tools/local/PdfAssistant";
import { isAiUtilitiesEnabled } from "@/lib/ai-utilities";
export const revalidate = 3600;
export const metadata = localAiToolMetadata("ai-pdf-assistant");

export default function Page() {
  return <LocalAiToolPage slug="ai-pdf-assistant"><PdfAssistant available={isAiUtilitiesEnabled()} /></LocalAiToolPage>;
}
