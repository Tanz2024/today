import WorkspacePage, { workspaceMetadata } from "@/components/workspaces/WorkspacePage";
import WritingStudio from "@/components/workspaces/WritingStudio";

export const metadata = workspaceMetadata("ai-writing-studio");

export default function Page() {
  return <WorkspacePage slug="ai-writing-studio"><WritingStudio /></WorkspacePage>;
}
