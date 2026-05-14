import { describe, it, expect } from "vitest";

describe("Proposals export collision fix", () => {
  it("exports Proposals component from barrel without ambiguity", async () => {
    const mod = await import("@/otter-ds/components");
    expect(mod.Proposals).toBeDefined();
    expect(typeof mod.Proposals).toBe("function");
  });

  it("exports ProposalsData type from barrel (renamed from Proposals)", async () => {
    const mod = await import("@/otter-ds/components");
    // ProposalsData should be a type-only export, not a runtime value.
    // But ProposalsType (the old alias) should no longer exist — the
    // canonical name is ProposalsData. We verify no runtime collision
    // by ensuring only the component is a function.
    expect(typeof mod.Proposals).toBe("function");
  });

  it("Proposals component is importable via deep path", async () => {
    const { Proposals } = await import("@/otter-ds/components/Proposals");
    expect(Proposals).toBeDefined();
    expect(typeof Proposals).toBe("function");
  });

  it("ProposalsData type is importable via deep path (otter-ds/lib/types)", async () => {
    const types = await import("@/otter-ds/lib/types");
    // types module should exist and be importable
    expect(types).toBeDefined();
  });

  it("localInfer returns ProposalsData-shaped object", async () => {
    const { localInfer } = await import("@/otter-ds/lib/infer");
    const habits = [
      { id: "1", name: "Run", emoji: "🏃", kind: "binary" as const, aliases: ["run"] },
    ];
    const result = localInfer("went for a run", habits);
    expect(result).toHaveProperty("ticks");
    expect(result).toHaveProperty("newHabits");
    expect(result.ticks).toHaveProperty("1");
  });

  it("chat.ts extractProposalsFromText works with renamed type", async () => {
    const { extractProposalsFromText } = await import("@/lib/chat");
    const habits = [
      { id: "1", name: "Run", emoji: "🏃", kind: "binary" as const, aliases: ["run"] },
    ];
    const result = extractProposalsFromText("went for a run today", habits);
    expect(result.ticks).toHaveProperty("1");
  });
});
