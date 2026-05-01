import { DayView } from "../../components/DayView";
import Link from "next/link";
import "../../notebook.css";

export const dynamic = "force-dynamic";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

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
  const [yy, mm] = date.split("-").map(Number);

  return (
    <div className="notebook-page">
      <div className="notebook">
        <nav className="notebook-nav">
          <div className="nav-title">&mdash; habit journal &middot; {yy} &mdash;</div>
          <div className="nav-tabs">
            <Link href="/" className="nav-tab">
              Today
            </Link>
            <Link href={`/calendar?ym=${yy}-${String(mm).padStart(2, "0")}`} className="nav-tab active">
              Calendar
            </Link>
          </div>
        </nav>

        <DayView date={date} isToday={isToday} />
      </div>
    </div>
  );
}
