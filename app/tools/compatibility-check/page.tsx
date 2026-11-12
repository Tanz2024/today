import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import CompatibilityTool from "@/components/tools/CompatibilityTool";
export const metadata = buildMetadata({ title: "Compatibility Check", description: "Compare communication, planning and personal-space styles with someone you know.", path: "/tools/compatibility-check" });
export default function Page() { return <ToolShell title="Compatibility Check" description="A private conversation starter for two people, one phone and a few honest answers." tool="compatibility-check" trackCalculation={false}><CompatibilityTool /></ToolShell>; }
