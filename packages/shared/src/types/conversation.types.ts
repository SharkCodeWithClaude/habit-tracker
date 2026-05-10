export interface Conversation {
  id: string;
  userId: string;
  date: string;
  startedAt: string;
  endedAt: string | null;
  tokenCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}
