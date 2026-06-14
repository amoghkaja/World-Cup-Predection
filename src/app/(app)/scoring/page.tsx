import {
  OUTCOME_POINTS,
  EXACT_BONUS,
  GROUP_QUALIFIER_POINTS,
  PODIUM_EARLY,
  GOLDEN_BOOT_POINTS,
  maxPointsForStage,
  BTTS_REWARD,
  BTTS_PENALTY,
  JOKER_WRONG_PENALTY,
  STREAK_BONUS,
  PERFECT_DAY_BASE,
  PERFECT_DAY_PER_MATCH,
  PERFECT_DAY_MIN_PICKS,
} from "@/lib/scoring";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";
import { Icon } from "@/components/Icon";
import { Flag } from "@/components/TeamBadge";
import { PointsBadge } from "@/components/PointsBadge";
import { HowToPlayButton } from "@/components/HowToPlayButton";
import { WhatsNewButton } from "@/components/WhatsNewButton";

// Static explainer. Every number is pulled straight from @/lib/scoring so the
// page can never drift from how points are actually awarded. No multiplier.

const STAGE_ORDER: MatchStage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];
const STAGE_CODE: Record<MatchStage, string> = {
  group: "GR",
  r32: "R32",
  r16: "R16",
  qf: "QF",
  sf: "SF",
  third: "3RD",
  final: "F",
};

