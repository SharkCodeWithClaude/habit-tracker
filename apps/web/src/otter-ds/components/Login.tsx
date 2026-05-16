"use client";

import * as React from "react";
import Icon from "./Icon";

export interface LoginProps {
  /** Layout variant — split with a journal-entry vignette (default), or single centered card. */
  layout?: "centered" | "split";
  /** Primary CTA color — neutral dark ink (default) or the accent blue. */
  accent?: "ink" | "blue";
  /** Heading style — sans (default) or serif (editorial). */
  headingStyle?: "serif" | "sans";
  /** Brand mark image src. */
  brandImgSrc?: string;
  /** Brand title above the form. */
  title?: string;
  /** Subtitle under the brand title. */
  subtitle?: string;
  /** Optional override for the journal vignette in the split layout. */
  vignette?: {
    date?: string;
    /** Entry text. Wrap highlighted phrases in <em>…</em>. */
    entry?: React.ReactNode;
    chips?: { emoji: string; label: string }[];
    streakDays?: number;
    streakNote?: string;
  };
  /** Email submit handler. Resolve to throw an Error for the error banner. */
  onSubmit?: (data: { email: string; password: string; remember: boolean }) => Promise<void> | void;
  /** "Continue with Google" handler. Hide button by setting to null. */
  onGoogle?: (() => void) | null;
  /** Magic-link handler. Hide button by setting to null. */
  onMagicLink?: ((email: string) => Promise<void> | void) | null;
  /** Forgot-password handler. */
  onForgot?: () => void;
  /** Sign-up handler. */
  onSignUp?: () => void;
}

