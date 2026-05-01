import { storage } from "@/db/storage";
import { InkCheckbox } from "./InkCheckbox";
import { EditableHabitName } from "./EditableHabitName";
import { AddHabitInline } from "./AddHabitInline";
import { IntentionTextarea } from "./IntentionTextarea";
import { NoteTextarea } from "./NoteTextarea";
import { Scribble } from "./Scribble";
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

        <IntentionTextarea defaultValue={day.intention} date={date} />

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
                  const streak = isToday ? storage.getStreak(habit.id) : 0;
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
                      <EditableHabitName
                        habitId={habit.id}
                        name={habit.name}
                        done={habit.done}
                      />
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

            <AddHabitInline />
          </div>

          <NoteTextarea defaultValue={day.note} date={date} />
        </div>
      </div>
    </div>
  );
}
