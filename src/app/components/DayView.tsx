import { storage } from "@/db/storage";
import { metrics } from "@/db/metrics";
import { InkCheckbox } from "./InkCheckbox";
import { EditableHabitName } from "./EditableHabitName";
import { AddHabitInline } from "./AddHabitInline";
import { AutosaveTextarea } from "./AutosaveTextarea";
import { Scribble } from "./Scribble";
import { saveIntention, saveNote } from "../actions";
import Link from "next/link";

interface DayViewProps {
  date: string;
  isToday?: boolean;
}

export function DayView({ date, isToday = false }: DayViewProps) {
  const day = storage.getDay(date);

  const [yy, mm, dd] = date.split("-").map(Number);
  const dateObj = new Date(yy, mm - 1, dd);
  const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = dateObj.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const yearStr = dateObj.getFullYear();

  const doneCount = day.habits.filter((h) => h.done).length;
  const streaks = isToday
    ? metrics.getStreaks(day.habits.map((h) => h.id))
    : {};

  return (
    <div className="page-spread single">
      <div className="page-single">
        <div className="page-header">
          <div>
            <div className="date-big">{dayName}</div>
            <div className="date-small">
              {dateStr} &middot; {yearStr}
              {isToday && " · today"}
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Scribble width={140} seed={2.1} thickness={2} />
          </div>
        </div>

        {!isToday && (
          <div className="day-back-link">
            <Link href={`/calendar?ym=${yy}-${String(mm).padStart(2, "0")}`}>
              &larr; back to calendar
            </Link>
          </div>
        )}

        <AutosaveTextarea
          defaultValue={day.intention}
          onSave={async (value) => {
            "use server";
            await saveIntention(value, date);
          }}
          label="The great thing I will do today"
          className="intention-block"
          inputClassName="intention-input"
          placeholder="write your one intention here..."
          rows={2}
        />

        <div className="two-col">
          <div className="habits-block">
            <div className="block-label">
              <span className="prompt-arrow">&rarr;</span> Habits
              <span className="label-meta">
                {doneCount} / {day.habits.length}
              </span>
            </div>

            {day.habits.length === 0 ? (
              <div className="empty-state">
                No habits yet — use the + below to add one
              </div>
            ) : (
              <div className="habit-list">
                {day.habits.map((habit, i) => {
                  const streak = streaks[habit.id] ?? 0;
                  return (
                    <div
                      key={habit.id}
                      className={`habit-row ${habit.done ? "done" : ""}`}
                    >
                      <InkCheckbox
                        habitId={habit.id}
                        done={habit.done}
                        date={date}
                        size={26}
                        seed={i + 1}
                      />
                      {isToday ? (
                        <EditableHabitName
                          habitId={habit.id}
                          name={habit.name}
                          done={habit.done}
                        />
                      ) : (
                        <div className="habit-name-wrap">
                          <span className="habit-name">{habit.name}</span>
                          {habit.done && <span className="habit-strikethrough" />}
                        </div>
                      )}
                      <div className="habit-meta">
                        {streak > 0 && (
                          <span className="streak">
                            <span className="streak-num">{streak}</span>
                            <span className="streak-label">d</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {isToday && <AddHabitInline />}
          </div>

          <AutosaveTextarea
            defaultValue={day.note}
            onSave={async (value) => {
              "use server";
              await saveNote(value, date);
            }}
            label="Notes"
            className="notes-block"
            inputClassName="notes-input"
            placeholder="anything worth remembering..."
            rows={10}
          />
        </div>
      </div>
    </div>
  );
}
