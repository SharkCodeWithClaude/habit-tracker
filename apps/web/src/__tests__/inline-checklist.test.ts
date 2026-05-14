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

function getCreatedRows(): NodeListOf<Element> {
  return container.querySelectorAll("[data-testid='inline-created-row']");
}

describe("InlineChecklist", () => {
  it("renders an empty input row by default", () => {
    render(React.createElement(InlineChecklist, { onCreateHabit: vi.fn() }));
    const input = getInput();
    expect(input).not.toBeNull();
    expect(input!.value).toBe("");
    expect(input!.placeholder).toContain("habit");
  });

  it("calls onCreateHabit when Enter is pressed with non-empty input", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onCreate).toHaveBeenCalledWith("Meditate");
  });

  it("does not call onCreateHabit when Enter is pressed with empty input", async () => {
    const onCreate = vi.fn();
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("does not call onCreateHabit when Enter is pressed with whitespace-only input", async () => {
    const onCreate = vi.fn();
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "   ");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("shows created habit as a row after successful creation", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const rows = getCreatedRows();
    expect(rows.length).toBe(1);
    expect(rows[0].textContent).toContain("Meditate");
  });

  it("clears input and keeps it available after creation", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const newInput = getInput();
    expect(newInput).not.toBeNull();
    expect(newInput!.value).toBe("");
  });

  it("supports creating multiple habits in sequence", async () => {
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

    const rows = getCreatedRows();
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain("Meditate");
    expect(rows[1].textContent).toContain("Read");
    expect(onCreate).toHaveBeenCalledTimes(2);
  });

  it("renders created rows with checkbox icons", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });

    const rows = getCreatedRows();
    const checkbox = rows[0].querySelector(".otr-habit-check");
    expect(checkbox).not.toBeNull();
  });

  it("calls onCreateHabit on blur with non-empty input", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Walk", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      input.focus();
      fireInputChange(input, "Walk");
    });
    await act(async () => {
      input.blur();
    });
    await act(async () => {});

    expect(onCreate).toHaveBeenCalledWith("Walk");
  });

  it("does not call onCreateHabit on blur with empty input", async () => {
    const onCreate = vi.fn();
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      input.dispatchEvent(new Event("blur", { bubbles: true }));
    });

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("does not double-create when blur fires after Enter", async () => {
    const onCreate = vi.fn().mockResolvedValue({
      id: "h1", name: "Meditate", emoji: "✨", kind: "binary",
    });
    render(React.createElement(InlineChecklist, { onCreateHabit: onCreate }));

    const input = getInput()!;
    await act(async () => {
      fireInputChange(input, "Meditate");
      input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await act(async () => {
      const inp = getInput()!;
      inp.dispatchEvent(new Event("blur", { bubbles: true }));
    });

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});

function fireInputChange(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype, "value"
  )!.set!;
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
