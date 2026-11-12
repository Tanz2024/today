import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import FocusTimerTool from "@/components/tools/FocusTimerTool";
export const metadata = buildMetadata({ title: "Focus Timer", description: "A calm, simple focus timer for study sessions, work blocks and deliberate breaks.", path: "/tools/focus-timer" });
export default function Page() { return <ToolShell title="Focus Timer" description="One focused session, then a proper break. Your timer stays in this browser." tool="focus-timer" trackCalculation={false}><FocusTimerTool /></ToolShell>; }
