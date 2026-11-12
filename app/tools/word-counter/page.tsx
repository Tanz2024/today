import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import EverydayTool from "@/components/tools/EverydayTool";
export const metadata = buildMetadata({ title: "Word & Character Counter", description: "Count words, characters, sentences and estimated reading time locally.", path: "/tools/word-counter" });
export default function Page() { return <ToolShell title="Word & Character Counter" description="Useful for assignments, captions and drafts. Your text never leaves this device and is not stored."><EverydayTool kind="words" /></ToolShell>; }

