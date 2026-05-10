import type { ChatInput, ChatOutput, Proposals } from "@habit-tracker/shared";
import type { InferenceProvider } from "./inference.provider.js";

const NEG_PHRASES = [
  "didn't",
  "did not",
  "no ",
  "skipped",
  "forgot",
  "missed",
  "couldn't",
  "wasn't able",
];

const NEW_HABIT_CANDIDATES: { rx: RegExp; name: string; emoji: string }[] = [
  { rx: /\b(walk(?:ed)?|stroll(?:ed)?)\b/, name: "Walk", emoji: "🚶" },
  { rx: /\b(stretch(?:ed)?|stretching|yoga)\b/, name: "Stretch", emoji: "🤸" },
  { rx: /\b(cooked|made dinner|meal prep)\b/, name: "Cook at home", emoji: "🍳" },
  {
    rx: /\b(called|phoned|spoke to)\s+(mom|dad|family|parents?)\b/,
    name: "Call family",
    emoji: "📞",
  },
  { rx: /\b(slept|sleep|bedtime)\b/, name: "Sleep on time", emoji: "🛏️" },
  { rx: /\b(no sugar|skipped dessert|no sweets)\b/, name: "No sugar", emoji: "🚫" },
  {
    rx: /\b(coding|programmed|side project)\b/,
    name: "Side project",
    emoji: "💻",
  },
];

export class LocalProvider implements InferenceProvider {
  async chat(input: ChatInput): Promise<ChatOutput> {
    const lastUserMessage = [...input.messages]
      .reverse()
      .find((m) => m.role === "user");
    const text = lastUserMessage?.content ?? "";

    const proposals = this.infer(text, input.habits);

    return {
      reply: "",
      proposals,
      tokenCount: 0,
      shouldWrap: false,
    };
  }

  private infer(
    text: string,
    habits: ChatInput["habits"]
  ): Proposals {
    if (!text || !text.trim()) return { ticks: {}, newHabits: [] };

    const t = text.toLowerCase();
    const ticks: Proposals["ticks"] = {};

    for (const habit of habits) {
      const aliases = habit.aliases || [];
      const matchedAlias = aliases.find((a) => t.includes(a.toLowerCase()));
      if (!matchedAlias) continue;

      const aliasLower = matchedAlias.toLowerCase();
      const aliasPos = t.indexOf(aliasLower);
      const negated = NEG_PHRASES.some((neg) => {
        const negIdx = t.lastIndexOf(neg, aliasPos);
        if (negIdx === -1) return false;
        const between = t.slice(negIdx, aliasPos);
        if (/,\s| but | however /.test(between)) return false;
        return aliasPos - negIdx <= 30;
      });

      if (!negated) {
        ticks[habit.id] = { confidence: 0.7, evidence: "" };
      }
    }

    const newHabits: Proposals["newHabits"] = [];
    for (const candidate of NEW_HABIT_CANDIDATES) {
      if (!candidate.rx.test(t)) continue;
      const alreadyTracked = habits.some(
        (h) => h.name.toLowerCase() === candidate.name.toLowerCase()
      );
      if (!alreadyTracked) {
        newHabits.push({
          name: candidate.name,
          emoji: candidate.emoji,
          kind: "binary",
          confidence: 0.75,
        });
      }
    }

    return { ticks, newHabits };
  }
}
