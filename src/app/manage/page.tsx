import { storage } from "@/db/storage";
import { AddHabitForm } from "./AddHabitForm";
import { HabitList } from "./HabitList";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ManagePage() {
  const habits = storage.getActiveHabits();

  return (
    <main className="max-w-lg mx-auto p-6 w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Manage Habits</h1>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
        >
          &larr; Back to Today
        </Link>
      </div>

      <AddHabitForm />

      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-3">Active Habits</h2>
        <HabitList habits={habits} />
      </div>
    </main>
  );
}
