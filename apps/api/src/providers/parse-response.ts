import type { ChatOutput, Proposals } from "@habit-tracker/shared";

const EMPTY_PROPOSALS: Proposals = { ticks: {}, newHabits: [] };

export function parseStructuredResponse(
  text: string,
  tokenCount: number
): ChatOutput {
  try {
    const parsed = JSON.parse(text);
    return {
      reply: parsed.reply ?? "",
      proposals: {
        ticks: parsed.proposals?.ticks ?? {},
        newHabits: parsed.proposals?.newHabits ?? [],
      },
      tokenCount,
      shouldWrap: parsed.shouldWrap ?? false,
    };
  } catch {
    return {
      reply: text,
      proposals: EMPTY_PROPOSALS,
      tokenCount,
      shouldWrap: false,
    };
  }
}
