import { buildMetadata } from "@/lib/seo";
import ToolShell from "@/components/tools/ToolShell";
import TripBudgetTool from "@/components/tools/TripBudgetTool";
export const metadata = buildMetadata({ title: "Trip Budget Calculator", description: "Plan the total cost of a trip from your own transport, accommodation, food and activity numbers.", path: "/tools/trip-budget-calculator" });
export default function TripBudgetPage() { return <ToolShell title="Trip Budget Planner" description="Add the costs you already know before you book anything. This is a personal estimate, not a live travel-price feed."><TripBudgetTool /></ToolShell>; }

