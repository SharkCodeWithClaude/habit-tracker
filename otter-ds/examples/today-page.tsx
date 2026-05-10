"use client";

/**
 * Example Next.js page using the Otter design system.
 * Drop into app/today/page.tsx (App Router) or pages/today.tsx (Pages Router).
 */

import * as React from "react";
import {
  Sidebar,
  DateStrip,
  Journal,
  Proposals,
  Habits,
  Icon,
  SEED_HABITS,
  dateKey,
  seedLogs,
} from "../components";
import type { Habit, LogMap, Proposals as ProposalsT, ProposalNewHabit, ProposalTick } from "../lib/types";

export default function TodayPage() {
  const today = React.useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [tab, setTab] = React.useState("today");
  const [habits, setHabits] = React.useState<Habit[]>(SEED_HABITS);
  const [logs, setLogs] = React.useState<LogMap>(() => seedLogs(SEED_HABITS));
  const [notes, setNotes] = React.useState<Record<string, string>>({});
  const [selectedKey, setSelectedKey] = React.useState(todayKey);
  const [proposals, setProposals] = React.useState<ProposalsT>({ ticks: {}, newHabits: [] });

  const journalText = notes[selectedKey] || "";
  const setJournalText = (v: string) =>
    setNotes((n) => ({ ...n, [selectedKey]: v }));

  React.useEffect(() => {
    setProposals({ ticks: {}, newHabits: [] });
  }, [selectedKey]);

  const confirmTick = (hid: number, info: ProposalTick) => {
    const habit = habits.find((h) => h.id === hid);
    setLogs((l) => {
      const k = `${hid}|${selectedKey}`;
      if (habit?.kind === "session") {
        return { ...l, [k]: Math.max(1, Number(info.sessions) || 1) };
      }
      return { ...l, [k]: true };
    });
    setProposals((p) => {
      const ticks = { ...p.ticks };
      delete ticks[String(hid)];
      return { ...p, ticks };
    });
  };
  const dismissTick = (hid: number) => {
    setProposals((p) => {
      const ticks = { ...p.ticks };
      delete ticks[String(hid)];
      return { ...p, ticks };
    });
  };
  const addHabit = (nh: ProposalNewHabit) => {
    const newH: Habit = {
      id: Math.max(...habits.map((h) => h.id), 0) + 1,
      name: nh.name,
      emoji: nh.emoji || "✨",
      kind: nh.kind || "binary",
      aliases: [nh.name.toLowerCase()],
    };
    setHabits((hs) => [...hs, newH]);
    setLogs((l) => ({
      ...l,
      [`${newH.id}|${selectedKey}`]: newH.kind === "session" ? 1 : true,
    }));
    setProposals((p) => ({ ...p, newHabits: p.newHabits.filter((x) => x.name !== nh.name) }));
  };
  const dismissNew = (idx: number) => {
    setProposals((p) => ({ ...p, newHabits: p.newHabits.filter((_, i) => i !== idx) }));
  };
  const clearProposals = () => setProposals({ ticks: {}, newHabits: [] });

  const selectedDate = React.useMemo(() => {
    const [y, m, d] = selectedKey.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [selectedKey]);

  const selectedLabel = (() => {
    if (selectedKey === todayKey) return "Today";
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedKey === dateKey(yesterday)) return "Yesterday";
    return selectedDate.toLocaleDateString("en-US", { weekday: "long" });
  })();

  return (
    <div className="otr-shell">
      <Sidebar active={tab} onChange={setTab} />
      <main className="otr-main">
        <div className="otr-topbar">
          <div className="otr-crumb">
            <span>Workspace</span>
            <span className="otr-sep">/</span>
            <span className="otr-here">Today</span>
          </div>
          <div className="otr-topbar-actions">
            <button className="otr-icon-btn" title="Share"><Icon.Share style={{ width: 16, height: 16 }} /></button>
            <button className="otr-icon-btn" title="Star"><Icon.Star style={{ width: 16, height: 16 }} /></button>
            <button className="otr-icon-btn" title="More"><Icon.Dots style={{ width: 16, height: 16 }} /></button>
          </div>
        </div>

        <div className="otr-page">
          <h1 className="otr-page-title">
            <span className="otr-emoji">☀️</span>
            <span>{selectedLabel}</span>
          </h1>
          <p className="otr-page-sub">
            {selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
          </p>

          <DateStrip
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            logs={logs}
            habits={habits}
          />

          <Journal
            value={journalText}
            onChange={setJournalText}
            onProposals={setProposals}
            habits={habits}
            date={selectedDate}
          />

          <Proposals
            proposals={proposals}
            habits={habits}
            onConfirmTick={confirmTick}
            onDismissTick={dismissTick}
            onAddHabit={addHabit}
            onDismissNew={dismissNew}
            onClear={clearProposals}
          />

          <Habits habits={habits} logs={logs} setLogs={setLogs} dateK={selectedKey} />
        </div>
      </main>
    </div>
  );
}
