import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import StudentBudgetTool from "@/components/tools/StudentBudgetTool";
export const metadata = buildMetadata({ title: "Student Budget Calculator Malaysia", description: "Plan a monthly student budget in MYR using your take-home income, expenses and savings goal.", path: "/tools/student-budget-calculator" });
export default function StudentBudgetPage() { return <ToolShell title="Student Budget Calculator" description="Put in your real take-home income and monthly costs to see what is left — without judging the way you spend."><StudentBudgetTool /></ToolShell>; }

