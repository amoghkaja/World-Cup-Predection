import { getTeams, getMyTournamentPredictions, tournamentLockAt } from "@/lib/queries";
import { isLocked, formatKickoff } from "@/lib/format";
import { Countdown } from "@/components/Countdown";
import { TournamentPicker } from "@/components/TournamentPicker";

export const dynamic = "force-dynamic";

function PitchLines() {
  return (
    <svg
      aria-hidden
      preserveAspectRatio="xMidYMid slice"
      viewBox="0 0 400 600"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        opacity: 0.13,
        color: "var(--on-brand)",
      }}
    >
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="200" cy="300" r="80" />
        <line x1="0" y1="300" x2="400" y2="300" />
        <rect x="120" y="-60" width="160" height="120" rx="2" />
        <rect x="120" y="540" width="160" height="120" rx="2" />
        <rect x="160" y="-60" width="80" height="60" />
        <rect x="160" y="600" width="80" height="60" />
      </g>
    </svg>
  );
}

export default async function TournamentPage() {
  const [teams, preds, lockAt] = await Promise.all([
    getTeams(),
    getMyTournamentPredictions(),
    tournamentLockAt(),
  ]);
  const locked = lockAt ? isLocked(lockAt) : false;

  return (
    <div className="flex flex-col gap-5 mx-auto w-full" style={{ maxWidth: 720 }}>
      {/* green countdown hero */}
      <div
        className="card overflow-hidden relative"
        style={{ background: "var(--brand)", color: "var(--on-brand)", border: "none" }}
      >
        <PitchLines />
        <div className="relative text-center" style={{ padding: "26px 22px" }}>
          <div className="t-label" style={{ opacity: 0.85, marginBottom: 6 }}>
            Pre-tournament picks
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 26,
              letterSpacing: "-0.02em",
            }}
          >
            Lock your champion
          </h1>
          <p
            className="mx-auto"
            style={{ opacity: 0.85, fontSize: 14, margin: "8px auto 18px", maxWidth: 380 }}
          >
            These are worth the most points in the game — and they lock the moment the first match
            kicks off.
          </p>
          {lockAt && (
            <>
              <div
                className="inline-flex"
                style={{ padding: "14px 20px", borderRadius: 18, background: "rgba(0,0,0,0.16)" }}
              >
                <Countdown kickoff={lockAt} variant="big" />
              </div>
              <div className="t-xs" style={{ opacity: 0.8, marginTop: 12 }}>
                {locked ? "Picks are locked" : "Locks at first kickoff"} · {formatKickoff(lockAt)}
              </div>
            </>
          )}
        </div>
      </div>

      <TournamentPicker teams={teams} existing={preds} locked={locked} />
    </div>
  );
}
