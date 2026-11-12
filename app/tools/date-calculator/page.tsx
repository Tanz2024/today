import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import EverydayTool from "@/components/tools/EverydayTool";
export const metadata = buildMetadata({ title: "Date Difference Calculator", description: "Find the number of days between two dates for trips, deadlines and plans.", path: "/tools/date-calculator" });
export default function Page() { return <ToolShell title="Date Difference Calculator" description="One small date tool for the moments when counting days in your head gets weird."><EverydayTool kind="date" /></ToolShell>; }

