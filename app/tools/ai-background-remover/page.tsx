import LocalAiToolPage, { localAiToolMetadata } from "@/components/tools/LocalAiToolPage";
import BackgroundRemover from "@/components/tools/local/BackgroundRemover";

export const revalidate = 3600;
export const metadata = localAiToolMetadata("ai-background-remover");

export default function Page() {
  return <LocalAiToolPage slug="ai-background-remover"><BackgroundRemover /></LocalAiToolPage>;
}
