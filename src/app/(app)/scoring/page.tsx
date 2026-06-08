import {
  OUTCOME_POINTS,
  EXACT_BONUS,
  TIME_TIERS,
  GROUP_QUALIFIER_POINTS,
  CHAMPION_POINTS,
  FINALIST_POINTS,
  GOLDEN_BOOT_POINTS,
  maxPointsForStage,
} from "@/lib/scoring";
import { STAGE_LABELS, type MatchStage } from "@/lib/types";

// Static page — pulls every number straight from the scoring model so it can
// never drift from how points are actually awarded.

const STAGE_ORDER: MatchStage[] = ["group", "r32", "r16", "qf", "sf", "third", "final"];

const SPECIALS = [
  { icon: "🅰️", title: "Group qualifier", points: `+${GROUP_QUALIFIER_POINTS}`, desc: "Each group winner and runner-up you pick correctly." },
  { icon: "👑", title: "Champion", points: `+${CHAMPION_POINTS}`, desc: "Predict who lifts the trophy." },
  { icon: "🥈", title: "Finalist", points: `+${FINALIST_POINTS}`, desc: "Each team you correctly tip to reach the final." },
  { icon: "👟", title: "Golden Boot", points: `+${GOLDEN_BOOT_POINTS}`, desc: "Name the tournament's top scorer." },
];

export default function ScoringPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold">How scoring works</h1>
        <p className="text-[var(--muted)] max-w-2xl">
          You earn points for correct predictions. Points scale up for{" "}
          <strong className="text-[var(--foreground)]">tougher rounds</strong>,{" "}
          <strong className="text-[var(--foreground)]">exact scorelines</strong>, and{" "}
          <strong className="text-[var(--foreground)]">bold, early calls</strong>. Every
          prediction locks at kickoff.
        </p>
      </header>

      {/* The formula */}
      <div className="card p-4 flex flex-col gap-2">
        <div className="text-xs uppercase tracking-wide text-[var(--muted)]">The formula</div>
        <code className="text-sm sm:text-base font-mono">
          points = round( (<span style={{ color: "var(--primary)" }}>round points</span>
          {" + "}
          <span style={{ color: "var(--accent)" }}>exact-score bonus</span>) ×{" "}
          <span style={{ color: "var(--accent)" }}>early-bird ×</span> )
        </code>
        <p className="text-xs text-[var(--muted)]">
          Predict the exact score — the winner is derived from it. Get the result right for the
          round points; nail the exact score too for the bonus on top.
        </p>
      </div>

      {/* Match points by round */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Match predictions</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[var(--muted)] border-b border-[var(--border)]">
                <th className="p-3 font-semibold">Round</th>
                <th className="p-3 font-semibold text-center">Correct result</th>
                <th className="p-3 font-semibold text-center">+ Exact score</th>
                <th className="p-3 font-semibold text-center">Max (earliest)</th>
              </tr>
            </thead>
            <tbody>
              {STAGE_ORDER.map((stage) => (
                <tr key={stage} className="border-b border-[var(--border)] last:border-0">
                  <td className="p-3 font-medium">{STAGE_LABELS[stage]}</td>
                  <td className="p-3 text-center tabular-nums" style={{ color: "var(--primary)" }}>
                    {OUTCOME_POINTS[stage]}
                  </td>
                  <td className="p-3 text-center tabular-nums" style={{ color: "var(--accent)" }}>
                    +{EXACT_BONUS[stage]}
                  </td>
                  <td className="p-3 text-center tabular-nums font-bold">
                    {maxPointsForStage(stage)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--muted)]">
          &ldquo;Correct result&rdquo; means you got the outcome right (home win / draw / away win).
          For knockout ties level at 90&apos;, your pick is scored against the team that advances.
          &ldquo;Max&rdquo; assumes the exact score, predicted 7+ days early.
        </p>
      </section>

      {/* Special picks */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Special picks</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {SPECIALS.map((s) => (
            <div key={s.title} className="card p-3 flex items-center gap-3">
              <span className="text-2xl" aria-hidden>{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{s.title}</div>
                <div className="text-xs text-[var(--muted)]">{s.desc}</div>
              </div>
              <span className="text-lg font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>
                {s.points}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Early-bird multiplier */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Early-bird bonus</h2>
        <p className="text-sm text-[var(--muted)] max-w-2xl">
          Predicting earlier is riskier — no late team news or lineups — so it pays more. Your
          multiplier is set by how far ahead of kickoff you lock in your pick.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TIME_TIERS.map((t) => (
            <div key={t.label} className="card p-3 flex flex-col items-center text-center gap-1">
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>
                ×{t.multiplier}
              </span>
              <span className="text-xs text-[var(--muted)]">{t.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Worked example */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">Worked example</h2>
        <div className="card p-4 flex flex-col gap-2 text-sm">
          <p>
            You predict a <strong>Quarter-final</strong> as <strong>2–1</strong>,{" "}
            <strong>5 days</strong> before kickoff. The match finishes <strong>2–1</strong> — exact.
          </p>
          <div className="font-mono text-xs sm:text-sm bg-[var(--surface-2)] rounded-lg p-3 flex flex-col gap-1">
            <span>
              base = {OUTCOME_POINTS.qf} (result) + {EXACT_BONUS.qf} (exact) ={" "}
              {OUTCOME_POINTS.qf + EXACT_BONUS.qf}
            </span>
            <span>multiplier = ×1.3 (3–7 days early)</span>
            <span style={{ color: "var(--accent)" }}>
              points = round({OUTCOME_POINTS.qf + EXACT_BONUS.qf} × 1.3) ={" "}
              {Math.round((OUTCOME_POINTS.qf + EXACT_BONUS.qf) * 1.3)}
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Get only the result right (say it ends 3–0) and you&apos;d score{" "}
            round({OUTCOME_POINTS.qf} × 1.3) = {Math.round(OUTCOME_POINTS.qf * 1.3)} instead.
          </p>
        </div>
      </section>
    </div>
  );
}
