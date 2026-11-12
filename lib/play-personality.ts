export const SIGNS = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"] as const;
export type ZodiacSign = (typeof SIGNS)[number];
export type ArchetypeId = "connector" | "cozyCurator" | "spontaneousExplorer" | "balancedSwitcher";
export type QuizAnswer = { label: string; traits: readonly string[] };
export type PersonalityAxes = { planner: number; social: number; privacy: number };
export function scoreAxes(answers: readonly QuizAnswer[]): PersonalityAxes {
  const axes: PersonalityAxes = { planner: 0, social: 0, privacy: 0 };
  for (const answer of answers) for (const trait of answer.traits) {
    if (trait === "planner") axes.planner += 2;
    if (["spontaneous", "wanderer", "nightOwl"].includes(trait)) axes.planner -= 1;
    if (["connector", "mainCharacter", "nightOwl", "wanderer"].includes(trait)) axes.social += 1;
    if (["homebase", "independent", "observer"].includes(trait)) axes.social -= 1;
    if (["observer", "independent"].includes(trait)) axes.privacy += 1;
    if (["connector", "mainCharacter"].includes(trait)) axes.privacy -= 1;
  }
  return axes;
}
export function reactionFor(traits: readonly string[]) {
  if (traits.includes("planner")) return "planner behaviour";
  if (traits.includes("spontaneous")) return "FOR THE PLOT +1";
  if (traits.includes("mainCharacter")) return "okay... main character noted";
  if (traits.includes("observer") || traits.includes("independent")) return "that was suspiciously considered";
  if (traits.includes("connector")) return "your social battery is confusing us";
  return "interesting choice.";
}

export const ARCHETYPES: Record<ArchetypeId, { title: string; description: string; weights: Record<string, number> }> = {
  connector: { title: "THE CONNECTOR", description: "People, conversations and shared experiences tend to win your vote.", weights: { connector: 3, nightOwl: 1, mainCharacter: 1 } },
  cozyCurator: { title: "THE COZY CURATOR", description: "You like comfortable, intentional plans with a small circle you genuinely trust.", weights: { homebase: 3, observer: 2, planner: 1 } },
  spontaneousExplorer: { title: "THE SPONTANEOUS EXPLORER", description: "Novelty, movement and a last-minute plot twist usually have your attention.", weights: { wanderer: 3, spontaneous: 2, softAdventure: 1, nightOwl: 1 } },
  balancedSwitcher: { title: "THE BALANCED SWITCHER", description: "You choose based on the mood, the people and whether the timing feels right.", weights: { planner: 2, observer: 1, softAdventure: 1, mainCharacter: 1 } },
};

export const ZODIAC_TWISTS: Record<ZodiacSign, string> = {
  Aries: "You may be the one turning a quiet plan into a story before the night is over.", Taurus: "You will probably choose the plan with the best atmosphere and the comfiest landing.", Gemini: "You may pick whichever option gives you the best story to tell tomorrow.", Cancer: "You might make the plan feel warmer simply by bringing the right people into it.", Leo: "You may be ready for a little main-character energy, especially if the playlist is good.", Virgo: "You could be quietly improving the plan while everyone else is still deciding.", Libra: "You may find the sweet spot between a good time and a peaceful exit.", Scorpio: "You might choose the option that feels low-key now but becomes unforgettable later.", Sagittarius: "You may be one yes away from making the whole plan more adventurous.", Capricorn: "You could enjoy the fun even more once the practical details are handled.", Aquarius: "You may choose the unexpected option simply because it makes the day more interesting.", Pisces: "You might follow the mood and find a little magic in the plan that feels right.",
};

export function composeResult(answers: readonly QuizAnswer[], sign?: ZodiacSign | null) {
  const scores = Object.fromEntries(Object.keys(ARCHETYPES).map((id) => [id, 0])) as Record<ArchetypeId, number>;
  answers.flatMap((answer) => answer.traits).forEach((trait) => Object.entries(ARCHETYPES).forEach(([id, archetype]) => { scores[id as ArchetypeId] += archetype.weights[trait] ?? 0; }));
  const winner = (Object.keys(ARCHETYPES) as ArchetypeId[]).reduce((best, id) => scores[id] > scores[best] ? id : best, "balancedSwitcher");
  const archetype = ARCHETYPES[winner];
  const totalScore = Object.values(scores).reduce((sum, score) => sum + score, 0);
  const matchPercent = totalScore ? Math.round((scores[winner] / totalScore) * 100) : 50;
  const specific = winner === "spontaneousExplorer" ? "THE FRIEND WHO SAYS ‘I’M DOWN’ BEFORE ASKING WHERE" : winner === "cozyCurator" ? "THE ‘LET ME CHECK FIRST’ FRIEND" : winner === "connector" ? "THE ‘JUST SEND THE LOCATION’ FRIEND" : "THE PERSON WHO SOMEHOW ENDS UP ORGANISING EVERYTHING";
  return { id: winner, title: specific, description: archetype.description, sign: sign ?? null, zodiacText: sign ? ZODIAC_TWISTS[sign] : null, choices: answers.map((answer) => answer.label), matchPercent, shareText: `${specific} — ${archetype.description} Just for fun. · TodayAI` };
}
