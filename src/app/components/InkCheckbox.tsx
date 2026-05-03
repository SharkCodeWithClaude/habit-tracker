"use client";

import { useOptimistic, useTransition } from "react";
import { toggleHabit } from "../actions";

interface InkCheckboxProps {
  habitId: number;
  done: boolean;
  date?: string;
  size?: number;
  seed?: number;
  readOnly?: boolean;
}

function jitter(seed: number, n: number): number {
  const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 1.6;
}

export function InkCheckbox({ habitId, done, date, size = 26, seed = 0, readOnly = false }: InkCheckboxProps) {
  const [optimisticDone, setOptimisticDone] = useOptimistic(done);
  const [, startTransition] = useTransition();
  const s = size;

  const j = (n: number) => jitter(seed, n).toFixed(2);

  const boxPath = `
    M ${2 + +j(1)} ${2 + +j(2)}
    L ${s - 2 + +j(3)} ${2 + +j(4)}
    L ${s - 2 + +j(5)} ${s - 2 + +j(6)}
    L ${2 + +j(7)} ${s - 2 + +j(8)}
    Z
  `.trim();

  const cx1 = s * 0.2 + +j(9) * 0.3;
  const cy1 = s * 0.55 + +j(10) * 0.3;
  const cx2 = s * 0.42 + +j(11) * 0.3;
  const cy2 = s * 0.78 + +j(12) * 0.3;
  const cx3 = s * 0.86 + +j(13) * 0.3;
  const cy3 = s * 0.18 + +j(14) * 0.3;
  const checkPath = `M ${cx1} ${cy1} Q ${cx2 - 3} ${cy2 + 1} ${cx2} ${cy2} Q ${(cx2 + cx3) / 2} ${(cy2 + cy3) / 2 + 2} ${cx3} ${cy3}`;

  function handleToggle() {
    if (readOnly) return;
    startTransition(async () => {
      setOptimisticDone(!optimisticDone);
      await toggleHabit(habitId, date);
    });
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={optimisticDone}
      disabled={readOnly}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: readOnly ? "default" : "pointer",
        width: s + 6,
        height: s + 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <svg
        width={s + 6}
        height={s + 6}
        viewBox={`-3 -3 ${s + 6} ${s + 6}`}
        style={{ overflow: "visible" }}
      >
        <path
          d={boxPath}
          fill="none"
          stroke="var(--ink, #161a2c)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {optimisticDone && (
          <path
            d={checkPath}
            fill="none"
            stroke="var(--ink, #161a2c)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 60,
              strokeDashoffset: 60,
              animation: "inkDraw 0.35s ease-out forwards",
            }}
          />
        )}
      </svg>
    </button>
  );
}
