"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Matches", icon: "⚽" },
  { href: "/bracket", label: "Bracket", icon: "🏆" },
  { href: "/groups", label: "Groups", icon: "🅰️" },
  { href: "/tournament", label: "Champion", icon: "👑" },
  { href: "/predictions", label: "My Picks", icon: "📋" },
  { href: "/leaderboard", label: "Ranking", icon: "📊" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
      {LINKS.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`btn ${active ? "btn-primary" : "btn-ghost"} text-sm whitespace-nowrap md:justify-start`}
          >
            <span aria-hidden>{l.icon}</span>
            <span>{l.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
