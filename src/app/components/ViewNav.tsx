"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { pathToView, saveLastView } from "../view-persistence";

export function ViewNav({ year }: { year: number }) {
  const pathname = usePathname();
  const current = pathToView(pathname);

  useEffect(() => {
    saveLastView(current);
  }, [current]);

  return (
    <nav className="notebook-nav">
      <div className="nav-title">&mdash; habit journal &middot; {year} &mdash;</div>
      <div className="nav-tabs">
        <Link href="/" className={`nav-tab ${current === "today" ? "active" : ""}`}>
          Today
        </Link>
        <Link href="/calendar" className={`nav-tab ${current === "calendar" ? "active" : ""}`}>
          Calendar
        </Link>
        <Link href="/review" className={`nav-tab ${current === "review" ? "active" : ""}`}>
          Review
        </Link>
      </div>
    </nav>
  );
}
