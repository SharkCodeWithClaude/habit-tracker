import { storage } from "@/db/storage";
import { InkDot } from "./InkDot";

const WEEKS = 18;

function isFuture(dateStr: string, todayStr: string): boolean {
  return dateStr > todayStr;
}

export function HeatmapSection({ todayDate }: { todayDate: string }) {
  const rows = storage.getHeatmapData(WEEKS);

  if (rows.length === 0) return null;

  return (
    <div className="page page-right">
      <div className="block-label" style={{ marginBottom: 14 }}>
        <span className="prompt-arrow">&rarr;</span> Last 18 weeks
        <span className="label-meta">heatmap by habit</span>
      </div>
      <div className="heatmap-list">
        {rows.map((row, hi) => (
          <div key={row.habitId} className="heatmap-row">
            <div className="heatmap-row-head">
              <div className="heatmap-name">
                <span className="cat-dot" />
                {row.habitName}
              </div>
              <div className="heatmap-stats">
                <span>
                  <b>{row.total30}</b>
                  <i>/30d</i>
                </span>
                <span>
                  <b>{row.bestStreak}</b>
                  <i>best</i>
                </span>
              </div>
            </div>
            <div className="heatmap-grid">
              {row.weeks.map((week, ci) => (
                <div key={ci} className="heatmap-col">
                  {week.map((cell, ri) => {
                    const future = isFuture(cell.date, todayDate);
                    return (
                      <div
                        key={ri}
                        className={`hm-cell${future ? " future" : ""}${cell.done ? " done" : ""}`}
                      >
                        {!future && cell.done && (
                          <InkDot size={11} seed={hi * 7 + ci * 3 + ri} />
                        )}
                        {!future && !cell.done && (
                          <div className="hm-empty-dot" />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="heatmap-axis">
        <span>~4 months ago</span>
        <span>today</span>
      </div>
    </div>
  );
}
