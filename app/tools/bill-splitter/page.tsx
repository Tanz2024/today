import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import EverydayTool from "@/components/tools/EverydayTool";
export const metadata = buildMetadata({ title: "Bill Splitter", description: "Split a meal, trip or shared expense without making the maths awkward.", path: "/tools/bill-splitter" });
export default function Page() { return <ToolShell title="Bill Splitter" description="Split a bill with friends, roommates or a travel group. Add optional tip and service charges; the calculation stays on this device."><EverydayTool kind="bill" /></ToolShell>; }

