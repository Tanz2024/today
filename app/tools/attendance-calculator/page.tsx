import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import EverydayTool from "@/components/tools/EverydayTool";
export const metadata = buildMetadata({ title: "Attendance Calculator", description: "Check your attendance percentage and see how many classes you can miss.", path: "/tools/attendance-calculator" });
export default function Page() { return <ToolShell title="Attendance Calculator" description="Use the attendance rule your institution actually gives you. This calculator does not assume a universal minimum."><EverydayTool kind="attendance" /></ToolShell>; }

