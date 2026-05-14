"use client";

import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement>;
const base: IconProps = {
  viewBox: "0 0 16 16",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.4,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Today = (p: IconProps) => (
  <svg {...base} {...p}><rect x="2" y="3" width="12" height="11" rx="1.5"/><path d="M2 6h12"/><path d="M5 2v2"/><path d="M11 2v2"/></svg>
);
export const Inbox = (p: IconProps) => (
  <svg {...base} {...p}><path d="M2 9l1.5-5h9L14 9"/><path d="M2 9v4h12V9"/><path d="M5 9h2l.5 1.5h1L9 9h2"/></svg>
);
export const Habits = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 4l2 2 4-4"/><path d="M3 9l2 2 4-4"/><path d="M11 6h2"/><path d="M11 11h2"/></svg>
);
export const Goals = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3"/><circle cx="8" cy="8" r="0.6" fill="currentColor"/></svg>
);
export const Review = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 13V4"/><path d="M3 13h10"/><path d="M5 11l2-3 2 2 3-5"/></svg>
);
export const Settings = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></svg>
);
export const Search = (p: IconProps) => (
  <svg {...base} {...p}><circle cx="7" cy="7" r="4.5"/><path d="M14 14l-3.5-3.5"/></svg>
);
export const Bell = (p: IconProps) => (
  <svg {...base} {...p}><path d="M4 6a4 4 0 0 1 8 0c0 4 1.5 5 1.5 5h-11S4 10 4 6z"/><path d="M6.5 13a1.5 1.5 0 0 0 3 0"/></svg>
);
export const Share = (p: IconProps) => (
  <svg {...base} {...p}><path d="M3 8v5h10V8"/><path d="M8 1v9"/><path d="M5 4l3-3 3 3"/></svg>
);
export const Star = (p: IconProps) => (
  <svg {...base} {...p}><path d="M8 2l1.8 3.7 4.2.6-3 3 .7 4.2L8 11.6 4.3 13.5 5 9.3 2 6.3l4.2-.6z"/></svg>
);
export const Dots = (p: IconProps) => (
  <svg viewBox="0 0 16 16" fill="currentColor" {...p}><circle cx="3.5" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12.5" cy="8" r="1.2"/></svg>
);
export const Chevron = (p: IconProps) => (
  <svg {...base} strokeWidth={1.6} {...p}><path d="M6 4l4 4-4 4"/></svg>
);
export const Mic = (p: IconProps) => (
  <svg {...base} strokeWidth={1.5} {...p}><rect x="6" y="2" width="4" height="8" rx="2"/><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0"/><path d="M8 12v2"/><path d="M5.5 14h5"/></svg>
);
export const Check = (p: IconProps) => (
  <svg {...base} strokeWidth={2} {...p}><path d="M3 8.5l3 3 7-7"/></svg>
);
export const X = (p: IconProps) => (
  <svg {...base} strokeWidth={1.6} {...p}><path d="M4 4l8 8M12 4l-8 8"/></svg>
);
export const Sparkle = (p: IconProps) => (
  <svg {...base} {...p}><path d="M8 2v3M8 11v3M2 8h3M11 8h3M4.5 4.5l2 2M9.5 9.5l2 2M11.5 4.5l-2 2M6.5 9.5l-2 2"/></svg>
);
export const Plus = (p: IconProps) => (
  <svg {...base} strokeWidth={1.6} {...p}><path d="M8 3v10M3 8h10"/></svg>
);

const Icon = { Today, Inbox, Habits, Goals, Review, Settings, Search, Bell, Share, Star, Dots, Chevron, Mic, Check, X, Sparkle, Plus };
export default Icon;
