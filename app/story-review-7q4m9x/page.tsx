import { buildMetadata } from "@/lib/seo";
import ModeratorDashboard from "@/components/admin/ModeratorDashboard";

export const metadata = buildMetadata({ title: "Editorial moderation", description: "Internal BrisaStory tool.", path: "/story-review-7q4m9x", noindex: true });

export const dynamic = "force-dynamic";

export default function EditorialModerationPage() {
  return <ModeratorDashboard />;
}
