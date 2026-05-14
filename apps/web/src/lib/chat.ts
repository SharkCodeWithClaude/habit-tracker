import { localInfer } from "otter-ds/lib/infer";
import type { Habit, ProposalsData } from "otter-ds/lib/types";

export function extractProposalsFromText(
  text: string,
  habits: Habit[]
): ProposalsData {
  return localInfer(text, habits);
}

export function generateAssistantResponse(
  userText: string,
  proposals: ProposalsData,
  habits: Habit[]
): string {
  const tickIds = Object.keys(proposals.ticks || {});
  const newHabits = proposals.newHabits || [];

  if (tickIds.length === 0 && newHabits.length === 0) {
    return "Got it! I didn't spot any habits in that message. Keep telling me about your day and I'll pick them out.";
  }

  const parts: string[] = [];

  if (tickIds.length > 0) {
    const names = tickIds
      .map((id) => {
        const h = habits.find((h) => String(h.id) === String(id));
        return h ? `${h.emoji} ${h.name}` : null;
      })
      .filter(Boolean);
    if (names.length === 1) {
      parts.push(`I noticed you did ${names[0]}!`);
    } else {
      parts.push(`I spotted ${names.join(", ")} — nice work!`);
    }
  }

  if (newHabits.length > 0) {
    const nhNames = newHabits.map((nh) => `${nh.emoji || "💡"} ${nh.name}`);
    parts.push(
      `It sounds like "${nhNames.join(", ")}" could be ${newHabits.length === 1 ? "a new habit" : "new habits"} to track.`
    );
  }

  parts.push("Check the suggestions above to confirm.");

  return parts.join(" ");
}
