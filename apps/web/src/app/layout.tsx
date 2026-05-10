import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "@/otter-ds/styles/tokens.css";
import "@/otter-ds/styles/globals.css";
import "@/otter-ds/styles/components.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-newsreader",
});

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
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
