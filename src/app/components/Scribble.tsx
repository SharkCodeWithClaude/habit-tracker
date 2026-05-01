interface ScribbleProps {
  width?: number;
  seed?: number;
  thickness?: number;
}

export function Scribble({ width = 120, seed = 1, thickness = 1.6 }: ScribbleProps) {
  const steps = 8;
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    const y = Math.sin(seed * 3.7 + i * 1.3) * 1.2;
    pts.push([x, y]);
  }
  const d = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");

  return (
    <svg
      width={width}
      height="6"
      viewBox={`0 -3 ${width} 6`}
      className="scribble"
      style={{ display: "block", overflow: "visible" }}
    >
      <path
        d={d}
        fill="none"
        stroke="var(--ink, #161a2c)"
        strokeWidth={thickness}
        strokeLinecap="round"
        opacity="0.8"
      />
    </svg>
  );
}
