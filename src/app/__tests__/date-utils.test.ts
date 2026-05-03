import { describe, it, expect } from "vitest";
import { getToday } from "../date-utils";

describe("getToday", () => {
  it("returns a YYYY-MM-DD formatted string", () => {
    const today = getToday();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("matches the current local date", () => {
    const today = getToday();
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(today).toBe(expected);
  });

  it("zero-pads single-digit months and days", () => {
    const today = getToday();
    const [, month, day] = today.split("-");
    expect(month).toHaveLength(2);
    expect(day).toHaveLength(2);
  });
});
