const PALETTE = [
  "#e06c75", // red
  "#61afef", // blue
  "#98c379", // green
  "#e5c07b", // gold
  "#c678dd", // purple
  "#56b6c2", // teal
  "#d19a66", // orange
  "#be5046", // rust
  "#7ec8e3", // sky
  "#c3e88d", // lime
  "#f78c6c", // coral
  "#89ddff", // cyan
  "#b2ccd6", // steel
  "#ffcb6b", // amber
  "#a480cf", // violet
];

export const HEATMAP_FILL = "var(--ink)";

export function habitColor(habitId: number): string {
  return PALETTE[(habitId - 1) % PALETTE.length];
}
