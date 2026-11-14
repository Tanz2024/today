import WorkspacePage, { workspaceMetadata } from "@/components/workspaces/WorkspacePage";
import StudyAssistant from "@/components/workspaces/StudyAssistant";

export const metadata = workspaceMetadata("ai-study-assistant");

export default function Page() {
  return <WorkspacePage slug="ai-study-assistant"><StudyAssistant /></WorkspacePage>;
}
