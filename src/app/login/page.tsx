import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(next || "/dashboard");

  return (
    <main className="flex-1 grid place-items-center px-4">
      <div className="card p-8 max-w-md w-full text-center flex flex-col gap-6">
        <div>
          <div className="text-5xl mb-2">🏆</div>
          <h1 className="text-3xl font-extrabold">World Cup Pick&apos;em</h1>
          <p className="text-[var(--muted)] mt-2">
            Predict every match of the 2026 World Cup. Earn more for bold, early calls.
            Climb the leaderboard against your friends.
          </p>
        </div>
        <GoogleSignInButton next={next} />
        <p className="text-xs text-[var(--muted)]">
          Predictions lock at kickoff. Pick scores, knockout winners, and your champion.
        </p>
      </div>
    </main>
  );
}
