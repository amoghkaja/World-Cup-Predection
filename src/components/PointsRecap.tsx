"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Modal } from "./Modal";

export interface RecapEntry {
  id: number;
  home: string;
  homeFlag: string | null;
  away: string;
  awayFlag: string | null;
  hs: number;
  as: number;
  ph: number;
  pa: number;
  pts: number;
}

const KEY = "wc_recap_seen_v1";

function readSeen(): Set<number> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}
function writeSeen(ids: Set<number>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids].slice(-300)));
  } catch {
    // ignore
  }
}

// "While you were away" — shown once per newly-settled batch of the player's
// matches, summarising what they got right and the points banked.
export function PointsRecap({
  entries,
  totalPoints,
  rank,
}: {
  entries: RecapEntry[];
  totalPoints: number;
  rank: number | null;
}) {
  const [fresh, setFresh] = useState<RecapEntry[] | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;
    const seen = readSeen();
    // First visit ever: mark everything seen silently (don't pile a recap on
    // top of the onboarding splash).
    if (!localStorage.getItem(KEY)) {
      writeSeen(new Set(entries.map((e) => e.id)));
      return;
    }
    const unseen = entries.filter((e) => !seen.has(e.id));
    if (unseen.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only localStorage check
      setFresh(unseen);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, []);

  if (!fresh) return null;

  const gained = fresh.reduce((s, e) => s + e.pts, 0);
  const hits = fresh.filter((e) => e.pts > 0).length;
  const shown = fresh.slice(0, 6);

  function close() {
    const seen = readSeen();
    fresh!.forEach((e) => seen.add(e.id));
    writeSeen(seen);
    setFresh(null);
  }

  return (
    <Modal onClose={close} label="Results since your last visit" maxWidth={400}>
      <div className="trirule" style={{ flex: "none" }} />
      <div style={{ padding: "22px 20px 20px", overflowY: "auto" }}>
        <div className="text-center" style={{ marginBottom: 14 }}>
          <div
            className="grid place-items-center mx-auto"
            style={{
              width: 54,
              height: 54,
              borderRadius: 16,
              background: gained > 0 ? "var(--gold-soft)" : "var(--surface-2)",
              color: gained > 0 ? "var(--gold-strong)" : "var(--text-3)",
              marginBottom: 12,
            }}
          >
            <Icon name={gained > 0 ? "bolt" : "target"} size={26} />
          </div>
          <h2 className="t-h2">
            {gained > 0 ? `You banked +${gained} pts` : "Results are in"}
          </h2>
          <p className="t-sm" style={{ color: "var(--text-2)", marginTop: 4 }}>
            {fresh.length} of your matches finished — you called {hits} of them right.
          </p>
        </div>

        <div className="flex flex-col" style={{ gap: 6, marginBottom: 14 }}>
          {shown.map((e) => (
            <div
              key={e.id}
              className="flex items-center"
              style={{
                gap: 8,
                padding: "9px 12px",
                borderRadius: 10,
                background: "var(--surface-2)",
              }}
            >
              <span className="tnum" style={{ fontWeight: 700, fontSize: 13.5 }}>
                {e.homeFlag ?? ""} {e.home} {e.hs}–{e.as} {e.away} {e.awayFlag ?? ""}
              </span>
              <span className="t-xs tnum" style={{ color: "var(--text-3)", flex: 1 }}>
                you said {e.ph}–{e.pa}
              </span>
              <span
                className="tnum"
                style={{
                  fontWeight: 800,
                  fontSize: 13.5,
                  whiteSpace: "nowrap",
                  color: e.pts > 0 ? "var(--gold-strong)" : "var(--text-3)",
                }}
              >
                {e.pts > 0 ? `+${e.pts}` : "0"}
              </span>
            </div>
          ))}
          {fresh.length > shown.length && (
            <div className="t-xs text-center" style={{ color: "var(--text-3)" }}>
              …and {fresh.length - shown.length} more
            </div>
          )}
        </div>

        <div
          className="t-sm text-center"
          style={{ color: "var(--text-2)", marginBottom: 14, fontWeight: 650 }}
        >
          You&rsquo;re on {totalPoints} pts{rank ? ` · #${rank} on the board` : ""}
        </div>

        <button type="button" className="btn btn-primary w-full" onClick={close}>
          Continue
        </button>
      </div>
    </Modal>
  );
}
