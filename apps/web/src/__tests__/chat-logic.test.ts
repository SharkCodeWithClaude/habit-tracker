import { describe, it, expect } from "vitest";
import { generateAssistantResponse, extractProposalsFromText } from "../lib/chat";
import type { Habit, ProposalsData } from "@/otter-ds/lib/types";

const HABITS: Habit[] = [
  { id: "h1", name: "Workout", emoji: "🏃", kind: "binary", aliases: ["workout", "gym", "exercise"] },
  { id: "h2", name: "Read", emoji: "📖", kind: "session", aliases: ["read", "reading"] },
  { id: "h3", name: "Meditate", emoji: "🧘", kind: "binary", aliases: ["meditate", "meditation"] },
];

describe("generateAssistantResponse", () => {
  it("returns empty state message when no proposals detected", () => {
    const proposals: ProposalsData = { ticks: {}, newHabits: [] };
    const response = generateAssistantResponse("had a normal day", proposals, HABITS);
    expect(response).toContain("Got it");
    expect(typeof response).toBe("string");
    expect(response.length).toBeGreaterThan(0);
  });

  it("mentions detected habits when ticks are found", () => {
    const proposals: ProposalsData = {
      ticks: { h1: { confidence: 0.8, evidence: "went to the gym" } },
      newHabits: [],
    };
    const response = generateAssistantResponse("went to the gym today", proposals, HABITS);
    expect(response).toContain("Workout");
  });

  it("mentions multiple detected habits", () => {
    const proposals: ProposalsData = {
      ticks: {
        h1: { confidence: 0.8, evidence: "gym" },
        h3: { confidence: 0.7, evidence: "meditated" },
      },
      newHabits: [],
    };
    const response = generateAssistantResponse("gym and meditated", proposals, HABITS);
    expect(response).toContain("Workout");
    expect(response).toContain("Meditate");
  });

  it("mentions new habit suggestions", () => {
    const proposals: ProposalsData = {
      ticks: {},
      newHabits: [{ name: "Walk", emoji: "🚶", kind: "binary", confidence: 0.8 }],
    };
    const response = generateAssistantResponse("went for a long walk", proposals, HABITS);
    expect(response).toContain("Walk");
  });

  it("combines tick and new habit mentions", () => {
    const proposals: ProposalsData = {
      ticks: { h1: { confidence: 0.8 } },
      newHabits: [{ name: "Cook", emoji: "🍳", kind: "binary", confidence: 0.75 }],
    };
    const response = generateAssistantResponse("worked out and cooked dinner", proposals, HABITS);
    expect(response).toContain("Workout");
    expect(response).toContain("Cook");
  });
});

describe("extractProposalsFromText", () => {
  it("uses localInfer to extract proposals from user text", () => {
    const result = extractProposalsFromText("went to the gym today", HABITS);
    expect(result.ticks).toHaveProperty("h1");
    expect(Object.keys(result.ticks).length).toBeGreaterThan(0);
  });

  it("returns empty proposals for unrelated text", () => {
    const result = extractProposalsFromText("had lunch with friends", HABITS);
    expect(Object.keys(result.ticks)).toHaveLength(0);
  });

  it("detects multiple habits", () => {
    const result = extractProposalsFromText("went to the gym and did some reading", HABITS);
    expect(result.ticks).toHaveProperty("h1");
    expect(result.ticks).toHaveProperty("h2");
  });

  it("does not detect negated habits", () => {
    const result = extractProposalsFromText("didn't go to the gym today", HABITS);
    expect(result.ticks).not.toHaveProperty("h1");
  });

  it("returns empty for empty input", () => {
    const result = extractProposalsFromText("", HABITS);
    expect(Object.keys(result.ticks)).toHaveLength(0);
    expect(result.newHabits).toHaveLength(0);
  });

  it("detects new habit suggestions", () => {
    const habitsNoWalk = HABITS.filter((h) => h.name !== "Walk");
    const result = extractProposalsFromText("went for a walk this morning", habitsNoWalk);
    expect(result.newHabits.length).toBeGreaterThan(0);
    expect(result.newHabits[0].name).toBe("Walk");
  });
});
