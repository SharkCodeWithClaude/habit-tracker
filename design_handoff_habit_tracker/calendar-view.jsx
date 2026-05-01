// Calendar / Heatmap View
const monthName = (m) => ['January','February','March','April','May','June','July','August','September','October','November','December'][m];

const CalendarView = ({ habits, logs, ink, todayKey }) => {
  const [_tyy, _tmm, _tdd] = todayKey.split('-').map(Number);
  const today = new Date(_tyy, _tmm - 1, _tdd);

  const [viewMonth, setViewMonth] = React.useState(today.getMonth());
  const [viewYear, setViewYear] = React.useState(today.getFullYear());
  const [flipDir, setFlipDir] = React.useState(0);
  const [flipping, setFlipping] = React.useState(false);

  const flip = (dir) => {
    if (flipping) return;
    setFlipDir(dir);
    setFlipping(true);
    setTimeout(() => {
      let m = viewMonth + dir;
      let y = viewYear;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      setViewMonth(m);
      setViewYear(y);
    }, 280);
    setTimeout(() => {
      setFlipping(false);
      setFlipDir(0);
    }, 560);
  };

  const buildHeatmap = (habitId) => {
    const cells = [];
    const end = new Date(_tyy, _tmm - 1, _tdd);
    const cols = 18;
    const startDay = new Date(end);
    startDay.setDate(startDay.getDate() - (cols * 7) + 1);
    while (startDay.getDay() !== 0) startDay.setDate(startDay.getDate() - 1);

    for (let c = 0; c < cols; c++) {
      const week = [];
      for (let r = 0; r < 7; r++) {
        const d = new Date(startDay);
        d.setDate(d.getDate() + c * 7 + r);
        const k = dateKey(d);
        const past = d <= end;
        const has = isDone(logs, habitId, k);
        week.push({ key: k, past, has, date: d });
      }
      cells.push(week);
    }
    return cells;
  };

  const habitStats = habits.map((h) => {
    let total = 0, total30 = 0, bestStreak = 0, curStreak = 0;
    Object.keys(logs).forEach((k) => {
      const [hid] = k.split('|');
      if (Number(hid) === h.id) total++;
    });
    // streak walk - just walk last 365 days
    const d = new Date(_tyy, _tmm - 1, _tdd);
    let s = 0;
    for (let i = 0; i < 365; i++) {
      const k = dateKey(d);
      if (isDone(logs, h.id, k)) {
        s++;
        bestStreak = Math.max(bestStreak, s);
      } else {
        s = 0;
      }
      d.setDate(d.getDate() - 1);
    }
    for (let i = 0; i < 30; i++) {
      const dd = new Date(_tyy, _tmm - 1, _tdd);
      dd.setDate(dd.getDate() - i);
      const k = dateKey(dd);
      if (isDone(logs, h.id, k)) total30++;
    }
    return { ...h, total, total30, bestStreak };
  });

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const startCol = firstOfMonth.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const completionForDate = (year, month, day) => {
    const d = new Date(year, month, day);
    if (d > today) return -1;
    const k = dateKey(d);
    const done = habits.filter((h) => isDone(logs, h.id, k)).length;
    return done / habits.length;
  };

  return (
    <div className="page-spread calendar-spread">
      <div className="page page-left">
        <div className="page-header">
          <div>
            <div className="date-big">{monthName(viewMonth)}</div>
            <div className="date-small">{viewYear} · monthly view</div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Scribble width={140} ink={ink} seed={3.1} thickness={2} />
          </div>
        </div>

        <div className="month-nav">
          <button className="month-nav-btn" onClick={() => flip(-1)} aria-label="Previous month">
            <svg width="22" height="22" viewBox="0 0 22 22"><path d="M14 5 L7 11 L14 17" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <div className="month-nav-label">flip page</div>
          <button className="month-nav-btn" onClick={() => flip(1)} aria-label="Next month">
            <svg width="22" height="22" viewBox="0 0 22 22"><path d="M8 5 L15 11 L8 17" stroke={ink} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </div>

        <div className={`month-paper-wrap ${flipping ? `flipping flip-${flipDir > 0 ? 'next' : 'prev'}` : ''}`}>
          <div className="month-paper">
            <div className="month-grid-head">
              {['S','M','T','W','T','F','S'].map((d, i) => (
                <div key={i} className="month-head-cell">{d}</div>
              ))}
            </div>
            <div className="month-grid">
              {Array.from({ length: startCol }).map((_, i) => (
                <div key={`pad-${i}`} className="month-cell empty" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const completion = completionForDate(viewYear, viewMonth, day);
                const isToday = viewYear === today.getFullYear() && viewMonth === today.getMonth() && day === today.getDate();
                const isFuture = completion === -1 && new Date(viewYear, viewMonth, day) > today;
                return (
                  <div key={day} className={`month-cell ${isToday ? 'is-today' : ''} ${isFuture ? 'is-future' : ''}`}>
                    <div className="month-cell-num">{day}</div>
                    {!isFuture && (
                      <div className="month-cell-marks">
                        {habits.map((h) => {
                          const k = dateKey(new Date(viewYear, viewMonth, day));
                          const done = isDone(logs, h.id, k);
                          return (
                            <div key={h.id} className={`mc-pip ${done ? 'done' : ''}`} style={done ? { background: ink } : { borderColor: ink + '55' }} />
                          );
                        })}
                      </div>
                    )}
                    {isToday && (
                      <svg className="today-circle" viewBox="0 0 60 60" preserveAspectRatio="none">
                        <ellipse cx="30" cy="30" rx="26" ry="24" fill="none" stroke={ink} strokeWidth="1.6" strokeDasharray="2 1.5" opacity="0.7"/>
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="month-legend">
          {habits.map((h) => (
            <div key={h.id} className="legend-item">
              <span className="legend-pip" style={{ background: ink }} />
              <span className="legend-name">{h.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="page page-right">
        <div className="block-label" style={{ marginBottom: 14 }}>
          <span className="prompt-arrow">→</span> Last 18 weeks
          <span className="label-meta">heatmap by habit</span>
        </div>
        <div className="heatmap-list">
          {habits.map((h, hi) => {
            const cells = buildHeatmap(h.id);
            const stat = habitStats.find((s) => s.id === h.id);
            return (
              <div key={h.id} className="heatmap-row">
                <div className="heatmap-row-head">
                  <div className="heatmap-name">
                    <span className="cat-dot" style={{ background: h.color }} />
                    {h.name}
                  </div>
                  <div className="heatmap-stats">
                    <span><b>{stat.total30}</b><i>/30d</i></span>
                    <span><b>{stat.bestStreak}</b><i>best</i></span>
                  </div>
                </div>
                <div className="heatmap-grid">
                  {cells.map((week, ci) => (
                    <div key={ci} className="heatmap-col">
                      {week.map((cell, ri) => (
                        <div key={ri} className={`hm-cell ${!cell.past ? 'future' : ''} ${cell.has ? 'done' : ''}`}>
                          {cell.past && cell.has && (
                            <InkDot intensity={1} size={11} ink={ink} seed={hi * 7 + ci * 3 + ri} />
                          )}
                          {cell.past && !cell.has && (
                            <div className="hm-empty-dot" style={{ background: ink + '15' }} />
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="heatmap-axis">
          <span>~4 months ago</span>
          <span>today</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { CalendarView });
