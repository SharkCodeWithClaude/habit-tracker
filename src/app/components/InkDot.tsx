interface InkDotProps {
  size?: number;
  seed?: number;
}

function wobble(seed: number, n: number): number {
  const x = Math.sin(seed * 19.19 + n * 7.7) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 1.5;
}

export function InkDot({ size = 11, seed = 0 }: InkDotProps) {
  const r = size * 0.28 * (0.7 + 0.45);
  const cx = size / 2 + wobble(seed, 1);
  const cy = size / 2 + wobble(seed, 2);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="var(--ink, #161a2c)"
        opacity={0.9}
      />
      <circle
        cx={size / 2 + wobble(seed, 3) + 0.5}
        cy={size / 2 + wobble(seed, 4) - 0.5}
        r={r * 0.55}
        fill="var(--ink, #161a2c)"
        opacity={0.4}
      />
    </svg>
  );
}