export default function ScoringPage() {
  const ways = [
    {
      icon: "target",
      soft: "var(--brand-soft)",
      on: "var(--brand-strong)",
      title: "Match result",
      desc: "Call Home, Draw or Away",
    },
    {
      icon: "bolt",
      soft: "var(--gold-soft)",
      on: "var(--on-gold)",
      title: "Exact score",
      desc: "Nail the precise scoreline",
    },
    {
      icon: "trophy",
      soft: "var(--red-soft)",
      on: "var(--red-strong)",
      title: "Tournament bets",
      desc: "Podium, Golden Boot & more",
    },
  ];

  const maxTotal = Math.max(...STAGE_ORDER.map((s) => maxPointsForStage(s)));

  const bonuses: { icon: string; title: string; desc: string; pts: number }[] = [
    { icon: "grid", title: "Group winner", desc: "Top of the group", pts: GROUP_QUALIFIER_POINTS },
    { icon: "grid", title: "Group runner-up", desc: "Second place", pts: GROUP_QUALIFIER_POINTS },
    { icon: "trophy", title: "Champion · 1st", desc: "Predict the winner", pts: PODIUM_EARLY[0] },
    { icon: "medal", title: "Runner-up · 2nd", desc: "Loses the final", pts: PODIUM_EARLY[1] },
    { icon: "medal", title: "Third place · 3rd", desc: "Wins the 3rd-place game", pts: PODIUM_EARLY[2] },
    { icon: "bolt", title: "Golden Boot", desc: "Top scorer's nation", pts: GOLDEN_BOOT_POINTS },
  ];

  // Worked example: a settled group match (constants drive every number).
  const exResult = OUTCOME_POINTS.group;
  const exExact = EXACT_BONUS.group;
  const exTotal = exResult + exExact;

  return (
    <div className="mx-auto w-full" style={{ maxWidth: 760 }}>
      {/* hero */}
      <div className="card anim-up mb-[18px]" style={{ overflow: "hidden" }}>
        <div className="trirule" />
        <div style={{ padding: "24px 20px 20px" }}>
          <div className="t-label mb-2" style={{ color: "var(--text-3)" }}>
            Scoring guide
          </div>
          <h1 className="t-h1">How points work</h1>
          <p className="t-body" style={{ color: "var(--text-2)", marginTop: 8, maxWidth: 520 }}>
            You score on every single match — call the result, and nail the exact scoreline for a
            bonus on top. Then stake your big tournament bets. Here&rsquo;s the full breakdown.
          </p>
          <HowToPlayButton />
          <div className="grid sm:grid-cols-3 gap-2.5 mt-[18px]">
            {ways.map((w) => (
              <div
                key={w.title}
                className="flex items-center gap-3"
                style={{
                  padding: "12px 14px",
                  borderRadius: 14,
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                }}
              >
                <div
                  className="grid place-items-center"
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    flex: "none",
                    background: w.soft,
                    color: w.on,
                  }}
                >
                  <Icon name={w.icon} size={21} />
                </div>
                <div className="min-w-0">
                  <div style={{ fontWeight: 800, fontSize: 14.5 }}>{w.title}</div>
                  <div className="t-xs" style={{ color: "var(--text-3)" }}>
                    {w.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* round points table */}
      <div className="mb-3">
        <h2 className="t-h2">Match points by round</h2>
        <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
          Correct result earns the base. An exact scoreline adds a bonus on top.
        </p>
      </div>
      <div className="card mb-[22px]" style={{ overflow: "hidden" }}>
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: "1fr auto auto auto",
            gap: 10,
            padding: "10px 18px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span className="t-label" style={{ color: "var(--text-3)" }}>
            Round
          </span>
          <span className="t-label" style={{ color: "var(--text-3)", textAlign: "right", width: 58 }}>
            Result
          </span>
          <span className="t-label" style={{ color: "var(--text-3)", textAlign: "right", width: 58 }}>
            Exact
          </span>
          <span className="t-label" style={{ color: "var(--text-3)", textAlign: "right", width: 56 }}>
            Max
          </span>
        </div>
        {STAGE_ORDER.map((stage, i) => {
          const base = OUTCOME_POINTS[stage];
          const exact = EXACT_BONUS[stage];
          const max = maxPointsForStage(stage);
          const knockout = stage !== "group";
          return (
            <div
              key={stage}
              className="grid items-center"
              style={{
                gridTemplateColumns: "1fr auto auto auto",
                gap: 10,
                padding: "12px 18px",
                borderBottom: i < STAGE_ORDER.length - 1 ? "1px solid var(--line)" : "none",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="grid place-items-center tnum"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 9,
                    flex: "none",
                    background: knockout ? "var(--blue-soft)" : "var(--brand-soft)",
                    color: knockout ? "var(--blue-strong)" : "var(--brand-strong)",
                    fontWeight: 800,
                    fontSize: 11,
                  }}
                >
                  {STAGE_CODE[stage]}
                </span>
                <div className="min-w-0">
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{STAGE_LABELS[stage]}</div>
                  <div
                    style={{
                      height: 5,
                      marginTop: 5,
                      borderRadius: 99,
                      background: "var(--surface-2)",
                      overflow: "hidden",
                      width: 110,
                      maxWidth: "100%",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${(max / maxTotal) * 100}%`,
                        transformOrigin: "left",
                        background: knockout ? "var(--blue)" : "var(--brand)",
                        borderRadius: 99,
                        animation: "bargrow .7s cubic-bezier(.2,.8,.3,1) both",
                      }}
                    />
                  </div>
                </div>
              </div>
              <span
                className="tnum"
                style={{ textAlign: "right", width: 58, fontWeight: 700, fontSize: 14 }}
              >
                {base}
              </span>
              <span
                className="tnum"
                style={{
                  textAlign: "right",
                  width: 58,
                  color: "var(--gold-strong)",
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                +{exact}
              </span>
              <span
                className="tnum"
                style={{
                  textAlign: "right",
                  width: 56,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 17,
                }}
              >
                {max}
              </span>
            </div>
          );
        })}
      </div>

      {/* lock rule callout */}
      <div
        className="card flex gap-3 items-start mb-6"
        style={{
          padding: "15px 17px",
          background: "var(--brand-soft)",
          border: "1px solid var(--brand-ring)",
        }}
      >
        <div
          className="grid place-items-center"
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            flex: "none",
            background: "var(--brand)",
            color: "var(--on-brand)",
          }}
        >
          <Icon name="lock" size={18} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14.5, color: "var(--brand-strong)" }}>
            Picks lock at kickoff
          </div>
          <div className="t-sm" style={{ color: "var(--text-2)", marginTop: 2 }}>
            You can edit a prediction as many times as you like — right up until the whistle. Once
            the match starts, it&rsquo;s locked for good.
          </div>
        </div>
      </div>

      {/* group + tournament bonuses */}
      <div className="mb-3">
        <h2 className="t-h2">Group &amp; tournament bonuses</h2>
        <p className="t-sm" style={{ color: "var(--text-3)", marginTop: 3 }}>
          One-off bets that pay big if you read the tournament right. Podium picks earn the higher
          value when locked before the group stage — revise after groups for a little less.
        </p>
      </div>
      <div className="card mb-6" style={{ overflow: "hidden" }}>
        {bonuses.map((b, i) => (
          <div
            key={b.title}
            className="flex items-center gap-3.5"
            style={{
              padding: "13px 18px",
              borderBottom: i < bonuses.length - 1 ? "1px solid var(--line)" : "none",
            }}
          >
            <div
              className="grid place-items-center"
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                flex: "none",
                background: b.pts >= 10 ? "var(--gold-soft)" : "var(--surface-2)",
                color: b.pts >= 10 ? "var(--gold-strong)" : "var(--text-2)",
              }}
            >
              <Icon name={b.icon} size={19} />
            </div>
            <div className="flex-1">
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{b.title}</div>
              <div className="t-xs" style={{ color: "var(--text-3)" }}>
                {b.desc}
              </div>
            </div>
            <PointsBadge pts={b.pts} size="md" />
          </div>
        ))}
      </div>

      {/* worked example */}
      <div className="card" style={{ overflow: "hidden" }}>
        <div className="trirule" />
        <div style={{ padding: "20px 20px 22px" }}>
          <div className="t-label mb-3" style={{ color: "var(--text-3)" }}>
            Worked example · group match
          </div>
          <div
            className="flex items-center justify-center gap-4 mb-4"
            style={{ padding: 14, borderRadius: 16, background: "var(--surface-2)" }}
          >
            <div className="text-center">
              <Flag flag="🇫🇷" name="France" size="lg" />
              <div className="t-xs" style={{ marginTop: 6, fontWeight: 700 }}>
                France
              </div>
            </div>
            <div
              className="tnum"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 30 }}
            >
              2–1
            </div>
            <div className="text-center">
              <Flag flag="🇩🇰" name="Denmark" size="lg" />
              <div className="t-xs" style={{ marginTop: 6, fontWeight: 700 }}>
                Denmark
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between" style={{ padding: "9px 4px" }}>
              <span style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 600 }}>
                Correct result — France win
              </span>
              <span
                className="tnum"
                style={{ fontWeight: 800, fontSize: 14.5, color: "var(--brand-strong)" }}
              >
                +{exResult}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ padding: "9px 4px" }}>
              <span style={{ fontSize: 14, color: "var(--text-2)", fontWeight: 600 }}>
                Exact score 2–1 bonus
              </span>
              <span
                className="tnum"
                style={{ fontWeight: 800, fontSize: 14.5, color: "var(--gold-strong)" }}
              >
                +{exExact}
              </span>
            </div>
          </div>
          <div
            className="flex items-center justify-between mt-3"
            style={{
              padding: "14px 16px",
              borderRadius: 14,
              background: "var(--brand)",
              color: "var(--on-brand)",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 15 }}>Total earned</span>
            <span
              className="tnum anim-pop"
              style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 28 }}
            >
              {exTotal} pts
            </span>
          </div>
        </div>
      </div>

      {/* gambles & bonuses */}
      <div className="card mb-[18px]" style={{ padding: "20px" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
          <Icon name="dice" size={20} style={{ color: "var(--brand-strong)" }} />
          <h2 className="t-h2">Gambles &amp; bonuses</h2>
        </div>
        <p className="t-sm" style={{ color: "var(--text-2)", marginBottom: 14 }}>
          Optional extras that go live once every team has played its first game. Side bets are a
          gamble (a wrong call loses points); streaks &amp; perfect days are bonuses on your main picks.
        </p>

        <div className="flex flex-col gap-2.5">
          {/* BTTS */}
          <Row title="Both teams to score?" desc="A coin-flip yes/no call on any match.">
            <span style={{ color: "var(--good)", fontWeight: 800 }}>+{BTTS_REWARD}</span>
            <span style={{ color: "var(--text-3)" }}> / </span>
            <span style={{ color: "var(--bad)", fontWeight: 800 }}>{BTTS_PENALTY}</span>
          </Row>

          {/* Joker */}
          <Row title="Joker / double-down" desc="One per day. Stake it on a match.">
            <span style={{ color: "var(--good)", fontWeight: 800 }}>×2</span>
            <span style={{ color: "var(--text-3)" }}> / </span>
            <span style={{ color: "var(--bad)", fontWeight: 800 }}>{JOKER_WRONG_PENALTY}</span>
          </Row>

          {/* Streak */}
          <Row
            title="Streak bonus"
            desc="Consecutive correct picks. A wrong or skipped game resets it."
          >
            <span className="tnum" style={{ color: "var(--gold-strong)", fontWeight: 800 }}>
              up to +{STREAK_BONUS[STREAK_BONUS.length - 1]}/match
            </span>
          </Row>

          {/* Perfect day */}
          <Row
            title="Perfect matchday"
            desc={`Pick every match that day (min ${PERFECT_DAY_MIN_PICKS}) and get them all right.`}
          >
            <span className="tnum" style={{ color: "var(--gold-strong)", fontWeight: 800 }}>
              +{PERFECT_DAY_BASE}&nbsp;+&nbsp;{PERFECT_DAY_PER_MATCH}/match
            </span>
          </Row>
        </div>
        <div className="text-center">
          <WhatsNewButton />
        </div>
      </div>
    </div>
  );
}

function Row({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3"
      style={{ padding: "11px 13px", borderRadius: 12, background: "var(--surface-2)" }}
    >
      <div className="min-w-0">
        <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
        <div className="t-xs" style={{ color: "var(--text-3)" }}>
          {desc}
        </div>
      </div>
      <div className="tnum" style={{ fontSize: 14, whiteSpace: "nowrap", flex: "none" }}>
        {children}
      </div>
    </div>
  );
}
