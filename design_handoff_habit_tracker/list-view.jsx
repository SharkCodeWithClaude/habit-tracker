// List View — today's spread (focused on intention + habits + notes only)
const ListView = ({ habits, logs, notes, setLogs, setNotes, ink, todayKey }) => {
  const intention = getIntent(notes, todayKey);
  const note = getNote(notes, todayKey);

  const setIntention = (v) => {
    setNotes((n) => ({
      ...n,
      [todayKey]: {
        ...(n[todayKey] || { note: '', intention: '' }),
        intention: v,
        updated_at: new Date().toISOString(),
      },
    }));
  };
  const setNote = (v) => {
    setNotes((n) => ({
      ...n,
      [todayKey]: {
        ...(n[todayKey] || { note: '', intention: '' }),
        note: v,
        updated_at: new Date().toISOString(),
      },
    }));
  };
  const toggleHabit = (habitId) => {
    setLogs((l) => {
      const k = logKey(habitId, todayKey);
      const next = { ...l };
      if (next[k]) delete next[k];
      else next[k] = true;
      return next;
    });
  };

  const computeStreak = (habitId) => {
    let streak = 0;
    const [yy, mm, dd] = todayKey.split('-').map(Number);
    const d = new Date(yy, mm - 1, dd);
    for (let i = 0; i < 365; i++) {
      const k = dateKey(d);
      if (isDone(logs, habitId, k)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        if (i === 0) {
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return streak;
  };

  const [tyy, tmm, tdd] = todayKey.split('-').map(Number);
  const today = new Date(tyy, tmm - 1, tdd);
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const doneCount = habits.filter((h) => isDone(logs, h.id, todayKey)).length;

  return (
    <div className="page-spread single">
      <div className="page page-single">
        <div className="page-header">
          <div>
            <div className="date-big">{dateStr.split(',')[0]}</div>
            <div className="date-small">{dateStr.split(',').slice(1).join(',').trim()} · 2026</div>
          </div>
          <div style={{ marginTop: 4 }}>
            <Scribble width={140} ink={ink} seed={2.1} thickness={2} />
          </div>
        </div>

        <div className="intention-block">
          <div className="block-label">
            <span className="prompt-arrow">→</span> The great thing I will do today
          </div>
          <textarea
            className="intention-input"
            value={intention}
            onChange={(e) => setIntention(e.target.value)}
            placeholder="write your one intention here…"
            rows={2}
          />
        </div>

        <div className="two-col">
          <div className="habits-block">
            <div className="block-label">
              <span className="prompt-arrow">→</span> Habits
              <span className="label-meta">{doneCount} / {habits.length}</span>
            </div>
            <div className="habit-list">
              {habits.map((h, i) => {
                const checked = isDone(logs, h.id, todayKey);
                const streak = computeStreak(h.id);
                return (
                  <div key={h.id} className={`habit-row ${checked ? 'done' : ''}`}>
                    <InkCheckbox
                      checked={checked}
                      onToggle={() => toggleHabit(h.id)}
                      size={26}
                      ink={ink}
                      seed={i + 1}
                    />
                    <div className="habit-name-wrap">
                      <span className="habit-name">{h.name}</span>
                      {checked && <span className="habit-strikethrough" />}
                    </div>
                    <div className="habit-meta">
                      <span className="cat-dot" style={{ background: h.color }} title={h.category} />
                      {streak > 0 && (
                        <span className="streak">
                          <span className="streak-num">{streak}</span>
                          <span className="streak-label">d</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="add-habit">
              <span className="prompt-arrow" style={{ opacity: 0.4 }}>+</span>
              <span style={{ opacity: 0.5, fontStyle: 'italic' }}>add another habit…</span>
            </div>
          </div>

          <div className="notes-block">
            <div className="block-label">
              <span className="prompt-arrow">→</span> Notes
            </div>
            <textarea
              className="notes-input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="anything worth remembering…"
              rows={10}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { ListView });
