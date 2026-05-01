// Hand-drawn ink checkbox with animated stroke
const InkCheckbox = ({ checked, onToggle, size = 28, ink = '#0f1633', seed = 0 }) => {
  const s = size;
  // slight imperfection per seed
  const jitter = (n) => {
    const x = Math.sin(seed * 12.9898 + n * 78.233) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 1.6;
  };
  const j = (n) => jitter(n).toFixed(2);

  // Box path - drawn as one stroke, slightly wobbly
  const boxPath = `
    M ${2 + +j(1)} ${2 + +j(2)}
    L ${s - 2 + +j(3)} ${2 + +j(4)}
    L ${s - 2 + +j(5)} ${s - 2 + +j(6)}
    L ${2 + +j(7)} ${s - 2 + +j(8)}
    Z
  `.trim();

  // Check path - sweeping, organic
  const cx1 = s * 0.20 + +j(9) * 0.3;
  const cy1 = s * 0.55 + +j(10) * 0.3;
  const cx2 = s * 0.42 + +j(11) * 0.3;
  const cy2 = s * 0.78 + +j(12) * 0.3;
  const cx3 = s * 0.86 + +j(13) * 0.3;
  const cy3 = s * 0.18 + +j(14) * 0.3;
  const checkPath = `M ${cx1} ${cy1} Q ${cx2 - 3} ${cy2 + 1} ${cx2} ${cy2} Q ${(cx2 + cx3) / 2} ${(cy2 + cy3) / 2 + 2} ${cx3} ${cy3}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        width: s + 6,
        height: s + 6,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg width={s + 6} height={s + 6} viewBox={`-3 -3 ${s + 6} ${s + 6}`} style={{ overflow: 'visible' }}>
        <path
          d={boxPath}
          fill="none"
          stroke={ink}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.85"
        />
        {checked && (
          <path
            d={checkPath}
            fill="none"
            stroke={ink}
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 60,
              strokeDashoffset: 60,
              animation: 'inkDraw 0.35s ease-out forwards',
            }}
          />
        )}
      </svg>
    </button>
  );
};

// Hand-drawn ink dot for calendar heatmap
const InkDot = ({ intensity = 0, size = 14, ink = '#0f1633', seed = 0 }) => {
  if (intensity === 0) return <div style={{ width: size, height: size }} />;
  const r = size * 0.28 * (0.7 + intensity * 0.45);
  const opacity = 0.25 + intensity * 0.65;
  const wobble = (n) => {
    const x = Math.sin(seed * 19.19 + n * 7.7) * 43758.5453;
    return (x - Math.floor(x) - 0.5) * 1.5;
  };
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2 + wobble(1)}
        cy={size / 2 + wobble(2)}
        r={r}
        fill={ink}
        opacity={opacity}
      />
      {intensity > 0.6 && (
        <circle
          cx={size / 2 + wobble(3) + 0.5}
          cy={size / 2 + wobble(4) - 0.5}
          r={r * 0.55}
          fill={ink}
          opacity={0.4}
        />
      )}
    </svg>
  );
};

// A scribbled underline
const Scribble = ({ width = 120, ink = '#0f1633', seed = 1, thickness = 1.6 }) => {
  const w = width;
  const pts = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const y = Math.sin(seed * 3.7 + i * 1.3) * 1.2;
    pts.push([x, y]);
  }
  const d = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return (
    <svg width={w} height="6" viewBox={`0 -3 ${w} 6`} style={{ display: 'block', overflow: 'visible' }}>
      <path d={d} fill="none" stroke={ink} strokeWidth={thickness} strokeLinecap="round" opacity="0.8" />
    </svg>
  );
};

Object.assign(window, { InkCheckbox, InkDot, Scribble });
