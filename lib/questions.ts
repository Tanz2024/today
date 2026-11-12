import questions from "@/content/questions.json";
export type Question = (typeof questions)[number];
export function getQuestions() { return questions; }
export function getQuestion(slug: string) { return questions.find((question) => question.slug === slug); }
