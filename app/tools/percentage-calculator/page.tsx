import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import EverydayTool from "@/components/tools/EverydayTool";
export const metadata = buildMetadata({ title: "Percentage Calculator", description: "Work out discounts, percentages, increases and decreases in one place.", path: "/tools/percentage-calculator" });
export default function Page() { return <ToolShell title="Percentage Calculator" description="A practical percentage tool for money, shopping, study and everyday decisions."><EverydayTool kind="percentage" /></ToolShell>; }

