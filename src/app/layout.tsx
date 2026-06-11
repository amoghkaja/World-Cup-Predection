import type { Metadata, Viewport } from "next";
import { Archivo } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

// One variable font (weight + width axes) for headings, scores and labels;
// body copy uses the native system stack. A single woff2 replaces the eight
// font files we used to ship — fonts were a measurable chunk of mobile LCP.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "World Cup Pick'em 2026",
  description:
    "Predict every match of the 2026 World Cup and climb the leaderboard against your friends.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f4ec" },
    { media: "(prefers-color-scheme: dark)", color: "#121b16" },
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
    <html lang="en" className={`${archivo.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
