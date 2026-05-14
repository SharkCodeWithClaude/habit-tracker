import type { Habit, ProposalsData } from "./types";

const NEG_PHRASES = ["didn't", "did not", "no ", "skipped", "forgot", "missed", "couldn't", "wasn't able"];

const NEW_HABIT_CANDIDATES: { rx: RegExp; name: string; emoji: string }[] = [
  { rx: /\b(walk(?:ed)?|stroll(?:ed)?)\b/, name: "Walk", emoji: "🚶" },
  { rx: /\b(stretch(?:ed)?|stretching|yoga)\b/, name: "Stretch", emoji: "🤸" },
  { rx: /\b(cooked|made dinner|meal prep)\b/, name: "Cook at home", emoji: "🍳" },
  { rx: /\b(called|phoned|spoke to)\s+(mom|dad|family|parents?)\b/, name: "Call family", emoji: "📞" },
  { rx: /\b(slept|sleep|bedtime)\b/, name: "Sleep on time", emoji: "🛏️" },
  { rx: /\b(no sugar|skipped dessert|no sweets)\b/, name: "No sugar", emoji: "🚫" },
  { rx: /\b(coding|programmed|side project)\b/, name: "Side project", emoji: "💻" },
];

/** Local regex fallback — no network, no LLM. */
export const localInfer = (text: string, habits: Habit[]): ProposalsData => {
  if (!text || !text.trim()) return { ticks: {}, newHabits: [] };
  const t = text.toLowerCase();
  const ticks: ProposalsData["ticks"] = {};
  habits.forEach((h) => {
    const matched = (h.aliases || []).some((a) => t.includes(a));
    if (!matched) return;
    const negated = NEG_PHRASES.some((neg) => {
      const idx = t.indexOf(neg);
      if (idx === -1) return false;
      const win = t.slice(idx, idx + 50);
      return (h.aliases || []).some((a) => win.includes(a));
    });
    if (!negated) ticks[String(h.id)] = { confidence: 0.7, evidence: "" };
  });
  const newHabits: ProposalsData["newHabits"] = [];
  NEW_HABIT_CANDIDATES.forEach((c) => {
    if (c.rx.test(t)) {
      const already = habits.some((h) => h.name.toLowerCase() === c.name.toLowerCase());
      if (!already) newHabits.push({ name: c.name, emoji: c.emoji, kind: "binary", confidence: 0.75 });
    }
  });
  return { ticks, newHabits };
};

/** LLM-powered inference. Calls window.claude.complete if available. */
export const llmInfer = async (text: string, habits: Habit[]): Promise<ProposalsData> => {
  if (!text || !text.trim()) return { ticks: {}, newHabits: [] };
  if (typeof window === "undefined" || !window.claude?.complete) {
    return localInfer(text, habits);
  }
  const list = habits
    .map((h) => `${h.id}: ${h.name}${h.kind === "session" ? " (session-based)" : ""}`)
    .join("\n");
  const prompt = `You are reading a personal journal entry. The user tracks these habits:
${list}

Entry: """${text}"""

Return ONLY valid JSON of this shape (no prose, no markdown fences):
{
  "ticks": { "<habitId>": { "confidence": 0.0-1.0, "evidence": "short quote", "sessions": 1 } },
  "newHabits": [ { "name": "...", "emoji": "💡", "kind": "binary"|"session", "confidence": 0.0-1.0, "reason": "why this seems like a habit" } ]
}

Rules:
- Only include ticks for habits the user actually did. Negations ("didn't run") → exclude.
- "sessions": how many distinct sessions of this habit (default 1).
- Suggest at most 2 newHabits — only if the user mentions an activity that's clearly recurring/intentional and isn't already tracked. Don't suggest one-off events.`;

  try {
    const raw = await window.claude!.complete(prompt);
    const clean = raw.replace(/```json\s*|\s*```/g, "").trim();
    const parsed = JSON.parse(clean);
    return {
      ticks: parsed.ticks || {},
      newHabits: (parsed.newHabits || []).filter((h: any) => h.confidence > 0.5),
    };
  } catch {
    return localInfer(text, habits);
  }
};
