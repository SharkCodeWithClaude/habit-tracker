/** TS mirror of CSS tokens — useful for inline styles, JS calculations, charts */
export const tokens = {
  color: {
    bg:          "#ffffff",
    bgSoft:      "#f7f6f3",
    bgHover:     "#efeeec",
    rule:        "#ebeae6",
    ruleStrong:  "#d9d8d2",
    ink:         "#37352f",
    inkSoft:     "#6b6b66",
    inkFaint:    "#9b9a93",
    accent:      "#2f6feb",
    accentSoft:  "#eaf1fe",
    warn:        "#c87d2f",
    warnSoft:    "#fbf3e8",
    good:        "#4f9d68",
    goodSoft:    "#ebf3ed",
    danger:      "#c0392b",
    dangerSoft:  "#fff3f1",
  },
  font: {
    sans:  `'Inter', ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`,
    serif: `'Newsreader', Georgia, "Times New Roman", serif`,
    mono:  `ui-monospace, "SFMono-Regular", Menlo, Monaco, Consolas, monospace`,
  },
  size: {
    xs: 11, sm: 12, base: 14, md: 15, lg: 16, xl: 18, "2xl": 28, "3xl": 36,
  },
  weight: { regular: 400, medium: 500, semi: 600, bold: 700 },
  space: { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 8: 32, 10: 40, 12: 48 },
  radius: { sm: 4, base: 6, md: 8, lg: 12, pill: 999 },
  shadow: {
    sm: "0 1px 2px rgba(15,15,15,0.05)",
    md: "0 4px 18px rgba(15,15,15,0.06)",
    lg: "0 10px 40px rgba(15,15,15,0.10)",
  },
  motion: { fast: 120, base: 160, slow: 240, ease: "cubic-bezier(0.2, 0, 0, 1)" },
} as const;

export type Tokens = typeof tokens;
