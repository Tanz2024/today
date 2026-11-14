import LocalAiToolPage, { localAiToolMetadata } from "@/components/tools/LocalAiToolPage";
import ImageToText from "@/components/tools/local/ImageToText";

export const revalidate = 3600;
export const metadata = localAiToolMetadata("ai-image-to-text");

export default function Page() {
  return <LocalAiToolPage slug="ai-image-to-text"><ImageToText /></LocalAiToolPage>;
}
