import { storage } from "@/db/storage";
import { InkCheckbox } from "./components/InkCheckbox";
import { IntentionTextarea } from "./components/IntentionTextarea";
import { NoteTextarea } from "./components/NoteTextarea";
import { Scribble } from "./components/Scribble";
import Link from "next/link";
import "./notebook.css";

export const dynamic = "force-dynamic";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodayPage() {
  const today = getToday();
  const day = storage.getDay(today);

  const [yy, mm, dd] = today.split("-").map(Number);
  const date = new Date(yy, mm - 1, dd);
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" });
  const dateStr = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
  const yearStr = date.getFullYear();

  const doneCount = day.habits.filter((h) => h.done).length;

  return (
    <div className="notebook-page">
      <div className="notebook">
        <nav className="notebook-nav">
          <div className="nav-title">&mdash; habit journal &middot; {yearStr} &mdash;</div>
          <div className="nav-tabs">
            <Link href="/" className="nav-tab active">
              Today
            </Link>
            <Link href="/calendar" className="nav-tab">
              Calendar
            </Link>
          </div>
        </nav>

        <div className="page-spread single">
          <div className="page-single">
            <div className="page-header">
              <div>
                <div className="date-big">{dayName}</div>
                <div className="date-small">
                  {dateStr} &middot; {yearStr}
                </div>
              </div>
              <div style={{ marginTop: 4 }}>
                <Scribble width={140} seed={2.1} thickness={2} />
              </div>
            </div>

            <IntentionTextarea defaultValue={day.intention} />

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
                    No habits yet.{" "}
                    <Link href="/manage">Add your first habit</Link>
                  </div>
                ) : (
                  <div className="habit-list">
                    {day.habits.map((habit, i) => {
                      const streak = storage.getStreak(habit.id);
                      return (
                        <div
                          key={habit.id}
                          className={`habit-row ${habit.done ? "done" : ""}`}
                        >
                          <InkCheckbox
                            habitId={habit.id}
                            done={habit.done}
                            size={26}
                            seed={i + 1}
                          />
                          <div className="habit-name-wrap">
                            <span className="habit-name">{habit.name}</span>
                            {habit.done && <span className="habit-strikethrough" />}
                          </div>
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

                <div className="add-habit-row">
                  <span className="prompt-arrow" style={{ opacity: 0.4 }}>
                    +
                  </span>
                  <Link href="/manage">add another habit...</Link>
                </div>
              </div>

              <NoteTextarea defaultValue={day.note} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
