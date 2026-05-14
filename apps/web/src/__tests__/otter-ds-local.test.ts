import { describe, it, expect } from "vitest";

describe("otter-ds local imports (not workspace package)", () => {
  it("resolves component exports from @/otter-ds", async () => {
    const mod = await import("@/otter-ds/components");
    expect(mod.Icon).toBeDefined();
    expect(mod.Sidebar).toBeDefined();
    expect(mod.DateStrip).toBeDefined();
    expect(mod.Journal).toBeDefined();
    expect(mod.Proposals).toBeDefined();
    expect(mod.Habits).toBeDefined();
    expect(mod.Chat).toBeDefined();
    expect(mod.InlineChecklist).toBeDefined();
  });

  it("resolves helpers from @/otter-ds/lib/helpers", async () => {
    const { dateKey } = await import("@/otter-ds/lib/helpers");
    expect(typeof dateKey).toBe("function");
    const key = dateKey(new Date(2026, 0, 15));
    expect(key).toBe("2026-01-15");
  });

  it("resolves localInfer from @/otter-ds/lib/infer", async () => {
    const { localInfer } = await import("@/otter-ds/lib/infer");
    expect(typeof localInfer).toBe("function");
  });

  it("resolves types from @/otter-ds/lib/types", async () => {
    const types = await import("@/otter-ds/lib/types");
    expect(types).toBeDefined();
  });

  it("resolves individual component deep imports", async () => {
    const { Chat } = await import("@/otter-ds/components/Chat");
    expect(Chat).toBeDefined();
    expect(typeof Chat).toBe("function");

    const { Sidebar } = await import("@/otter-ds/components/Sidebar");
    expect(Sidebar).toBeDefined();

    const { default: Icon } = await import("@/otter-ds/components/Icon");
    expect(Icon).toBeDefined();
  });

  it("Habit type uses string id", async () => {
    const { localInfer } = await import("@/otter-ds/lib/infer");
    const habits = [
      { id: "abc-123", name: "Run", emoji: "🏃", kind: "binary" as const, aliases: ["run"] },
    ];
    const result = localInfer("went for a run", habits);
    expect(result.ticks).toHaveProperty("abc-123");
  });

  it("CSS files are importable from @/otter-ds/styles", async () => {
    await expect(import("@/otter-ds/styles/tokens.css")).resolves.not.toThrow();
    await expect(import("@/otter-ds/styles/globals.css")).resolves.not.toThrow();
    await expect(import("@/otter-ds/styles/components.css")).resolves.not.toThrow();
  });
});
