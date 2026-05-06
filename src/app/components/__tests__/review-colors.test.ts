import { describe, it, expect } from "vitest";
import { habitColor, REVIEW_FILL } from "../../habit-colors";

describe("Weekly review per-habit colors", () => {
  it("uses a single dark fill color for review pips and checkmarks", () => {
    expect(REVIEW_FILL).toBe("var(--ink)");
  });

  it("review fill color differs from per-habit legend colors", () => {
    for (let id = 1; id <= 15; id++) {
      expect(REVIEW_FILL).not.toBe(habitColor(id));
    }
  });

  it("legend dots still use per-habit colors from the palette", () => {
    expect(habitColor(1)).toBe("#e06c75");
    expect(habitColor(2)).toBe("#61afef");
    expect(habitColor(3)).toBe("#98c379");
  });
});
