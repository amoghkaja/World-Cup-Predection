"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";

type NavItem = { href: string; label: string; icon: string };

// Mobile bottom tab bar (5) and desktop sidebar (8).
const BOTTOM: NavItem[] = [
  { href: "/dashboard", label: "Matches", icon: "home" },
  { href: "/bracket", label: "Bracket", icon: "bracket" },
  { href: "/results", label: "Results", icon: "table" },
  { href: "/leaderboard", label: "Table", icon: "medal" },
  { href: "/profile", label: "Profile", icon: "user" },
];
const SIDE: NavItem[] = [
  { href: "/dashboard", label: "Matches", icon: "home" },
  { href: "/predictions", label: "My Predictions", icon: "list" },
  { href: "/results", label: "Results & Tables", icon: "table" },
  { href: "/bracket", label: "Knockout", icon: "bracket" },
  { href: "/groups", label: "Groups", icon: "grid" },
  { href: "/tournament", label: "Tournament picks", icon: "trophy" },
  { href: "/leaderboard", label: "Leaderboard", icon: "medal" },
  { href: "/scoring", label: "How scoring works", icon: "spark" },
  { href: "/profile", label: "Profile", icon: "user" },
];

// Routes without their own tab map onto Matches for the mobile highlight.
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

  const iconBtn = "grid place-items-center press";

  return (
    <div className="md:grid md:grid-cols-[232px_1fr] md:min-h-screen">
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex md:flex-col md:h-screen md:sticky md:top-0 border-r p-4"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}
      >
        <Link href="/dashboard" className="px-2 pt-1 pb-5 block">
          <Logo />
        </Link>
        <nav className="flex flex-col gap-0.5 flex-1">
          {side.map((n) => {
            const on = active(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className="flex items-center gap-3 px-3 rounded-[10px] text-[14px]"
                style={{
                  minHeight: 40,
                  background: on ? "var(--brand-soft)" : "transparent",
                  color: on ? "var(--brand-strong)" : "var(--text-2)",
                  fontWeight: on ? 700 : 550,
                }}
              >
                <Icon name={n.icon} size={19} sw={on ? 2.3 : 2} />
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>
        <Link
          href="/profile"
          className="flex items-center gap-3 p-2.5 rounded-xl border mt-3 lift"
          style={{ borderColor: "var(--line)", background: "var(--surface)" }}
        >
          <Avatar name={profile.display_name} src={profile.avatar_url} size={36} />
          <div className="min-w-0">
            <div className="font-bold text-[13.5px] truncate">
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
          className="md:hidden flex items-center justify-between pl-4 pr-3 border-b sticky top-0 z-20"
          style={{ background: "var(--surface)", borderColor: "var(--line)", height: 54 }}
        >
          <Link href="/dashboard" aria-label="Home">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/predictions"
              aria-label="My predictions"
              className={iconBtn}
              style={{ width: 44, height: 44, color: "var(--text-2)" }}
            >
              <Icon name="list" size={20} />
            </Link>
            {profile.is_admin && (
              <Link
                href="/admin/results"
                aria-label="Admin"
                className={iconBtn}
                style={{ width: 44, height: 44, color: "var(--text-2)" }}
              >
                <Icon name="settings" size={20} />
              </Link>
            )}
            <Link href="/profile" aria-label="Profile" className={iconBtn} style={{ width: 44, height: 44 }}>
              <Avatar name={profile.display_name} src={profile.avatar_url} size={32} />
            </Link>
          </div>
        </header>

        <main
          className="flex-1 w-full max-w-[1120px] mx-auto px-4 sm:px-6 pt-4 md:pt-6 md:pb-12"
          style={{ paddingBottom: "calc(var(--tabbar-h) + 18px)" }}
        >
          {children}
        </main>
      </div>

      {/* Mobile bottom tab bar — solid (no backdrop blur: it tanks scroll
          performance on low-end phones) */}
      <nav
        className="md:hidden fixed z-30 inset-x-0 bottom-0 grid grid-cols-5 border-t"
        style={{
          background: "var(--surface)",
          borderColor: "var(--line)",
          height: "var(--tabbar-h)",
          paddingBottom: "env(safe-area-inset-bottom)",
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
              aria-current={on ? "page" : undefined}
              className="relative flex flex-col items-center justify-center gap-0.5"
              style={{ color: on ? "var(--brand-strong)" : "var(--text-3)" }}
            >
              {/* active indicator */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  width: 36,
                  height: 3,
                  borderRadius: "0 0 3px 3px",
                  background: on ? "var(--brand)" : "transparent",
                }}
              />
              <Icon name={n.icon} size={21} sw={on ? 2.4 : 2} />
              <span style={{ fontSize: 10.5, fontWeight: on ? 750 : 600 }}>{n.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
