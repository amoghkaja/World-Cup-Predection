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
    // suppressHydrationWarning: the head script stamps data-theme on <html>
    // before hydration, so the attribute legitimately differs from the SSR HTML
    <html
      lang="en"
      className={`${archivo.variable} ${manrope.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Apply the saved theme before first paint (no flash). No saved
            choice → data-theme stays unset and CSS follows the system. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('wc-theme');if(t==='dark'||t==='light')document.documentElement.setAttribute('data-theme',t)}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <TimezoneCookie />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
