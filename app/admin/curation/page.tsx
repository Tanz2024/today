import { buildMetadata } from "@/lib/seo";
import CurationAdmin from "@/components/admin/CurationAdmin";

export const metadata = buildMetadata({ title: "Curation admin", description: "Internal BrisaStory tool.", path: "/admin/curation", noindex: true });

export const dynamic = "force-dynamic";

export default async function CurationAdminPage() {
  // Do not read or render admin configuration during a public page request.
  // The client loads it only after the operator supplies the curation token.
  return <CurationAdmin initialSections={[]} />;
}
