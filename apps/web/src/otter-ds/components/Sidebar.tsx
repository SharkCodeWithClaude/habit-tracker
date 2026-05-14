"use client";

import * as React from "react";
import Icon from "./Icon";

export interface SidebarLink {
  id: string;
  label: string;
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  count?: number;
}

export interface SidebarProps {
  active: string;
  onChange: (id: string) => void;
  brandName?: string;
  brandSub?: string;
  brandImgSrc?: string;
  links?: SidebarLink[];
  pinned?: { id: string; label: string }[];
  userInitial?: string;
  plan?: string;
}

const DEFAULT_LINKS: SidebarLink[] = [
  { id: "today",  label: "Today",  icon: Icon.Today },
  { id: "inbox",  label: "Inbox",  icon: Icon.Inbox, count: 3 },
  { id: "habits", label: "Habits", icon: Icon.Habits },
  { id: "goals",  label: "Goals",  icon: Icon.Goals },
  { id: "review", label: "Review", icon: Icon.Review },
];

export function Sidebar({
  active,
  onChange,
  brandName = "Otter",
  brandSub = "your habits, gently",
  brandImgSrc = "/otter.png",
  links = DEFAULT_LINKS,
  pinned = [
    { id: "p1", label: "Q2 reading list" },
    { id: "p2", label: "Morning routine" },
  ],
  userInitial = "A",
  plan = "Free plan",
}: SidebarProps) {
  return (
    <aside className="otr-sidebar">
      <div className="otr-brand">
        <img src={brandImgSrc} alt={brandName} className="otr-brand-img" />
        <div>
          <div className="otr-brand-name">{brandName}</div>
          <div className="otr-brand-sub">{brandSub}</div>
        </div>
      </div>

      <button className="otr-side-link"><Icon.Search className="otr-ic" /><span>Search</span></button>
      <button className="otr-side-link"><Icon.Bell className="otr-ic" /><span>Updates</span></button>
      <button className="otr-side-link" onClick={() => onChange("settings")}>
        <Icon.Settings className="otr-ic" /><span>Settings</span>
      </button>

      <div className="otr-side-section">Workspace</div>
      {links.map((l) => {
        const Ico = l.icon || Icon.Today;
        return (
          <button
            key={l.id}
            className={`otr-side-link ${active === l.id ? "on" : ""}`}
            onClick={() => onChange(l.id)}
          >
            <Ico className="otr-ic" />
            <span>{l.label}</span>
            {l.count != null && <span className="otr-count">{l.count}</span>}
          </button>
        );
      })}

      {pinned.length > 0 && (
        <>
          <div className="otr-side-section">Pinned</div>
          {pinned.map((p) => (
            <button key={p.id} className="otr-side-link">
              <Icon.Star className="otr-ic" />
              <span>{p.label}</span>
            </button>
          ))}
        </>
      )}

      <div className="otr-side-foot">
        <div className="otr-avatar">{userInitial}</div>
        <span>{plan}</span>
      </div>
    </aside>
  );
}
