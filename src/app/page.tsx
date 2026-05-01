import { DayView } from "./components/DayView";
import Link from "next/link";
import "./notebook.css";

export const dynamic = "force-dynamic";

function getToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function TodayPage() {
  const today = getToday();
  const year = new Date().getFullYear();

  return (
    <div className="notebook-page">
      <div className="notebook">
        <nav className="notebook-nav">
          <div className="nav-title">&mdash; habit journal &middot; {year} &mdash;</div>
          <div className="nav-tabs">
            <Link href="/" className="nav-tab active">
              Today
            </Link>
            <Link href="/calendar" className="nav-tab">
              Calendar
            </Link>
          </div>
        </nav>

        <DayView date={today} isToday />
      </div>
    </div>
  );
}
