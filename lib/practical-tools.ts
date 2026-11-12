// TodayAI's own practical utilities (calculators, timers, counters).
// These are not AI products; the AI software directory lives in lib/ai-tools.ts.
// Shared by /tools, /explore and the homepage so the list cannot drift.

export type PracticalTool = { title: string; href: string; description: string };
export type PracticalToolGroup = { name: string; items: PracticalTool[] };

export const PRACTICAL_TOOL_GROUPS: PracticalToolGroup[] = [
  { name: "Money", items: [
    { title: "Student Budget Calculator", href: "/tools/student-budget-calculator", description: "See what is actually left each month." },
    { title: "Bill Splitter", href: "/tools/bill-splitter", description: "Split a shared meal, trip or expense." },
    { title: "Percentage Calculator", href: "/tools/percentage-calculator", description: "Work out discounts, increases and everyday percentages." },
  ] },
  { name: "Study", items: [
    { title: "GPA & CGPA Planner", href: "/tools/cgpa-calculator", description: "Plan grades and final exam scores." },
    { title: "Attendance Calculator", href: "/tools/attendance-calculator", description: "Check attendance against your own target." },
    { title: "Word & Character Counter", href: "/tools/word-counter", description: "Count words, characters and reading time locally." },
    { title: "Focus Timer", href: "/tools/focus-timer", description: "Work in one calm, focused session." },
  ] },
  { name: "Travel & dates", items: [
    { title: "Trip Budget Planner", href: "/tools/trip-budget-calculator", description: "Add real trip costs before booking." },
    { title: "Date Difference Calculator", href: "/tools/date-calculator", description: "Count days between plans and deadlines." },
  ] },
  { name: "Relationships", items: [
    { title: "Compatibility Check", href: "/tools/compatibility-check", description: "Compare everyday styles with someone you know." },
  ] },
];

export const PRACTICAL_TOOLS: PracticalTool[] = PRACTICAL_TOOL_GROUPS.flatMap((group) => group.items);
