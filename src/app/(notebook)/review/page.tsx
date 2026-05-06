import { metrics } from "@/db/metrics";
import { Scribble } from "../../components/Scribble";
import { AutosaveTextarea } from "../../components/AutosaveTextarea";
import { saveReflection } from "../../actions";
import { habitColor, REVIEW_FILL } from "../../habit-colors";
import { getToday } from "../../date-utils";
import "./review.css";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  const todayDate = getToday();
  const review = metrics.getWeeklyReview(todayDate);

  const endDateObj = new Date(review.weekEndDate);
  const endStr = endDateObj.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page-spread single">
      <div className="page-single">
        <div className="page-header">
          <div>
            <div className="date-big">Weekly review</div>
            <div className="date-small">
              last 7 days &middot; ending {endStr}
            </div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Scribble width={160} seed={4.4} thickness={2} />
          </div>
        </div>

        <div className="review-summary">
          <div className="review-stat-big">
            <div className="rs-num">
              {review.pct}
              <span className="rs-pct">%</span>
            </div>
            <div className="rs-label">
              overall
              <br />
              completion
            </div>
          </div>

          <div className="review-stat-big">
            <div className="rs-num">
              {review.totalCompletions}
              <span className="rs-pct">/{review.possibleCompletions}</span>
            </div>
            <div className="rs-label">
              checks
              <br />
              this week
            </div>
          </div>

          {review.bestHabit && review.bestHabit.done > 0 && (
            <div className="review-stat-big">
              <div className="rs-num small">{review.bestHabit.habitName}</div>
              <div className="rs-label">
                most consistent &middot; {review.bestHabit.done}/7
              </div>
            </div>
          )}

          {review.worstHabit && (
            <div className="review-stat-big">
              <div className="rs-num small">{review.worstHabit.habitName}</div>
              <div className="rs-label">
                needs love &middot; {review.worstHabit.done}/7
              </div>
            </div>
          )}
        </div>

        <div className="two-col" style={{ marginTop: 28 }}>
          <div className="week-strip">
            <div className="block-label">
              <span className="prompt-arrow">&rarr;</span> This week, day by day
            </div>
            <div className="week-days">
              {review.days.map((d) => (
                <div
                  key={d.date}
                  className={`week-day${d.isToday ? " today" : ""}`}
                >
                  <div className="week-letter">{d.dayLetter}</div>
                  <div className="week-date">{d.dayNum}</div>
                  <div className="week-track">
                    {review.habits.map((h, hi) => {
                      const dayIdx = review.days.indexOf(d);
                      const done = h.days[dayIdx];
                      return (
                        <div key={h.habitId} className="week-tick">
                          {done ? (
                            <svg width="10" height="10" viewBox="0 0 10 10">
                              <path
                                d="M 1.5 5 L 4 7.5 L 8.5 2"
                                stroke={REVIEW_FILL}
                                strokeWidth="1.6"
                                fill="none"
                                strokeLinecap="round"
                              />
                            </svg>
                          ) : (
                            <div className="week-empty" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="review-block">
            <div className="block-label">
              <span className="prompt-arrow">&rarr;</span> Per habit
            </div>
            <div className="review-bars">
              {review.habits.map((h) => (
                <div key={h.habitId} className="review-row">
                  <span className="review-name">
                    <span className="cat-dot" style={{ background: habitColor(h.habitId), marginRight: 6 }} />
                    {h.habitName}
                  </span>
                  <div className="review-bar">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div
                        key={i}
                        className={`review-pip${h.days[i] ? " filled" : ""}`}
                      >
                        {h.days[i] && (
                          <svg
                            width="100%"
                            height="100%"
                            viewBox="0 0 14 14"
                            preserveAspectRatio="none"
                          >
                            <path
                              d={`M 1 ${4 + (i % 2)} L 13 ${4 + ((i + 1) % 2)} L 13 12 L 1 12 Z`}
                              fill={REVIEW_FILL}
                              opacity="0.85"
                            />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                  <span className="review-count">{h.done}/7</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <AutosaveTextarea
          defaultValue={review.reflection}
          onSave={async (value) => {
            "use server";
            await saveReflection(review.weekEndDate, value);
          }}
          label="Reflection"
          className="review-prompt"
          inputClassName="notes-input"
          placeholder="what worked? what didn't? what to change next week?"
          rows={5}
        />
      </div>
    </div>
  );
}
