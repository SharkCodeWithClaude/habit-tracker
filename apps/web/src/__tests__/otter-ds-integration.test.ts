import { describe, it, expect } from "vitest";

describe("otter-ds package integration", () => {
  it("resolves component exports from the otter-ds package", async () => {
    const mod = await import("otter-ds/components");
    expect(mod.Icon).toBeDefined();
    expect(mod.Sidebar).toBeDefined();
    expect(mod.DateStrip).toBeDefined();
    expect(mod.Journal).toBeDefined();
    expect(mod.Proposals).toBeDefined();
    expect(mod.Habits).toBeDefined();
    expect(mod.Chat).toBeDefined();
  });

  it("resolves type-compatible Habit with string id from package", async () => {
    const { dateKey } = await import("otter-ds/lib/helpers");
    expect(typeof dateKey).toBe("function");
    const key = dateKey(new Date(2026, 0, 15));
    expect(key).toBe("2026-01-15");
  });

  it("resolves localInfer from package", async () => {
    const { localInfer } = await import("otter-ds/lib/infer");
    expect(typeof localInfer).toBe("function");
  });

  it("resolves CSS files without error", async () => {
    await expect(import("otter-ds/styles/tokens.css")).resolves.not.toThrow();
    await expect(import("otter-ds/styles/globals.css")).resolves.not.toThrow();
    await expect(import("otter-ds/styles/components.css")).resolves.not.toThrow();
  });

  it("Chat component is exported from the package", async () => {
    const { Chat } = await import("otter-ds/components/Chat");
    expect(Chat).toBeDefined();
    expect(typeof Chat).toBe("function");
  });

  it("Habit type uses string id (not number)", async () => {
    const { localInfer } = await import("otter-ds/lib/infer");
    const habits = [
      { id: "abc-123", name: "Run", emoji: "🏃", kind: "binary" as const, aliases: ["run"] },
    ];
    const result = localInfer("went for a run", habits);
    expect(result.ticks).toHaveProperty("abc-123");
  });
});
