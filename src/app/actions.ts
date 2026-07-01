// Barrel for the server actions, split by domain under src/lib/actions/.
// Every existing `import { … } from "@/app/actions"` keeps working; the "use
// server" directive lives in each domain module, so these re-exports forward
// real server-action references.

export { savePrediction } from "@/lib/actions/predictions";
export { saveSideBet, clearSideBet, saveJoker, clearJoker } from "@/lib/actions/gambles";
export {
  saveGroupPrediction,
  saveTournamentPrediction,
  savePodiumPick,
} from "@/lib/actions/tournament-picks";
export { setAvatarHidden, updateDisplayName } from "@/lib/actions/profile";
export {
  saveMatchResult,
  setMatchTeams,
  settleGroup,
  settlePodium,
  settleGoldenBoot,
  recomputeFeatureScoring,
} from "@/lib/actions/admin";
