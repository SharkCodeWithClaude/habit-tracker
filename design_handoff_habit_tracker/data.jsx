// Normalized data model — mirrors the SQL schema:
//   habits        → array of { id, name, category, color, sort_order, created_at, archived_at }
//   habit_logs    → Map keyed by `${habit_id}|${date}` → boolean (presence = done=1)
//   day_notes     → Map keyed by date → { note, intention, updated_at }

const HABIT_SEED = [
  { id: 1, name: 'Workout',          category: 'body',       color: '#b8423a', sort_order: 0 },
  { id: 2, name: 'Read 20 pages',    category: 'mind',       color: '#2d5a8a', sort_order: 1 },
  { id: 3, name: 'Drink 2L water',   category: 'body',       color: '#b8423a', sort_order: 2 },
  { id: 4, name: 'Meditate 10 min',  category: 'mind',       color: '#2d5a8a', sort_order: 3 },
  { id: 5, name: 'Journal',          category: 'soul',       color: '#5a7a3a', sort_order: 4 },
  { id: 6, name: 'No phone in bed',  category: 'discipline', color: '#8a5a2d', sort_order: 5 },
];

// Deterministic pseudo-random
const rand = (seed) => {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
};

// Local-date key (avoids UTC offset drift)
const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const logKey = (habitId, date) => `${habitId}|${date}`;

const generateData = () => {
  const today = new Date(2026, 4, 1); // May 1 2026
  const habits = HABIT_SEED.map((h) => ({
    ...h,
    created_at: '2026-01-01T00:00:00',
    archived_at: null,
  }));
  const habit_logs = {}; // { 'habitId|date': true }
  const day_notes  = {}; // { date: { note, intention, updated_at } }

  for (let i = 119; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const k = dateKey(d);
    habits.forEach((h, idx) => {
      const r = rand(i * 13.7 + idx * 3.1);
      const consistency = [0.78, 0.65, 0.82, 0.55, 0.48, 0.7][idx] || 0.6;
      const recency = i < 30 ? 0.12 : 0;
      if (r < (consistency + recency)) {
        habit_logs[logKey(h.id, k)] = true;
      }
    });
  }

  // Today: only first three completed
  const todayKey = dateKey(today);
  delete habit_logs[logKey(4, todayKey)];
  delete habit_logs[logKey(5, todayKey)];
  delete habit_logs[logKey(6, todayKey)];
  habit_logs[logKey(1, todayKey)] = true;
  habit_logs[logKey(2, todayKey)] = true;
  habit_logs[logKey(3, todayKey)] = true;

  day_notes[todayKey] = {
    note: 'Slow morning. Coffee was good. Felt the run today.',
    intention: 'Finish the proposal draft & send it before sundown.',
    updated_at: '2026-05-01T08:30:00',
  };

  const yKey = dateKey(new Date(2026, 4, 0));
  day_notes[yKey] = {
    note: 'Long call with M. — felt good to talk.',
    intention: 'Walk in the morning, read after dinner.',
    updated_at: '2026-04-30T22:10:00',
  };

  return { habits, habit_logs, day_notes };
};

// Helpers — read/write the normalized shape from React state
const isDone     = (logs, habitId, date) => !!logs[logKey(habitId, date)];
const getNote    = (notes, date) => (notes[date] && notes[date].note) || '';
const getIntent  = (notes, date) => (notes[date] && notes[date].intention) || '';

Object.assign(window, {
  HABIT_SEED, generateData, dateKey, logKey,
  isDone, getNote, getIntent,
});
