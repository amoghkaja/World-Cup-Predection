"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { Avatar } from "./Avatar";
import { CompSwitcher } from "./CompSwitcher";

type NavItem = { href: string; label: string; icon: string };

// Broadcast chrome: desktop = top app bar with inline nav (no sidebar);
// mobile = sticky app bar + bottom tab bar.
const DESKTOP_NAV: NavItem[] = [
  { href: "/dashboard", label: "Matches", icon: "home" },
  { href: "/predictions", label: "My picks", icon: "list" },
  { href: "/groups", label: "Groups", icon: "grid" },
  { href: "/bracket", label: "Bracket", icon: "bracket" },
  { href: "/tournament", label: "Trophy", icon: "trophy" },
  { href: "/results", label: "Results", icon: "table" },
  { href: "/leaderboard", label: "Board", icon: "medal" },
];
const TABS: NavItem[] = [
  { href: "/dashboard", label: "Matches", icon: "home" },
  { href: "/groups", label: "Groups", icon: "grid" },
  { href: "/bracket", label: "Bracket", icon: "bracket" },
  { href: "/results", label: "Results", icon: "table" },
  { href: "/leaderboard", label: "Board", icon: "medal" },
];

// Routes without their own tab map onto Matches for the mobile highlight.
const HOME_ALIASES = ["/matches", "/predictions", "/tournament", "/scoring", "/admin"];

export function Shell({
  profile,
  children,
}: {
  profile: { display_name: string | null; avatar_url: string | null; is_admin: boolean };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex flex-col min-h-dvh">
      {/* App bar — sticky, translucent, hairline bottom */}
      <header
        className="sticky top-0 z-30 border-b"
        style={{
          background: "color-mix(in oklab, var(--surface) 92%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderColor: "var(--line)",
        }}
      >
        <div
          className="flex items-center mx-auto w-full"
          style={{ maxWidth: 1280, gap: 10, padding: "10px 16px", minHeight: 56 }}
        >
          <Link href="/dashboard" aria-label="Home" className="press" style={{ flex: "none" }}>
            <Logo />
          </Link>
          <CompSwitcher compact />

          {/* Desktop inline nav */}
          <nav
            className="hidden md:flex items-center"
            style={{ gap: 2, marginLeft: 10, overflowX: "auto", scrollbarWidth: "none" }}
          >
            {DESKTOP_NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={`dnav-btn ${active(n.href) ? "on" : ""}`}
                aria-current={active(n.href) ? "page" : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <span style={{ flex: 1 }} />

          {/* Right cluster */}
          <Link
            href="/scoring"
            aria-label="How scoring works"
            title="How scoring works"
            className="hidden md:grid place-items-center press"
            style={{ width: 40, height: 40, borderRadius: 10, color: "var(--text-2)" }}
          >
            <Icon name="spark" size={19} />
          </Link>
          <Link
            href="/predictions"
            aria-label="My predictions"
            className="md:hidden grid place-items-center press"
            style={{ width: 42, height: 42, color: "var(--text-2)" }}
          >
            <Icon name="list" size={20} />
          </Link>
          {profile.is_admin && (
            <Link
              href="/admin/results"
              aria-label="Admin"
              className="grid place-items-center press"
              style={{ width: 42, height: 42, color: "var(--text-2)" }}
            >
              <Icon name="settings" size={20} />
            </Link>
          )}
          <Link href="/profile" aria-label="Profile" className="press" style={{ flex: "none" }}>
            <Avatar name={profile.display_name} src={profile.avatar_url} size={30} />
          </Link>
        </div>
      </header>

      <main
        className="flex-1 w-full mx-auto px-4 sm:px-6 pt-4 md:pt-6 md:pb-12"
        style={{ maxWidth: 1180, paddingBottom: "calc(var(--tabbar-h) + 18px)" }}
      >
        {children}
      </main>

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
        {TABS.map((n) => {
          const on =
            active(n.href) ||
            (n.href === "/dashboard" && HOME_ALIASES.some((p) => pathname.startsWith(p)));
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={on ? "page" : undefined}
              className="relative flex flex-col items-center justify-center press"
              style={{ gap: 3, color: on ? "var(--brand-strong)" : "var(--text-3)" }}
            >
              {/* active indicator — slides in with a pop */}
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  top: 0,
                  width: 36,
                  height: 3,
                  borderRadius: "0 0 3px 3px",
                  background: "var(--brand)",
                  transform: on ? "scaleX(1)" : "scaleX(0)",
                  transition: "transform .22s cubic-bezier(.2,.8,.3,1)",
                }}
              />
              <Icon name={n.icon} size={20} sw={on ? 2.3 : 1.8} />
              <span
                className="td"
                style={{ fontSize: 10, letterSpacing: "0.06em", fontWeight: on ? 800 : 700 }}
              >
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
