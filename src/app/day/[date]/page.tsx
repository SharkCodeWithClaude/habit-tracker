import { DayView } from "../../components/DayView";
import { NotebookShell } from "../../components/NotebookShell";
import { getToday } from "../../date-utils";
import Link from "next/link";
import "../../notebook.css";

export const dynamic = "force-dynamic";

interface DayPageProps {
  params: Promise<{ date: string }>;
}

export default async function DayPage({ params }: DayPageProps) {
  const { date } = await params;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return (
      <div className="notebook-page">
        <div className="notebook">
          <div className="page-spread single">
            <div className="page-single">
              <p>Invalid date format. Use YYYY-MM-DD.</p>
              <Link href="/calendar">&larr; Back to calendar</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const todayDate = getToday();

  const isToday = date === todayDate;

  return (
    <NotebookShell>
      <DayView date={date} isToday={isToday} />
    </NotebookShell>
  );
}
