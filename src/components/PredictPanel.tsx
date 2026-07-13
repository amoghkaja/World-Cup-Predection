"use client";

import { useState } from "react";
import { PredictionForm, type PredictableMatch, type ExistingPick } from "./PredictionForm";
import { SideBetControls, type SideState } from "./SideBetControls";

/**
 * Prediction form + gambles for one match, sharing one piece of state: a
 * joker STAGED before the pick exists. The server requires a prediction row
 * before a joker can land, so a staged joker rides along with "Save
 * prediction" (savePrediction's `joker` flag) instead of forcing the old
 * pick-first-then-joker two-step.
 */
export function PredictPanel({
  match,
  existing,
  locked,
  compact,
  onSaved,
  showGambles,
  side,
  joker,
  jokerUsedElsewhere,
  live,
  unlockLabel,
  jokerUpside,
}: {
  match: PredictableMatch;
  existing: ExistingPick | null;
  locked: boolean;
  compact?: boolean;
  onSaved?: () => void;
  /** render the side-bets/joker block (open matches only) */
  showGambles: boolean;
  side: SideState;
  joker: boolean;
  jokerUsedElsewhere: boolean;
  live: boolean;
  unlockLabel?: string;
  jokerUpside?: number;
}) {
  const [stagedJoker, setStagedJoker] = useState(false);
  const hasPick = !!existing;

  return (
    <>
      <PredictionForm
        match={match}
        existing={existing}
        locked={locked}
        compact={compact}
        stagedJoker={stagedJoker}
        onSaved={() => {
          setStagedJoker(false);
          onSaved?.();
        }}
      />
      {showGambles && (
        <div style={{ borderTop: "1px dashed var(--line)", marginTop: 14, paddingTop: 8 }}>
          <SideBetControls
            matchId={match.id}
            stage={match.stage}
            side={side}
            joker={joker}
            jokerUsedElsewhere={jokerUsedElsewhere}
            live={live}
            unlockLabel={unlockLabel}
            jokerUpside={jokerUpside}
            hasPick={hasPick}
            stagedJoker={stagedJoker}
            onStageJoker={setStagedJoker}
          />
        </div>
      )}
    </>
  );
}
