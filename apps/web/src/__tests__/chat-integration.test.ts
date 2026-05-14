import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractProposalsFromText, generateAssistantResponse } from "../lib/chat";
import type { Habit, ProposalsData } from "otter-ds/lib/types";
import type { ChatMessage } from "otter-ds/components/Chat";

const HABITS: Habit[] = [
  { id: "h1", name: "Workout", emoji: "🏃", kind: "binary", aliases: ["workout", "gym", "exercise", "ran"] },
  { id: "h2", name: "Read", emoji: "📖", kind: "session", aliases: ["read", "reading"] },
  { id: "h3", name: "Meditate", emoji: "🧘", kind: "binary", aliases: ["meditate", "meditation"] },
];

describe("Chat integration flow", () => {
  it("full message flow: user text → proposals → assistant response", () => {
    const userText = "went to the gym and did some reading today";

    const proposals = extractProposalsFromText(userText, HABITS);
    expect(proposals.ticks).toHaveProperty("h1");
    expect(proposals.ticks).toHaveProperty("h2");

    const response = generateAssistantResponse(userText, proposals, HABITS);
    expect(response).toContain("Workout");
    expect(response).toContain("Read");
    expect(response).toContain("confirm");
  });

  it("message flow with no habits detected returns helpful prompt", () => {
    const userText = "just a quiet day at home";
    const proposals = extractProposalsFromText(userText, HABITS);
    expect(Object.keys(proposals.ticks)).toHaveLength(0);

    const response = generateAssistantResponse(userText, proposals, HABITS);
    expect(response).toContain("Got it");
  });

  it("message flow with new habit suggestion", () => {
    const userText = "went for a walk in the park and did my workout";
    const proposals = extractProposalsFromText(userText, HABITS);
    expect(proposals.ticks).toHaveProperty("h1");
    expect(proposals.newHabits.length).toBeGreaterThan(0);
    expect(proposals.newHabits[0].name).toBe("Walk");

    const response = generateAssistantResponse(userText, proposals, HABITS);
    expect(response).toContain("Workout");
    expect(response).toContain("Walk");
  });

  it("confirming a tick proposal updates logs correctly for binary habit", () => {
    const proposals = extractProposalsFromText("went to the gym", HABITS);
    const tickInfo = proposals.ticks["h1"];
    expect(tickInfo).toBeDefined();
    expect(tickInfo.confidence).toBeGreaterThan(0);

    const habit = HABITS.find((h) => h.id === "h1")!;
    expect(habit.kind).toBe("binary");
  });

  it("confirming a tick proposal for session habit includes session count", () => {
    const proposals = extractProposalsFromText("did some reading", HABITS);
    const tickInfo = proposals.ticks["h2"];
    expect(tickInfo).toBeDefined();

    const habit = HABITS.find((h) => h.id === "h2")!;
    expect(habit.kind).toBe("session");
  });

  it("dismissing a proposal removes it from proposals state", () => {
    const proposals: ProposalsData = {
      ticks: {
        h1: { confidence: 0.8, evidence: "gym" },
        h2: { confidence: 0.7 },
      },
      newHabits: [{ name: "Walk", emoji: "🚶", kind: "binary", confidence: 0.75 }],
    };

    const { h1: _, ...remainingTicks } = proposals.ticks;
    const afterDismissTick = { ...proposals, ticks: remainingTicks };
    expect(afterDismissTick.ticks).not.toHaveProperty("h1");
    expect(afterDismissTick.ticks).toHaveProperty("h2");

    const afterDismissNew = {
      ...proposals,
      newHabits: proposals.newHabits.filter((_, i) => i !== 0),
    };
    expect(afterDismissNew.newHabits).toHaveLength(0);
  });

  it("wrap session clears state for fresh conversation", () => {
    const freshMessages: ChatMessage[] = [];
    const freshProposals: ProposalsData = { ticks: {}, newHabits: [] };
    expect(freshMessages).toHaveLength(0);
    expect(Object.keys(freshProposals.ticks)).toHaveLength(0);
    expect(freshProposals.newHabits).toHaveLength(0);
  });

  it("negation prevents habit detection in nearby context", () => {
    const userText = "didn't meditate today";
    const proposals = extractProposalsFromText(userText, HABITS);
    expect(proposals.ticks).not.toHaveProperty("h3");
  });

  it("positive habit in separate sentence from negation is detected", () => {
    const userText = "went to the gym. I didn't meditate though";
    const proposals = extractProposalsFromText(userText, HABITS);
    expect(proposals.ticks).toHaveProperty("h1");
    expect(proposals.ticks).not.toHaveProperty("h3");
  });

  it("multiple messages in sequence accumulate correctly", () => {
    const msg1 = "went to the gym today";
    const msg2 = "also did some reading before bed";

    const p1 = extractProposalsFromText(msg1, HABITS);
    expect(p1.ticks).toHaveProperty("h1");

    const p2 = extractProposalsFromText(msg2, HABITS);
    expect(p2.ticks).toHaveProperty("h2");

    const combined: ProposalsData = {
      ticks: { ...p1.ticks, ...p2.ticks },
      newHabits: [...p1.newHabits, ...p2.newHabits],
    };
    expect(combined.ticks).toHaveProperty("h1");
    expect(combined.ticks).toHaveProperty("h2");
  });
});
