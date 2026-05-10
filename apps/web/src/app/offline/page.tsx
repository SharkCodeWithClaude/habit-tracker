import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline — Habit Tracker",
};

export default function OfflinePage() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100dvh",
        padding: "24px",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        backgroundColor: "var(--bg-soft)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "48px", marginBottom: "16px" }}>📡</div>
      <h1
        style={{
          fontSize: "var(--fs-2xl)",
          fontWeight: "var(--fw-semi)",
          margin: "0 0 8px",
        }}
      >
        You&apos;re offline
      </h1>
      <p
        style={{
          fontSize: "var(--fs-lg)",
          color: "var(--ink-soft)",
          maxWidth: "360px",
          lineHeight: "var(--lh-relaxed)",
        }}
      >
        Check your connection and try again. Your habits will be waiting for
        you.
      </p>
    </main>
  );
}
