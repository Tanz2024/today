export type MoneyBreakdown = Record<string, number>;

export function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function sum(values: number[]): number {
  return values.reduce((total, value) => total + nonNegative(value), 0);
}

export function budgetSummary(income: number, expenses: MoneyBreakdown, desiredSavings = 0, goal = 0, currentSavings = 0) {
  const monthlyIncome = nonNegative(income);
  const totalExpenses = sum(Object.values(expenses));
  const surplus = monthlyIncome - totalExpenses;
  const essential = sum([expenses.rent ?? 0, expenses.food ?? 0, expenses.transport ?? 0, expenses.study ?? 0, expenses.debt ?? 0, expenses.family ?? 0]);
  const flexible = sum([expenses.phone ?? 0, expenses.subscriptions ?? 0, expenses.social ?? 0, expenses.shopping ?? 0, expenses.other ?? 0]);
  const savings = nonNegative(desiredSavings);
  const monthsToGoal = goal > currentSavings && savings > 0 ? Math.ceil((goal - nonNegative(currentSavings)) / savings) : goal > 0 && goal <= currentSavings ? 0 : null;
  return {
    monthlyIncome, totalExpenses, surplus,
    essentialPercentage: monthlyIncome ? (essential / monthlyIncome) * 100 : 0,
    flexiblePercentage: monthlyIncome ? (flexible / monthlyIncome) * 100 : 0,
    savingsRate: monthlyIncome ? (savings / monthlyIncome) * 100 : 0,
    dailyAvailable: surplus > 0 ? surplus / 30 : 0,
    monthsToGoal,
  };
}

export type GradeRow = { credits: number; points: number };

export function weightedGpa(rows: GradeRow[]): number {
  const valid = rows.filter((row) => row.credits > 0 && row.points >= 0 && Number.isFinite(row.points));
  const credits = valid.reduce((total, row) => total + row.credits, 0);
  return credits ? valid.reduce((total, row) => total + row.credits * row.points, 0) / credits : 0;
}

export function cumulativeCgpa(existing: number, completedCredits: number, semesterGpa: number, semesterCredits: number): number {
  const totalCredits = completedCredits + semesterCredits;
  return totalCredits > 0 ? (existing * completedCredits + semesterGpa * semesterCredits) / totalCredits : 0;
}

export function targetGpa(current: number, completedCredits: number, target: number, remainingCredits: number, maxGpa = 4): { required: number; status: "reachable" | "maximum" | "impossible" } {
  if (remainingCredits <= 0) return { required: current >= target ? 0 : Infinity, status: current >= target ? "reachable" : "impossible" };
  const required = (target * (completedCredits + remainingCredits) - current * completedCredits) / remainingCredits;
  return { required, status: required <= 0 ? "reachable" : required <= maxGpa ? (required >= maxGpa ? "maximum" : "reachable") : "impossible" };
}

export function requiredExamScore(currentCoursePercent: number, examWeightPercent: number, desiredCoursePercent: number) {
  if (examWeightPercent <= 0) return { required: desiredCoursePercent <= currentCoursePercent ? 0 : Infinity, possible: desiredCoursePercent <= currentCoursePercent, highest: currentCoursePercent };
  const required = (desiredCoursePercent - currentCoursePercent * (1 - examWeightPercent / 100)) / (examWeightPercent / 100);
  const highest = currentCoursePercent * (1 - examWeightPercent / 100) + examWeightPercent;
  return { required, possible: required <= 100, highest };
}

export type TripInputs = { travelers: number; days: number; transport: number; accommodation: number; foodPerPersonPerDay: number; localTransportPerDay: number; activities: number; shopping: number; insurance: number; emergency: number; maximumBudget?: number };

export function tripSummary(input: TripInputs) {
  const travelers = Math.max(1, Math.floor(nonNegative(input.travelers)));
  const days = Math.max(1, Math.floor(nonNegative(input.days)));
  const categories = {
    transport: nonNegative(input.transport), accommodation: nonNegative(input.accommodation),
    food: nonNegative(input.foodPerPersonPerDay) * travelers * days,
    localTransport: nonNegative(input.localTransportPerDay) * days,
    activities: nonNegative(input.activities), shopping: nonNegative(input.shopping),
    insurance: nonNegative(input.insurance), emergency: nonNegative(input.emergency),
  };
  const total = sum(Object.values(categories));
  return { travelers, days, categories, total, perTraveler: total / travelers, perTravelerPerDay: total / travelers / days, remaining: input.maximumBudget === undefined ? null : input.maximumBudget - total };
}
