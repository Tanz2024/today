import WorkspacePage, { workspaceMetadata } from "@/components/workspaces/WorkspacePage";
import ResumeAssistant from "@/components/workspaces/ResumeAssistant";

export const metadata = workspaceMetadata("ai-resume-assistant");

export default function Page() {
  return <WorkspacePage slug="ai-resume-assistant"><ResumeAssistant /></WorkspacePage>;
}
