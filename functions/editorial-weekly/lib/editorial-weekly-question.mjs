const blocked = /\b(suicide|self[- ]harm|murder|diagnos|prescription|lawsuit|defamation|racial|terrorist)\b/i;
export async function generateWeeklyQuestion({ trends = [] } = {}) {
  const key = process.env.OPENROUTER_API_KEY?.trim(); if (!key) return null;
  const model = process.env.OPENROUTER_MODEL?.trim() || "openrouter/free";
  const prompt = `Create one catchy, safe TodayAI Real Question for Gen Alpha and young adults in Southeast Asia. Return only JSON: {question,shortAnswer,topic}. Make the question under 140 characters and answer under 450 characters. Avoid medical, legal or dangerous advice. Trends: ${JSON.stringify(trends.slice(0, 6))}`;
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "HTTP-Referer": "https://brisastory.live", "X-Title": "TodayAI Weekly Question" }, body: JSON.stringify({ model, temperature: 0.7, max_tokens: 260, response_format: { type: "json_object" }, messages: [{ role: "user", content: prompt }] }) });
  if (!response.ok) return null;
  const content = (await response.json()).choices?.[0]?.message?.content; let value;
  try { value = JSON.parse(content); } catch { return null; }
  if (!value?.question || !value?.shortAnswer || blocked.test(`${value.question} ${value.shortAnswer}`)) return null;
  if (String(value.question).length > 140 || String(value.shortAnswer).length > 450) return null;
  return { question: String(value.question).trim(), shortAnswer: String(value.shortAnswer).trim(), topic: String(value.topic ?? "weekly question").trim(), reactions: ["love", "laugh", "wow", "relatable"] };
}
