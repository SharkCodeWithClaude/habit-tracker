import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Habit Tracker V2",
  description: "Personal habit tracking with conversational AI",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
