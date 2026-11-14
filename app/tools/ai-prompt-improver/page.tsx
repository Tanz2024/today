import AiUtilityPage, { aiUtilityMetadata } from "@/components/tools/AiUtilityPage";

// Availability is read from server env; re-check periodically.
export const revalidate = 3600;
export const metadata = aiUtilityMetadata("ai-prompt-improver");

export default function Page() {
  return <AiUtilityPage slug="ai-prompt-improver" />;
}
