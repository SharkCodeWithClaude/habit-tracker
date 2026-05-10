"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/otter-ds/components/Sidebar";
import { DateStrip } from "@/otter-ds/components/DateStrip";
import { Habits } from "@/otter-ds/components/Habits";
import Icon from "@/otter-ds/components/Icon";
import { dateKey } from "@/otter-ds/lib/helpers";
import type { Habit, LogMap } from "@/otter-ds/lib/types";
import {
  fetchHabits,
  fetchStreaks,
  fetchLogsForDate,
  buildLogMap,
  toggleHabit,
  setSession,
} from "@/lib/api";

const NAV_LINKS = [
  { id: "today", label: "Today", icon: Icon.Today },
  { id: "calendar", label: "Calendar", icon: Icon.Review },
  { id: "review", label: "Review", icon: Icon.Review },
];

export default function TodayPage() {
  const router = useRouter();
  const today = React.useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [selectedKey, setSelectedKey] = React.useState(todayKey);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [logs, setLogs] = React.useState<LogMap>({});
  const [streaks, setStreaks] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      const [h, s] = await Promise.all([fetchHabits(), fetchStreaks()]);
      if (cancelled) return;
      setHabits(h);
      setStreaks(s);

      const todayLogs = await fetchLogsForDate(undefined, todayKey);
      if (cancelled) return;
      setLogs(buildLogMap(todayLogs, h));
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [todayKey]);

  React.useEffect(() => {
    if (habits.length === 0) return;
    let cancelled = false;
    async function loadLogs() {
      const dateLogs = await fetchLogsForDate(undefined, selectedKey);
      if (cancelled) return;
      setLogs((prev) => ({
        ...prev,
        ...buildLogMap(dateLogs, habits),
      }));
    }
    loadLogs();
    return () => { cancelled = true; };
  }, [selectedKey, habits]);

  const handleNav = (id: string) => {
    if (id === "today") router.push("/today");
    else if (id === "calendar") router.push("/calendar");
    else if (id === "review") router.push("/review");
  };

  const handleToggle = async (habitId: string, dk: string) => {
    await toggleHabit(undefined, habitId, dk);
  };

  const handleAddSession = async (habitId: string, dk: string, newCount: number) => {
    await setSession(undefined, habitId, dk, newCount);
  };

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
      <Sidebar
        active="today"
        onChange={handleNav}
        links={NAV_LINKS}
        pinned={[]}
      />
      <main className="otr-main">
        <div className="otr-topbar">
          <div className="otr-crumb">
            <span>Workspace</span>
            <span className="otr-sep">/</span>
            <span className="otr-here">Today</span>
          </div>
          <div className="otr-topbar-actions">
            <button className="otr-icon-btn" title="Share">
              <Icon.Share style={{ width: 16, height: 16 }} />
            </button>
            <button className="otr-icon-btn" title="Star">
              <Icon.Star style={{ width: 16, height: 16 }} />
            </button>
            <button className="otr-icon-btn" title="More">
              <Icon.Dots style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>

        <div className="otr-page">
          <h1 className="otr-page-title">
            <span className="otr-emoji">{selectedKey === todayKey ? "☀️" : "📅"}</span>
            <span>{selectedLabel}</span>
          </h1>
          <p className="otr-page-sub">
            {selectedDate.toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>

          <DateStrip
            selectedKey={selectedKey}
            onSelect={setSelectedKey}
            logs={logs}
            habits={habits}
          />

          {loading ? (
            <div className="otr-empty" style={{ padding: "40px 16px" }}>
              Loading habits...
            </div>
          ) : (
            <Habits
              habits={habits}
              logs={logs}
              setLogs={setLogs}
              dateK={selectedKey}
              streaks={streaks}
              onToggle={handleToggle}
              onAddSession={handleAddSession}
            />
          )}
        </div>
      </main>
    </div>
  );
}
