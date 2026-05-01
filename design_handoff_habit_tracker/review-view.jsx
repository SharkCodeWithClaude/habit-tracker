// Review view — this week + weekly review (moved off the main page)
const ReviewView = ({ habits, logs, ink, todayKey }) => {
  const [tyy, tmm, tdd] = todayKey.split('-').map(Number);
  const today = new Date(tyy, tmm - 1, tdd);

  const lastSeven = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    lastSeven.push({
      key: dateKey(d),
      day: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 1),
      date: d.getDate(),
      isToday: i === 0,
    });
  }

  const weekStats = habits.map((h) => {
    const done = lastSeven.filter((d) => isDone(logs, h.id, d.key)).length;
    return { ...h, done, total: 7 };
  });

  const totalCompletions = weekStats.reduce((s, h) => s + h.done, 0);
  const possibleCompletions = habits.length * 7;
  const pct = Math.round((totalCompletions / possibleCompletions) * 100);

  // best habit + needs work
  const sorted = [...weekStats].sort((a, b) => b.done - a.done);
  const best = sorted[0];
  const worst = sorted[sorted.length - 1];

  return (
    <div className="page-spread single">
      <div className="page page-single">
        <div className="page-header">
          <div>
            <div className="date-big">Weekly review</div>
            <div className="date-small">last 7 days · ending {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Scribble width={160} ink={ink} seed={4.4} thickness={2} />
          </div>
        </div>

        {/* Summary */}
        <div className="review-summary">
          <div className="review-stat-big">
            <div className="rs-num">{pct}<span className="rs-pct">%</span></div>
            <div className="rs-label">overall<br/>completion</div>
          </div>
          <div className="review-stat-big">
            <div className="rs-num">{totalCompletions}<span className="rs-pct">/{possibleCompletions}</span></div>
            <div className="rs-label">checks<br/>this week</div>
          </div>
          {best && best.done > 0 && (
            <div className="review-stat-big">
              <div className="rs-num small">{best.name}</div>
              <div className="rs-label">most consistent · {best.done}/7</div>
            </div>
          )}
          {worst && (
            <div className="review-stat-big">
              <div className="rs-num small">{worst.name}</div>
              <div className="rs-label">needs love · {worst.done}/7</div>
            </div>
          )}
        </div>

        <div className="two-col" style={{ marginTop: 28 }}>
          {/* Week strip */}
          <div className="week-strip">
            <div className="block-label">
              <span className="prompt-arrow">→</span> This week, day by day
            </div>
            <div className="week-days">
              {lastSeven.map((d) => (
                <div key={d.key} className={`week-day ${d.isToday ? 'today' : ''}`}>
                  <div className="week-letter">{d.day}</div>
                  <div className="week-date">{d.date}</div>
                  <div className="week-track">
                    {habits.map((h, i) => {
                      const done = isDone(logs, h.id, d.key);
                      return (
                        <div key={h.id} className="week-tick">
                          {done ? (
                            <svg width="10" height="10" viewBox="0 0 10 10">
                              <path d={`M 1.5 5 L 4 7.5 L 8.5 2`} stroke={ink} strokeWidth="1.6" fill="none" strokeLinecap="round" />
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

          {/* Per-habit bars */}
          <div className="review-block">
            <div className="block-label">
              <span className="prompt-arrow">→</span> Per habit
            </div>
            <div className="review-bars">
              {weekStats.map((h) => (
                <div key={h.id} className="review-row">
                  <span className="review-name">
                    <span className="cat-dot" style={{ background: h.color, marginRight: 6 }} />
                    {h.name}
                  </span>
                  <div className="review-bar">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className={`review-pip ${i < h.done ? 'filled' : ''}`}>
                        {i < h.done && (
                          <svg width="100%" height="100%" viewBox="0 0 14 14" preserveAspectRatio="none">
                            <path d={`M 1 ${4 + (i % 2)} L 13 ${4 + ((i + 1) % 2)} L 13 12 L 1 12 Z`} fill={ink} opacity="0.85" />
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

        <div className="review-prompt">
          <div className="block-label">
            <span className="prompt-arrow">→</span> Reflection
          </div>
          <textarea
            className="notes-input"
            placeholder="what worked? what didn't? what to change next week?"
            rows={5}
          />
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ReviewView });
