import WorkspacePage, { workspaceMetadata } from "@/components/workspaces/WorkspacePage";
import ImageDocumentStudio from "@/components/workspaces/ImageDocumentStudio";

export const metadata = workspaceMetadata("ai-image-document-studio");

export default function Page() {
  return <WorkspacePage slug="ai-image-document-studio"><ImageDocumentStudio /></WorkspacePage>;
}
