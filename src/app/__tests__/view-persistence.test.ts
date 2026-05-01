/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { getLastView, saveLastView, viewToPath, pathToView } from "../view-persistence";

const STORAGE_KEY = "habit-tracker-last-view";

describe("view persistence logic", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to today when nothing saved", () => {
    expect(getLastView()).toBe("today");
  });

  it("returns calendar when saved as calendar", () => {
    saveLastView("calendar");
    expect(getLastView()).toBe("calendar");
  });

  it("returns today when saved as today", () => {
    saveLastView("today");
    expect(getLastView()).toBe("today");
  });

  it("returns today for invalid saved value", () => {
    localStorage.setItem(STORAGE_KEY, "garbage");
    expect(getLastView()).toBe("today");
  });

  it("returns review when saved as review", () => {
    saveLastView("review");
    expect(getLastView()).toBe("review");
  });

  it("viewToPath maps correctly", () => {
    expect(viewToPath("today")).toBe("/");
    expect(viewToPath("calendar")).toBe("/calendar");
    expect(viewToPath("review")).toBe("/review");
  });

  it("pathToView maps / to today", () => {
    expect(pathToView("/")).toBe("today");
  });

  it("pathToView maps /calendar to calendar", () => {
    expect(pathToView("/calendar")).toBe("calendar");
    expect(pathToView("/calendar?ym=2026-05")).toBe("calendar");
  });

  it("pathToView maps /review to review", () => {
    expect(pathToView("/review")).toBe("review");
  });

  it("pathToView maps unknown paths to today", () => {
    expect(pathToView("/manage")).toBe("today");
    expect(pathToView("/day/2026-05-01")).toBe("today");
  });
});
