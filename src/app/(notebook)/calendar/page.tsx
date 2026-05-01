import { Suspense } from "react";
import { storage } from "@/db/storage";
import { parseYearMonth } from "../../calendar/calendar-utils";
import { MonthGrid } from "../../calendar/MonthGrid";
import { HeatmapSection } from "../../components/HeatmapSection";
import "../../calendar/calendar.css";

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
    <div className="page-spread calendar-spread">
      <div className="page page-left">
        <MonthGrid
          year={year}
          month={month}
          days={days}
          habits={habits}
          todayDate={todayDate}
        />
      </div>
      <HeatmapSection todayDate={todayDate} />
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
