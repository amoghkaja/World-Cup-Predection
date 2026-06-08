import Link from "next/link";
import { notFound } from "next/navigation";
import { getMatch, getMyPredictions } from "@/lib/queries";
import { MatchCard } from "@/components/MatchCard";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = Number(id);
  if (!Number.isFinite(matchId)) notFound();

  const [match, preds] = await Promise.all([getMatch(matchId), getMyPredictions()]);
  if (!match) notFound();

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto">
      <Link href="/dashboard" className="text-sm text-[var(--muted)]">
        ← Back to matches
      </Link>
      <MatchCard match={match} prediction={preds.get(match.id) ?? null} />
    </div>
  );
}
