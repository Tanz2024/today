import Link from "next/link";
import Container from "@/components/ui/Container";
import ToolAnalytics from "./ToolAnalytics";
import CalculationTracker from "./CalculationTracker";
import type { ToolName } from "@/lib/tools/analytics";
import ToolGuide from "./ToolGuide";
export default function ToolShell({ title, description, tool, trackCalculation = true, children }: { title: string; description: string; tool?: ToolName; trackCalculation?: boolean; children: React.ReactNode }) {
  const resolvedTool: ToolName = tool ?? (title.startsWith("GPA") ? "cgpa" : title.startsWith("Trip") ? "trip-budget" : title.startsWith("Bill") ? "bill-splitter" : title.startsWith("Attendance") ? "attendance" : title.startsWith("Word") ? "word-counter" : title.startsWith("Date") ? "date-calculator" : title.startsWith("Percentage") ? "percentage-calculator" : "student-budget");
  return <><ToolAnalytics tool={resolvedTool} />{trackCalculation && <CalculationTracker tool={resolvedTool} />}<Container className="py-9 sm:py-14"><div className="mx-auto max-w-4xl"><nav aria-label="Breadcrumb" className="mb-7 text-xs text-muted"><Link href="/tools" className="hover:text-electric">Tools</Link><span aria-hidden="true"> / </span><span>{title}</span></nav><header className="max-w-2xl"><h1 className="font-heading text-4xl font-semibold leading-none tracking-[-.04em] sm:text-6xl">{title}</h1><p className="mt-4 text-base leading-7 text-muted">{description}</p></header><div className="mt-9">{children}</div><ToolGuide tool={resolvedTool} /></div></Container></>;
}
