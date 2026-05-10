"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/otter-ds/components/Sidebar";
import { DateStrip } from "@/otter-ds/components/DateStrip";
import { Habits } from "@/otter-ds/components/Habits";
import { Chat } from "@/otter-ds/components/Chat";
import type { ChatMessage } from "@/otter-ds/components/Chat";
import { Proposals } from "@/otter-ds/components/Proposals";
import Icon from "@/otter-ds/components/Icon";
import { dateKey } from "@/otter-ds/lib/helpers";
import type { Habit, LogMap, Proposals as ProposalsT, ProposalTick, ProposalNewHabit } from "@/otter-ds/lib/types";
import {
  fetchHabits,
  fetchStreaks,
  fetchLogsForDate,
  buildLogMap,
  toggleHabit,
  setSession,
  fetchActiveConversation,
  createConversation,
  fetchMessages,
  sendMessage,
  wrapConversation,
  createHabit,
} from "@/lib/api";
import { generateAssistantResponse, extractProposalsFromText } from "@/lib/chat";

const NAV_LINKS = [
  { id: "today", label: "Today", icon: Icon.Today },
  { id: "calendar", label: "Calendar", icon: Icon.Review },
  { id: "review", label: "Review", icon: Icon.Review },
];

const TOKEN_BUDGET = 4000;

export default function TodayPage() {
  const router = useRouter();
  const today = React.useMemo(() => new Date(), []);
  const todayKey = dateKey(today);

  const [selectedKey, setSelectedKey] = React.useState(todayKey);
  const [habits, setHabits] = React.useState<Habit[]>([]);
  const [logs, setLogs] = React.useState<LogMap>({});
  const [streaks, setStreaks] = React.useState<Record<string, number>>({});
  const [loading, setLoading] = React.useState(true);

  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [thinking, setThinking] = React.useState(false);
  const [shouldWrap, setShouldWrap] = React.useState(false);
  const [proposals, setProposals] = React.useState<ProposalsT>({ ticks: {}, newHabits: [] });

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
    let cancelled = false;
    async function loadConversation() {
      const active = await fetchActiveConversation();
      if (cancelled) return;
      if (active && active.date === todayKey) {
        setConversationId(active.id);
        if (active.tokenCount >= TOKEN_BUDGET) setShouldWrap(true);
        const msgs = await fetchMessages(undefined, active.id);
        if (cancelled) return;
        setMessages(msgs.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })));
      } else {
        const conv = await createConversation(undefined, todayKey);
        if (cancelled) return;
        if (conv) setConversationId(conv.id);
      }
    }
    loadConversation();
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

  const handleSendMessage = async (text: string) => {
    if (!conversationId) return;

    const optimisticMsg: ChatMessage = {
      id: `opt-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setThinking(true);

    await sendMessage(undefined, conversationId, text, "user");

    const detected = extractProposalsFromText(text, habits);
    const responseText = generateAssistantResponse(text, detected, habits);
    setProposals(detected);

    const assistantMsg: ChatMessage = {
      id: `ast-${Date.now()}`,
      role: "assistant",
      content: responseText,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setThinking(false);

    await sendMessage(undefined, conversationId, responseText, "assistant");
  };

  const handleNewSession = async () => {
    if (conversationId) {
      await wrapConversation(undefined, conversationId);
    }
    const conv = await createConversation(undefined, todayKey);
    if (conv) {
      setConversationId(conv.id);
      setMessages([]);
      setShouldWrap(false);
      setProposals({ ticks: {}, newHabits: [] });
    }
  };

  const handleConfirmTick = async (habitId: string, info: ProposalTick) => {
    const dk = selectedKey;
    const habit = habits.find((h) => h.id === habitId);
    if (!habit) return;

    if (habit.kind === "session") {
      const sessions = info.sessions || 1;
      const key = `${habitId}|${dk}`;
      const current = Number(logs[key]) || 0;
      const newVal = current + sessions;
      setLogs((prev) => ({ ...prev, [key]: newVal }));
      await setSession(undefined, habitId, dk, newVal);
    } else {
      const key = `${habitId}|${dk}`;
      setLogs((prev) => ({ ...prev, [key]: true }));
      await toggleHabit(undefined, habitId, dk);
    }

    setProposals((prev) => {
      const { [habitId]: _, ...rest } = prev.ticks;
      return { ...prev, ticks: rest };
    });
  };

  const handleDismissTick = (habitId: string) => {
    setProposals((prev) => {
      const { [habitId]: _, ...rest } = prev.ticks;
      return { ...prev, ticks: rest };
    });
  };

  const handleAddHabit = async (nh: ProposalNewHabit) => {
    const newHabit = await createHabit(
      undefined,
      nh.name,
      nh.emoji || "💡",
      nh.kind || "binary",
      [nh.name.toLowerCase()]
    );
    if (newHabit) {
      setHabits((prev) => [...prev, newHabit]);
    }
    setProposals((prev) => ({
      ...prev,
      newHabits: prev.newHabits.filter((h) => h.name !== nh.name),
    }));
  };

  const handleDismissNew = (idx: number) => {
    setProposals((prev) => ({
      ...prev,
      newHabits: prev.newHabits.filter((_, i) => i !== idx),
    }));
  };

  const handleClearProposals = () => {
    setProposals({ ticks: {}, newHabits: [] });
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

  const hasProposals =
    Object.keys(proposals.ticks).length > 0 || proposals.newHabits.length > 0;

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

          <Chat
            messages={messages}
            onSend={handleSendMessage}
            thinking={thinking}
            shouldWrap={shouldWrap}
            onNewSession={handleNewSession}
          />

          {hasProposals && (
            <Proposals
              proposals={proposals}
              habits={habits}
              onConfirmTick={handleConfirmTick}
              onDismissTick={handleDismissTick}
              onAddHabit={handleAddHabit}
              onDismissNew={handleDismissNew}
              onClear={handleClearProposals}
            />
          )}

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
