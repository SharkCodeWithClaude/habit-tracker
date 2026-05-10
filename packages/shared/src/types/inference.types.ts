export interface ChatInput {
  messages: { role: "user" | "assistant"; content: string }[];
  habits: { id: string; name: string; aliases: string[] }[];
  date: string;
}

export interface ChatOutput {
  reply: string;
  proposals: Proposals;
  tokenCount: number;
  shouldWrap: boolean;
}

export interface Proposals {
  ticks: Record<
    string,
    { confidence: number; evidence?: string; sessions?: number }
  >;
  newHabits: {
    name: string;
    emoji?: string;
    kind?: string;
    confidence: number;
    reason?: string;
  }[];
}
