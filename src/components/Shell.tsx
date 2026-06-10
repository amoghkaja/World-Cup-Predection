"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";

type NavItem = { href: string; label: string; icon: string };

// Mobile bottom tab bar (5) and desktop sidebar (8) per the design handoff.
const BOTTOM: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/bracket", label: "Bracket", icon: "bracket" },
  { href: "/results", label: "Results", icon: "table" },
  { href: "/leaderboard", label: "Board", icon: "medal" },
  { href: "/profile", label: "Profile", icon: "user" },
];
const SIDE: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "home" },
  { href: "/predictions", label: "My Predictions", icon: "list" },
  { href: "/results", label: "Results & Tables", icon: "table" },
  { href: "/bracket", label: "Knockout", icon: "bracket" },
  { href: "/groups", label: "Groups", icon: "grid" },
  { href: "/tournament", label: "Tournament", icon: "trophy" },
  { href: "/leaderboard", label: "Leaderboard", icon: "medal" },
  { href: "/scoring", label: "How scoring works", icon: "spark" },
  { href: "/profile", label: "Profile", icon: "user" },
];

// Routes without their own tab map onto Home for the mobile highlight.
const HOME_ALIASES = ["/matches", "/predictions", "/tournament", "/scoring", "/admin", "/groups"];

export function Shell({
  profile,
  children,
}: {
  profile: { display_name: string | null; avatar_url: string | null; is_admin: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const side = profile.is_admin
    ? [...SIDE, { href: "/admin/results", label: "Admin", icon: "settings" }]
    : SIDE;

  const iconBtn =
    "grid place-items-center w-10 h-10 rounded-xl border press";

  return (
    <div className="md:grid md:grid-cols-[236px_1fr] md:min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 border-r p-5"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <Link href="/dashboard" className="px-2 pb-5 block">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-1 flex-1">
          {side.map((n) => {
            const on = active(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14.5px]"
                style={{
                  background: on ? "var(--brand-soft)" : "transparent",
                  color: on ? "var(--brand-strong)" : "var(--text-2)",
                  fontWeight: on ? 800 : 600,
                }}
              >
                <Icon name={n.icon} size={20} sw={on ? 2.3 : 2} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2.5 rounded-2xl border mt-3 lift"
          style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
        >
          <Avatar name={profile.display_name} src={profile.avatar_url} size={38} />
          <div className="min-w-0">
            <div className="font-extrabold text-[13.5px] truncate">
              {profile.display_name ?? "You"}
            </div>
            <div className="t-xs" style={{ color: "var(--text-3)" }}>
              View profile
            </div>
          </div>
        </Link>
      </aside>

      {/* Content column */}
      <div className="flex flex-col min-h-dvh">
        {/* Mobile top bar */}
        <header
          className="md:hidden flex items-center justify-between px-4 py-3 border-b sticky top-0 z-20"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <Link href="/dashboard">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/scoring"
              aria-label="How scoring works"
              className={iconBtn}
              style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text-2)" }}
            >
              <Icon name="spark" size={19} />
            </Link>
            <Link
              href="/predictions"
              aria-label="My predictions"
              className={iconBtn}
              style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text-2)" }}
            >
              <Icon name="list" size={19} />
            </Link>
            {profile.is_admin && (
              <Link
                href="/admin/results"
                aria-label="Admin"
                className={iconBtn}
                style={{ borderColor: "var(--line)", background: "var(--surface-2)", color: "var(--text-2)" }}
              >
                <Icon name="settings" size={19} />
              </Link>
            )}
            <Link href="/profile">
              <Avatar name={profile.display_name} src={profile.avatar_url} size={40} />
            </Link>
          </div>
        </header>

        <main className="flex-1 w-full max-w-[1120px] mx-auto px-4 sm:px-6 pt-5 pb-28 md:pb-12">
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed z-30 flex"
        style={{
          bottom: "calc(10px + env(safe-area-inset-bottom))",
          left: "50%",
          transform: "translateX(-50%)",
          gap: 2,
          padding: 6,
          borderRadius: 999,
          border: "1px solid var(--line)",
          background: "color-mix(in oklch, var(--surface) 76%, transparent)",
          WebkitBackdropFilter: "blur(14px)",
          backdropFilter: "blur(14px)",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        {BOTTOM.map((n) => {
          const on =
            active(n.href) ||
            (n.href === "/dashboard" && HOME_ALIASES.some((p) => pathname.startsWith(p)));
          return (
            <Link
              key={n.href}
              href={n.href}
              className="flex flex-col items-center gap-0.5"
              style={{
                color: on ? "var(--brand-strong)" : "var(--text-3)",
                padding: "7px 13px",
                borderRadius: 999,
                background: on ? "var(--brand-soft)" : "transparent",
                transition: "background .15s, color .15s",
              }}
            >
              <Icon name={n.icon} size={20} sw={on ? 2.4 : 2} />
              <span style={{ fontSize: 10, fontWeight: on ? 800 : 600 }}>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
