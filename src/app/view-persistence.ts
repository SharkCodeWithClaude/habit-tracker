const STORAGE_KEY = "habit-tracker-last-view";

export type View = "today" | "calendar" | "review";

export function getLastView(): View {
  if (typeof window === "undefined") return "today";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "calendar") return "calendar";
  if (saved === "review") return "review";
  return "today";
}

export function saveLastView(view: View): void {
  localStorage.setItem(STORAGE_KEY, view);
}

export function viewToPath(view: View): string {
  if (view === "calendar") return "/calendar";
  if (view === "review") return "/review";
  return "/";
}

export function pathToView(pathname: string): View {
  if (pathname === "/calendar" || pathname.startsWith("/calendar")) return "calendar";
  if (pathname === "/review" || pathname.startsWith("/review")) return "review";
  return "today";
}
