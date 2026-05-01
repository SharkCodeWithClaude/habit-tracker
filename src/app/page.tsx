import { storage } from "@/db/storage";
import { HabitCheckbox } from "./components/HabitCheckbox";
import { NoteTextarea } from "./components/NoteTextarea";
import Link from "next/link";

export const dynamic = "force-dynamic";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export default function TodayPage() {
  const today = getToday();
  const day = storage.getDay(today);

  return (
    <main className="max-w-lg mx-auto p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today</h1>
        <Link
          href="/manage"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          Manage habits &rarr;
        </Link>
      </div>
      <p className="text-sm text-gray-500 mb-4">{today}</p>

      <NoteTextarea defaultValue={day.note} />

      {day.habits.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No habits yet.</p>
      ) : (
        <div className="space-y-1">
          {day.habits.map((habit) => (
            <HabitCheckbox
              key={habit.id}
              habitId={habit.id}
              name={habit.name}
              done={habit.done}
              streak={storage.getStreak(habit.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
