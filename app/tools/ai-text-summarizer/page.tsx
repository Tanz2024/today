import AiUtilityPage, { aiUtilityMetadata } from "@/components/tools/AiUtilityPage";

// Availability is read from server env; re-check periodically.
export const revalidate = 3600;
export const metadata = aiUtilityMetadata("ai-text-summarizer");

export default function Page() {
  return <AiUtilityPage slug="ai-text-summarizer" />;
}
