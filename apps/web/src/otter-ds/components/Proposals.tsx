"use client";

import * as React from "react";
import Icon from "./Icon";
import type { Habit, ProposalsData, ProposalNewHabit, ProposalTick } from "../lib/types";

export interface ProposalsProps {
  proposals: ProposalsData;
  habits: Habit[];
  onConfirmTick: (habitId: string, info: ProposalTick) => void;
  onDismissTick: (habitId: string) => void;
  onAddHabit: (h: ProposalNewHabit) => void;
  onDismissNew: (idx: number) => void;
  onClear: () => void;
}

export function Proposals({
  proposals,
  habits,
  onConfirmTick,
  onDismissTick,
  onAddHabit,
  onDismissNew,
  onClear,
}: ProposalsProps) {
  const tickEntries = Object.entries(proposals.ticks || {})
    .map(([hid, info]) => {
      const habit = habits.find((h) => String(h.id) === String(hid));
      return habit ? { habit, info } : null;
    })
    .filter((x): x is { habit: Habit; info: ProposalTick } => Boolean(x));
  const newHabits = proposals.newHabits || [];
  if (!tickEntries.length && !newHabits.length) return null;

  return (
    <div className="otr-proposals">
      <div className="otr-proposals-head">
        <span className="otr-proposals-title">
          <Icon.Sparkle className="otr-spark" /> Otter noticed
        </span>
        <button className="otr-proposals-clear" onClick={onClear}>Dismiss all</button>
      </div>
      <div className="otr-proposal-list">
        {tickEntries.map(({ habit, info }) => (
          <div key={`t-${habit.id}`} className="otr-proposal tracked">
            <div className="otr-proposal-body">
              <span className="otr-proposal-emoji">{habit.emoji}</span>
              <span className="otr-proposal-name">{habit.name}</span>
              {info.evidence && <span className="otr-proposal-meta">— "{info.evidence}"</span>}
            </div>
            <div className="otr-proposal-actions">
              <button
                className="otr-proposal-act confirm"
                onClick={() => onConfirmTick(habit.id, info)}
                title="Mark done"
              >
                <Icon.Check style={{ width: 14, height: 14 }} />
              </button>
              <button
                className="otr-proposal-act dismiss"
                onClick={() => onDismissTick(habit.id)}
                title="Dismiss"
              >
                <Icon.X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        ))}
        {newHabits.map((nh, i) => (
          <div key={`n-${i}`} className="otr-proposal new">
            <div className="otr-proposal-body">
              <span className="otr-proposal-emoji">{nh.emoji || "💡"}</span>
              <span className="otr-proposal-name">{nh.name}</span>
              <span className="otr-proposal-newtag">new habit?</span>
            </div>
            <div className="otr-proposal-actions">
              <button className="otr-proposal-act confirm" onClick={() => onAddHabit(nh)} title="Add habit">
                <Icon.Plus style={{ width: 14, height: 14 }} />
              </button>
              <button className="otr-proposal-act dismiss" onClick={() => onDismissNew(i)} title="Dismiss">
                <Icon.X style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
