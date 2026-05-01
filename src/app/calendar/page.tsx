import { Suspense } from "react";
import { storage } from "@/db/storage";
import { parseYearMonth } from "./calendar-utils";
import { MonthGrid } from "./MonthGrid";
import Link from "next/link";
import "../notebook.css";
import "./calendar.css";

export const dynamic = "force-dynamic";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface CalendarPageProps {
  searchParams: Promise<{ ym?: string }>;
}

async function CalendarContent({ searchParams }: CalendarPageProps) {
  const params = await searchParams;
  const { year, month } = parseYearMonth(params.ym);
  const days = storage.getMonth(year, month);
  const habits = storage.getActiveHabits();
  const todayDate = getToday();

  return (
    <div className="notebook-page">
      <div className="notebook">
        <nav className="notebook-nav">
          <div className="nav-title">&mdash; habit journal &middot; {year} &mdash;</div>
          <div className="nav-tabs">
            <Link href="/" className="nav-tab">
              Today
            </Link>
            <Link href="/calendar" className="nav-tab active">
              Calendar
            </Link>
          </div>
        </nav>

        <div className="page-spread">
          <div className="page">
            <MonthGrid
              year={year}
              month={month}
              days={days}
              habits={habits}
              todayDate={todayDate}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage(props: CalendarPageProps) {
  return (
    <Suspense>
      <CalendarContent {...props} />
    </Suspense>
  );
}
