import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { act } from "react";

interface RenderHookResult<T> {
  result: { current: T };
  rerender: () => void;
  unmount: () => void;
}

interface RenderHookOptions<T> {
  wrapper?: React.ComponentType<{ children: React.ReactNode }>;
}

const roots: Array<{ root: ReactDOM.Root; container: HTMLDivElement }> = [];

export function renderHook<T>(
  hook: () => T,
  options?: RenderHookOptions<T>
): RenderHookResult<T> {
  const result = { current: undefined as unknown as T };
  const container = document.createElement("div");
  document.body.appendChild(container);

  function TestComponent() {
    result.current = hook();
    return null;
  }

  let element: React.ReactElement = React.createElement(TestComponent);
  if (options?.wrapper) {
    element = React.createElement(options.wrapper, null, element);
  }

  let root: ReactDOM.Root;
  act(() => {
    root = ReactDOM.createRoot(container);
    root.render(element);
  });

  roots.push({ root: root!, container });

  return {
    result,
    rerender: () => {
      act(() => {
        root.render(element);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

export function cleanup() {
  for (const { root, container } of roots) {
    try {
      act(() => {
        root.unmount();
      });
      container.remove();
    } catch {}
  }
  roots.length = 0;
}

export { act };
