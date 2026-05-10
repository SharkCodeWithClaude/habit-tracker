export type HabitKind = "binary" | "session";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  kind: HabitKind;
  aliases?: string[];
}

/** logs[`${habitId}|${dateKey}`] = boolean (binary) | number (session count) */
export type LogMap = Record<string, boolean | number>;

export interface ProposalTick {
  confidence: number;
  evidence?: string;
  sessions?: number;
}

export interface ProposalNewHabit {
  name: string;
  emoji?: string;
  kind?: HabitKind;
  confidence: number;
  reason?: string;
}

export interface Proposals {
  ticks: Record<string, ProposalTick>;
  newHabits: ProposalNewHabit[];
}

/** Optional global Claude bridge — defined by the host app if available */
declare global {
  interface Window {
    claude?: {
      complete: (prompt: string | { messages: { role: string; content: string }[] }) => Promise<string>;
    };
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}
