import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import CgpaTool from "@/components/tools/CgpaTool";
export const metadata = buildMetadata({ title: "CGPA Calculator and Target GPA Planner", description: "Calculate a weighted semester GPA, estimate a new CGPA, plan a target and work out a required final exam score.", path: "/tools/cgpa-calculator" });
export default function CgpaPage() { return <ToolShell title="GPA & CGPA Planner" description="Run the standard 4.0 calculations, then check your institution's own grading rules before treating the result as official."><CgpaTool /></ToolShell>; }

