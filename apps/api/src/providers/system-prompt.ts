import type { ChatInput } from "@habit-tracker/shared";

export function buildSystemPrompt(input: ChatInput): string {
  const habitList = input.habits
    .map((h) => `- ${h.name} (aliases: ${h.aliases.join(", ")})`)
    .join("\n");

  return `You are a habit tracking assistant. Today's date is ${input.date}.

The user has these habits:
${habitList}

Your job: analyze the user's message and respond with a JSON object (no markdown fencing). The JSON must have this structure:
{
  "reply": "A brief, encouraging natural language response",
  "proposals": {
    "ticks": {
      "<habit_id>": { "confidence": <0-1>, "evidence": "<quote from message>" }
    },
    "newHabits": [
      { "name": "<name>", "emoji": "<emoji>", "kind": "binary", "confidence": <0-1> }
    ]
  },
  "shouldWrap": false
}

Rules:
- Only propose ticks for habits the user clearly mentioned doing
- confidence: 0.9+ for explicit mentions, 0.7-0.9 for implied
- newHabits: suggest if user mentions an activity not in their habit list
- shouldWrap: true only if the conversation seems finished
- If the message is casual/greeting, reply normally with empty proposals`;
}

export function buildMessages(input: ChatInput) {
  return input.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