export function Login({
  layout = "split",
  accent = "ink",
  headingStyle = "sans",
  brandImgSrc = "/otter.png",
  title = "Welcome back",
  subtitle = "Sign back in to your journal.",
  vignette,
  onSubmit,
  onGoogle,
  onMagicLink,
  onForgot,
  onSignUp,
}: LoginProps) {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [remember, setRemember] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [magicSent, setMagicSent] = React.useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await onSubmit?.({ email, password, remember });
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const sendMagic = async () => {
    if (!email) {
      setError("Enter your email first — we'll send you a sign-in link.");
      return;
    }
    setError(null);
    try {
      await onMagicLink?.(email);
      setMagicSent(email);
    } catch (err: any) {
      setError(err?.message || "Couldn't send link. Try again.");
    }
  };

  const card = (
    <div className="otr-auth-card">
      <div className="otr-auth-brand">
        <img src={brandImgSrc} alt="Otter" className="otr-auth-brand-img" />
        <h1 className={`otr-auth-title ${headingStyle === "serif" ? "serif" : ""}`}>{title}</h1>
        <p className="otr-auth-sub">{subtitle}</p>
      </div>

      {error && (
        <div className="otr-error" role="alert">
          <Icon.X style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      {magicSent && (
        <div className="otr-magic-success" role="status">
          <Icon.Check style={{ width: 14, height: 14, marginTop: 1, flexShrink: 0 }} />
          <span>Sign-in link sent to <b>{magicSent}</b>. Check your inbox.</span>
        </div>
      )}

      <form className="otr-form" onSubmit={submit}>
        <div className="otr-field">
          <label className="otr-label" htmlFor="otr-email">Email</label>
          <input
            id="otr-email"
            type="email"
            autoComplete="email"
            className="otr-input"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="otr-field">
          <div className="otr-field-row">
            <label className="otr-label" htmlFor="otr-pw">Password</label>
            <button type="button" className="otr-field-link" onClick={onForgot}>
              Forgot?
            </button>
          </div>
          <div className="otr-input-wrap">
            <input
              id="otr-pw"
              type={show ? "text" : "password"}
              autoComplete="current-password"
              className="otr-input has-trailing"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="otr-input-trail"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((s) => !s)}
            >
              {show ? <EyeOff /> : <EyeOn />}
            </button>
          </div>
        </div>

        <label className="otr-checkbox-row">
          <button
            type="button"
            className={`otr-checkbox ${remember ? "on" : ""}`}
            onClick={() => setRemember((r) => !r)}
            aria-pressed={remember}
          >
            <Icon.Check style={{ width: 10, height: 10 }} />
          </button>
          <span>Keep me signed in on this device</span>
        </label>

        <button
          type="submit"
          className={`otr-btn primary ${accent === "blue" ? "accent" : ""}`}
          disabled={loading}
        >
          {loading ? "Signing in…" : "Continue"}
        </button>
      </form>

      {(onGoogle || onMagicLink) && (
        <>
          <div className="otr-divider">or</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {onGoogle && (
              <button type="button" className="otr-btn outline" onClick={onGoogle}>
                <span className="otr-btn-mark"><GoogleMark /></span>
                Continue with Google
              </button>
            )}
            {onMagicLink && (
              <button type="button" className="otr-btn outline" onClick={sendMagic}>
                <span className="otr-btn-mark"><Icon.Sparkle /></span>
                Email me a sign-in link
              </button>
            )}
          </div>
        </>
      )}

      <div className="otr-auth-foot">
        New to Otter? <button type="button" onClick={onSignUp}>Create an account</button>
      </div>
    </div>
  );

  if (layout === "split") {
    const v = {
      date: "Saturday, May 9",
      entry: (
        <>
          Went for a <em>long run before breakfast</em> and got through about{" "}
          <em>30 pages</em> of the book. Sat for ten minutes after — surprisingly clear.
        </>
      ),
      chips: [
        { emoji: "🏃", label: "Workout" },
        { emoji: "📖", label: "Read · 30 pages" },
        { emoji: "🧘", label: "Meditate" },
      ],
      streakDays: 38,
      streakNote: "longest yet — keep going.",
      ...vignette,
    };
    return (
      <div className="otr-auth-scene split">
        <div className="otr-auth-pane">{card}</div>
        <aside className="otr-auth-aside">
          <div className="otr-auth-aside-inner">
            <div className="otr-auth-aside-date">{v.date}</div>
            <p className="otr-auth-entry">{v.entry}</p>
            <div>
              <div className="otr-auth-noticed">
                <Icon.Sparkle className="otr-auth-noticed-spark" />
                Otter noticed
              </div>
              <div className="otr-auth-chips">
                {v.chips!.map((c, i) => (
                  <span key={i} className="otr-auth-chip">
                    <span className="otr-auth-chip-dot" />
                    <span className="otr-auth-chip-emoji">{c.emoji}</span> {c.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="otr-auth-streak">
              <span className="otr-auth-streak-num">{v.streakDays}</span>
              <span>
                day streak
                <br />
                <span style={{ color: "var(--ink-faint)" }}>{v.streakNote}</span>
              </span>
            </div>
          </div>
        </aside>
      </div>
    );
  }

  return (
    <div className="otr-auth-scene">
      <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column" }}>
        {card}
        <p className="otr-fine">
          By continuing you agree to Otter's <a href="#">Terms</a> and <a href="#">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}

/* ---------- Inline icons local to this component ---------- */
const EyeOn = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M1.5 8s2.5-4.5 6.5-4.5S14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z" />
    <circle cx="8" cy="8" r="2" />
  </svg>
);
const EyeOff = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 8s2.5-4.5 6.5-4.5c1.1 0 2.1.3 3 .8" />
    <path d="M14 8s-1.1 2-3 3.3" />
    <path d="M9.5 9.5a2 2 0 0 1-2.8-2.8" />
    <path d="M2 2l12 12" />
  </svg>
);
/* Neutral, original "G" mark — not the trademarked Google logo. */
const GoogleMark = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M13.5 8a5.5 5.5 0 1 1-1.6-3.9" />
    <path d="M8 8h5.5" />
  </svg>
);

export default Login;
