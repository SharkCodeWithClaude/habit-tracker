import { getDb } from "../src/db/init";
import { HabitStorage } from "../src/db/storage";

const db = getDb();
const storage = new HabitStorage(db);

const habits = ["Read", "Exercise", "No phone in bed"];

for (const name of habits) {
  const existing = db
    .prepare("SELECT id FROM habits WHERE name = ?")
    .get(name);

  if (!existing) {
    storage.createHabit(name);
    console.log(`Created habit: ${name}`);
  } else {
    console.log(`Habit already exists: ${name}`);
  }
}

console.log("Seed complete.");
