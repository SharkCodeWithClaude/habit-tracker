import { DayView } from "../components/DayView";
import { getToday } from "../date-utils";

export const dynamic = "force-dynamic";

export default function TodayPage() {
  const today = getToday();
  return <DayView date={today} isToday />;
}
