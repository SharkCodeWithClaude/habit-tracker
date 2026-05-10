import { describe, it, expect } from "vitest";
import { LocalProvider } from "../src/providers/local.provider.js";
import type { ChatInput } from "@habit-tracker/shared";

function makeInput(
  text: string,
  habits: ChatInput["habits"] = []
): ChatInput {
  return {
    messages: [{ role: "user", content: text }],
    habits,
    date: "2026-05-10",
  };
}

const sampleHabits: ChatInput["habits"] = [
  { id: "h1", name: "Run", aliases: ["run", "ran", "running", "jog"] },
  { id: "h2", name: "Meditate", aliases: ["meditate", "meditation", "meditated"] },
  { id: "h3", name: "Read", aliases: ["read", "reading"] },
];

describe("LocalProvider", () => {
  const provider = new LocalProvider();

  describe("interface contract", () => {
    it("returns reply as empty string", async () => {
      const result = await provider.chat(makeInput("ran today", sampleHabits));
      expect(result.reply).toBe("");
    });

    it("returns shouldWrap as false", async () => {
      const result = await provider.chat(makeInput("ran today", sampleHabits));
      expect(result.shouldWrap).toBe(false);
    });

    it("returns tokenCount as 0", async () => {
      const result = await provider.chat(makeInput("ran today", sampleHabits));
      expect(result.tokenCount).toBe(0);
    });
  });

  describe("alias matching", () => {
    it("matches a single habit alias case-insensitively", async () => {
      const result = await provider.chat(makeInput("I RAN this morning", sampleHabits));
      expect(result.proposals.ticks).toHaveProperty("h1");
      expect(result.proposals.ticks["h1"].confidence).toBeGreaterThan(0);
    });

    it("matches multiple habits in one message", async () => {
      const result = await provider.chat(
        makeInput("ran 5km then meditated for 10 min", sampleHabits)
      );
      expect(result.proposals.ticks).toHaveProperty("h1");
      expect(result.proposals.ticks).toHaveProperty("h2");
    });

    it("does not match habits whose aliases are absent", async () => {
      const result = await provider.chat(makeInput("went swimming", sampleHabits));
      expect(Object.keys(result.proposals.ticks)).toHaveLength(0);
    });

    it("returns confidence 1.0 for exact alias match", async () => {
      const result = await provider.chat(makeInput("ran today", sampleHabits));
      expect(result.proposals.ticks["h1"].confidence).toBe(1.0);
    });
  });

  describe("negation detection", () => {
    it("excludes habits with 'didn\\'t' negation", async () => {
      const result = await provider.chat(
        makeInput("didn't run today", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h1");
    });

    it("excludes habits with 'skipped' negation", async () => {
      const result = await provider.chat(
        makeInput("skipped meditation this morning", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h2");
    });

    it("excludes habits with 'no' negation", async () => {
      const result = await provider.chat(
        makeInput("no run today, but I read a lot", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h1");
      expect(result.proposals.ticks).toHaveProperty("h3");
    });

    it("excludes habits with 'missed' negation", async () => {
      const result = await provider.chat(
        makeInput("missed my run but meditated", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h1");
      expect(result.proposals.ticks).toHaveProperty("h2");
    });

    it("excludes habits with 'forgot' negation", async () => {
      const result = await provider.chat(
        makeInput("forgot to meditate today", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h2");
    });

    it("only negates the habit near the negation phrase, not all habits", async () => {
      const result = await provider.chat(
        makeInput("didn't run today but I meditated and read", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h1");
      expect(result.proposals.ticks).toHaveProperty("h2");
      expect(result.proposals.ticks).toHaveProperty("h3");
    });
  });

  describe("new habit suggestions", () => {
    it("suggests new habits from predefined patterns", async () => {
      const result = await provider.chat(
        makeInput("went for a walk today", sampleHabits)
      );
      expect(result.proposals.newHabits.length).toBeGreaterThan(0);
      expect(result.proposals.newHabits[0].name).toBe("Walk");
    });

    it("does not suggest habits that already exist", async () => {
      const habitsWithWalk = [
        ...sampleHabits,
        { id: "h4", name: "Walk", aliases: ["walk", "walked"] },
      ];
      const result = await provider.chat(
        makeInput("went for a walk today", habitsWithWalk)
      );
      const walkSuggestion = result.proposals.newHabits.find(
        (h) => h.name === "Walk"
      );
      expect(walkSuggestion).toBeUndefined();
    });

    it("suggests stretch for yoga mentions", async () => {
      const result = await provider.chat(
        makeInput("did some yoga this morning", sampleHabits)
      );
      const suggestion = result.proposals.newHabits.find(
        (h) => h.name === "Stretch"
      );
      expect(suggestion).toBeDefined();
    });

    it("includes confidence and emoji for suggestions", async () => {
      const result = await provider.chat(
        makeInput("walked 2 miles", sampleHabits)
      );
      const walk = result.proposals.newHabits.find((h) => h.name === "Walk");
      expect(walk).toBeDefined();
      expect(walk!.confidence).toBeGreaterThan(0);
      expect(walk!.emoji).toBeDefined();
    });
  });

  describe("edge cases", () => {
    it("returns empty proposals for empty text", async () => {
      const result = await provider.chat(makeInput("", sampleHabits));
      expect(Object.keys(result.proposals.ticks)).toHaveLength(0);
      expect(result.proposals.newHabits).toHaveLength(0);
    });

    it("returns empty proposals for whitespace-only text", async () => {
      const result = await provider.chat(makeInput("   ", sampleHabits));
      expect(Object.keys(result.proposals.ticks)).toHaveLength(0);
      expect(result.proposals.newHabits).toHaveLength(0);
    });

    it("returns empty proposals when no habits provided", async () => {
      const result = await provider.chat(makeInput("ran today", []));
      expect(Object.keys(result.proposals.ticks)).toHaveLength(0);
    });

    it("handles habits with empty aliases array", async () => {
      const habits = [{ id: "h1", name: "Run", aliases: [] }];
      const result = await provider.chat(makeInput("ran today", habits));
      expect(Object.keys(result.proposals.ticks)).toHaveLength(0);
    });

    it("uses only the last user message for inference", async () => {
      const input: ChatInput = {
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "hi" },
          { role: "user", content: "I ran today" },
        ],
        habits: sampleHabits,
        date: "2026-05-10",
      };
      const result = await provider.chat(input);
      expect(result.proposals.ticks).toHaveProperty("h1");
    });

    it("handles multiple negation phrases correctly", async () => {
      const result = await provider.chat(
        makeInput("didn't run, skipped meditation, but I read", sampleHabits)
      );
      expect(result.proposals.ticks).not.toHaveProperty("h1");
      expect(result.proposals.ticks).not.toHaveProperty("h2");
      expect(result.proposals.ticks).toHaveProperty("h3");
    });
  });
});
