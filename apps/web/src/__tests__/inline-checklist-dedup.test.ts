// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { act } from "react";

import { InlineChecklist } from "@/otter-ds/components";

let container: HTMLDivElement;
let root: ReactDOM.Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  container.remove();
});

function render(el: React.ReactElement) {
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(el);
  });
}

function getInput(): HTMLInputElement | null {
  return container.querySelector("input[data-testid='inline-habit-input']");
}

function fireInputChange(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, "value"
  )!.set!;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("InlineChecklist deduplication fix (issue #44)", () => {
  it("does not render created habits internally — delegates to parent", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const createdRows = container.querySelectorAll("[data-testid='inline-created-row']");
    expect(createdRows.length).toBe(0);
  });

  it("does not render any element with pre-checked state after creation", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const checkedElements = container.querySelectorAll(".otr-habit-check.on");
    expect(checkedElements.length).toBe(0);
  });

  it("still calls onCreateHabit and returns the habit to the parent", async () => {
    const habit = { id: "h1", name: "Meditate", emoji: "✨", kind: "binary" };
    const onCreate = vi.fn().mockResolvedValue(habit);
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onCreate).toHaveBeenCalledWith("Meditate");
  });

  it("remains a pure input after multiple creations — no internal item accumulation", async () => {
    let callCount = 0;
    const onCreate = vi.fn().mockImplementation(async (name: string) => {
      callCount++;
      return { id: `h${callCount}`, name, emoji: "✨", kind: "binary" };
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const input2 = getInput()!;
    await act(async () => {
      fireInputChange(input2, "Read");
      input2.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const createdRows = container.querySelectorAll("[data-testid='inline-created-row']");
    expect(createdRows.length).toBe(0);
    expect(onCreate).toHaveBeenCalledTimes(2);
  });
});
