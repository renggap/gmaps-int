import type { Lead } from "../db/db.ts";

// ponytail: endpoint/model are compile-time constants; make env-configurable if provider churn grows
export const AI_MODEL = "cmc/deepseek/deepseek-v4-flash";
const AI_ENDPOINT = "https://router.clawgator.com/v1/chat/completions";

export type AiSuggestion = {
  summary: string;
  score: number;
  priority: "HOT" | "WARM" | "SKIP";
  reason: string;
};

type FetchLike = typeof fetch;

export function buildPrompt(lead: Lead): string {
  const pub = {
    name: lead.name,
    category: lead.category,
    address: lead.address,
    rating: lead.rating,
    review_count: lead.review_count,
    website: lead.website,
    phone: lead.phone,
  };
  return `You are a lead qualification assistant. Research this business using ONLY the public data below. Never invent details, contact info, revenue, or problems. If data is missing, say so.

Public data: ${JSON.stringify(pub)}

Score this lead 1-10 for fit (based on rating, review count, web presence) and label it HOT, WARM, or SKIP. Write a 1-2 sentence summary of what the business appears to be, and a one-line reason for the score.

Respond with ONLY valid JSON: {"summary": string, "score": number, "priority": "HOT"|"WARM"|"SKIP", "reason": string}`;
}

export function parseAiResponse(text: string): AiSuggestion {
  // strip possible markdown fences, grab first {...} block
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("AI response contains no JSON object");
  const obj = JSON.parse(m[0]);
  const score = Number(obj.score);
  const priority = String(obj.priority).toUpperCase();
  if (!Number.isInteger(score) || score < 1 || score > 10) {
    throw new Error(`AI returned invalid score: ${obj.score}`);
  }
  if (priority !== "HOT" && priority !== "WARM" && priority !== "SKIP") {
    throw new Error(`AI returned invalid priority: ${obj.priority}`);
  }
  return {
    summary: String(obj.summary ?? "").slice(0, 2000),
    score,
    priority,
    reason: String(obj.reason ?? "").slice(0, 1000),
  };
}

export async function aiResearch(
  lead: Lead,
  apiKey: string,
  fetchFn: FetchLike = fetch,
): Promise<AiSuggestion> {
  const res = await fetchFn(AI_ENDPOINT, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [{ role: "user", content: buildPrompt(lead) }],
    }),
  });
  if (!res.ok) {
    // ponytail: only {error:{message}} shape parsed; other providers keep raw text
    let msg = await res.text();
    try {
      msg = JSON.parse(msg)?.error?.message ?? msg;
    } catch { /* keep raw */ }
    throw new Error(`AI ${res.status}: ${String(msg).slice(0, 300)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("AI returned no content");
  }
  return parseAiResponse(content);
}
