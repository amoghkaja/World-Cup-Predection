import type { Metadata, Viewport } from "next";
import { Archivo, Manrope } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { TimezoneCookie } from "@/components/TimezoneCookie";
import "./globals.css";

// Broadcast type pair: Archivo (display — headings, codes, numerals, labels)
// + Manrope (body). Both variable, one woff2 each.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "World Cup Pick'em 2026",
  description:
    "Predict every match of the 2026 World Cup and climb the leaderboard against your friends.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef0f3" },
    { media: "(prefers-color-scheme: dark)", color: "#131a26" },
  ],
  width: "device-width",
  initialScale: 1,
  // Lets the bottom tab bar extend into the iOS home-indicator area.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <TimezoneCookie />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
