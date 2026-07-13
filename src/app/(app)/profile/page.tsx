import Link from "next/link";
import {
  getLeaderboard,
  getProfile,
  getBoardView,
  applyNoGambleView,
  getMyPointsBreakdown,
} from "@/lib/queries";
import { accuracyPct } from "@/lib/scoring";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { ProfileEditor } from "@/components/ProfileEditor";
import { AvatarToggle } from "@/components/AvatarToggle";
import { PointsBreakdown } from "@/components/PointsBreakdown";
import { ThemeToggle } from "@/components/ThemeToggle";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const [profile, real, view, breakdown] = await Promise.all([
    getProfile(),
    getLeaderboard(),
    getBoardView(),
    getMyPointsBreakdown(),
  ]);

  const norisk = view === "norisk";
  const board = norisk ? applyNoGambleView(real) : real;
  const my = board.find((r) => r.user_id === profile!.id) ?? null;
  const rank = my?.rank ?? null;
  const acc = my ? accuracyPct(my) : 0;

  const name = profile?.display_name ?? "You";

  const stats: { label: string; value: string | number; icon: string; gold?: boolean }[] = [
    { label: "Total points", value: my?.total_points ?? 0, icon: "bolt", gold: true },
    { label: "League rank", value: rank ? `#${rank}` : "—", icon: "medal" },
    { label: "Correct picks", value: my?.correct_matches ?? 0, icon: "target" },
    { label: "Accuracy", value: `${acc}%`, icon: "spark" },
  ];

  const links: { title: string; sub: string; icon: string; href: string }[] = [
    { title: "My Predictions", sub: "List of every call you've made", icon: "list", href: "/predictions" },
    { title: "How scoring works", sub: "Points & bonuses explained", icon: "spark", href: "/scoring" },
    { title: "Tournament picks", sub: "Champion, finalist & golden boot", icon: "trophy", href: "/tournament" },
    { title: "Knockout bracket", sub: "Your path to the final", icon: "bracket", href: "/bracket" },
  ];

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 640 }}>
      {/* header card */}
      <div className="card flex items-center mb-[18px]" style={{ padding: "18px 20px", gap: 16 }}>
        <Avatar
          name={name}
          src={profile?.hide_avatar ? null : profile?.avatar_url}
          size={64}
        />
        <div className="min-w-0">
          <h1 className="t-h1 truncate">{name}</h1>
          <div className="t-sm" style={{ color: "var(--text-3)", marginTop: 2 }}>
            {my?.total_points ?? 0} pts
            {rank ? ` · rank #${rank}` : ""}
          </div>
          {norisk && (
            <div className="t-xs" style={{ color: "var(--gold-strong)", marginTop: 2, fontWeight: 700 }}>
              🙈 no-gambles view · not your real total
            </div>
          )}
        </div>
      </div>

      {/* stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-[18px]">
        {stats.map((s) => (
          <div key={s.label} className="card flex items-center gap-3.5" style={{ padding: "16px 18px" }}>
            <div
              className="grid place-items-center"
              style={{
                width: 44,
                height: 44,
                borderRadius: 13,
                flex: "none",
                background: s.gold ? "var(--gold-soft)" : "var(--brand-soft)",
                color: s.gold ? "var(--gold-strong)" : "var(--brand-strong)",
              }}
            >
              <Icon name={s.icon} size={22} />
            </div>
            <div>
              <div
                className="tnum"
                style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 26 }}
              >
                {s.value}
              </div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>
                {s.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* points split — total points is only the headline; show the sources */}
      <PointsBreakdown data={breakdown} norisk={norisk} />

      {/* nav links */}
      <div className="card mb-[18px]" style={{ overflow: "hidden" }}>
        {links.map((l, i) => (
          <Link
            key={l.href}
            href={l.href}
            className="flex items-center gap-3.5 rowh press"
            style={{
              padding: "15px 18px",
              borderTop: i ? "1px solid var(--line)" : "none",
            }}
          >
            <div
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                flex: "none",
                background: "var(--surface-2)",
                color: "var(--text-2)",
              }}
            >
              <Icon name={l.icon} size={19} />
            </div>
            <div className="flex-1 min-w-0">
              <div style={{ fontWeight: 700, fontSize: 15 }}>{l.title}</div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>
                {l.sub}
              </div>
            </div>
            <Icon name="chevR" size={18} style={{ color: "var(--text-3)" }} />
          </Link>
        ))}
      </div>

      {/* appearance */}
      <div className="card mb-[18px] flex items-center" style={{ padding: "12px 18px", gap: 14 }}>
        <div className="flex-1">
          <div style={{ fontWeight: 700, fontSize: 15 }}>Appearance</div>
          <div className="t-xs" style={{ color: "var(--text-3)" }}>
            Light or dark — your choice sticks on this device
          </div>
        </div>
        <ThemeToggle />
      </div>

      {/* edit display name */}
      <div className="card mb-[18px]" style={{ padding: 18 }}>
        <div className="flex items-center gap-2 mb-3" style={{ color: "var(--text-2)" }}>
          <Icon name="edit" size={18} />
          <span className="t-h3">Edit profile</span>
        </div>
        <div className="flex flex-col gap-4">
          <ProfileEditor initialName={profile?.display_name ?? ""} />
          <AvatarToggle
            name={name}
            avatarUrl={profile?.avatar_url ?? null}
            initialHidden={profile?.hide_avatar ?? false}
          />
        </div>
      </div>

      {/* sign out */}
      <div className="card" style={{ padding: 6 }}>
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="flex items-center gap-3.5 w-full text-left press"
            style={{ padding: 12, background: "transparent", border: "none", borderRadius: 14 }}
          >
            <div
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                flex: "none",
                background: "var(--surface-2)",
                color: "var(--bad)",
              }}
            >
              <Icon name="logout" size={19} />
            </div>
            <div className="flex-1">
              <div style={{ fontWeight: 700, fontSize: 15 }}>Sign out</div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>
                End your session on this device
              </div>
            </div>
            <Icon name="chevR" size={18} style={{ color: "var(--text-3)" }} />
          </button>
        </form>
      </div>
    </div>
  );
}
