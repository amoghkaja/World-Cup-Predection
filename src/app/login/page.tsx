import Image from "next/image";
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
    <main className="flex-1 grid place-items-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5 anim-up">
        <Image
          src="/wc26-logo-light.webp"
          alt="FIFA World Cup 2026"
          width={132}
          height={204}
          priority
        />
        <div>
          <h1 className="t-h1">World Cup Pick&rsquo;em</h1>
          <p className="t-body" style={{ color: "var(--text-2)", marginTop: 8 }}>
            Predict every match of the 2026 World Cup and climb the leaderboard against your
            friends.
          </p>
        </div>
        <div className="card w-full flex flex-col gap-4" style={{ padding: 20 }}>
          <GoogleSignInButton next={next} />
          <p className="t-xs" style={{ color: "var(--text-3)" }}>
            Your picks and points are tied to your Google account — sign in on any device to keep
            playing. We never see your password or store anything beyond your name and photo.
          </p>
        </div>
        <div className="trirule" style={{ maxWidth: 120 }} />
        <p className="t-xs" style={{ color: "var(--text-3)" }}>
          Predictions lock at kickoff · Group picks, podium &amp; Golden Boot lock at the first
          match
        </p>
      </div>
    </main>
  );
}
