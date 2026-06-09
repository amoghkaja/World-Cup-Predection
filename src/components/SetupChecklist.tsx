import Link from "next/link";
import { Icon } from "./Icon";

// Prominent nudge on the dashboard until a new player has made their
// pre-tournament picks (these lock at the first kickoff).
export function SetupChecklist({
  championSet,
  groupsDone,
  groupsTotal,
  goldenSet,
  goldenRequired,
}: {
  championSet: boolean;
  groupsDone: number;
  groupsTotal: number;
  goldenSet: boolean;
  goldenRequired?: boolean;
}) {
  const items = [
    {
      done: championSet,
      label: "Pick your podium",
      sub: "Champion, runner-up & third place — worth the most points",
      href: "/tournament",
      icon: "trophy",
    },
    {
      done: groupsDone >= groupsTotal,
      label: `Call the group top two (${groupsDone}/${groupsTotal})`,
      sub: "Pick who finishes 1st & 2nd in each group",
      href: "/groups",
      icon: "grid",
    },
    {
      done: goldenSet,
      label: "Name the Golden Boot",
      sub: goldenRequired
        ? "The tournament's top scorer"
        : "Optional — the tournament's top scorer",
      href: "/tournament",
      icon: "bolt",
    },
  ];

  return (
    <div className="card" style={{ overflow: "hidden", borderColor: "var(--gold-soft)" }}>
      <div className="trirule" />
      <div style={{ padding: "16px 18px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <Icon name="spark" size={18} style={{ color: "var(--gold-strong)" }} />
          <h2 className="t-h3">Finish your pre-tournament picks</h2>
        </div>
        <p className="t-sm" style={{ color: "var(--text-2)", marginBottom: 12 }}>
          These lock the moment the first match kicks off — set them now so you don&rsquo;t miss the
          big bonus points.
        </p>
        <div className="flex flex-col gap-2">
          {items.map((it) => (
            <Link
              key={it.label}
              href={it.href}
              className="flex items-center gap-3"
              style={{
                padding: "10px 12px",
                borderRadius: 12,
                background: it.done ? "var(--good-soft)" : "var(--surface-2)",
                border: "1px solid var(--line)",
              }}
            >
              <span
                className="grid place-items-center"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  flex: "none",
                  background: it.done ? "var(--good)" : "var(--surface)",
                  color: it.done ? "#fff" : "var(--text-3)",
                }}
              >
                <Icon name={it.done ? "check" : it.icon} size={17} sw={it.done ? 3 : 2} />
              </span>
              <div className="flex-1 min-w-0">
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: it.done ? "var(--text-3)" : "var(--text)",
                    textDecoration: it.done ? "line-through" : "none",
                  }}
                >
                  {it.label}
                </div>
                <div className="t-xs" style={{ color: "var(--text-3)" }}>
                  {it.sub}
                </div>
              </div>
              {!it.done && <Icon name="chevR" size={18} style={{ color: "var(--text-3)" }} />}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
