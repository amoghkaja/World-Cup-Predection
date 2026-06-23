import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import { sanitizeNext } from "@/lib/redirects";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(sanitizeNext(next));

  return (
    <main className="flex-1 grid place-items-center px-4 py-8">
      <div className="w-full max-w-sm flex flex-col items-center text-center gap-5">
        <Image
          src="/wc26-logo-light.webp"
          alt="FIFA World Cup 2026"
          width={124}
          height={192}
          priority
          className="dark:hidden"
        />
        <Image
          src="/wc26-logo-dark.webp"
          alt="FIFA World Cup 2026"
          width={124}
          height={192}
          priority
          className="hidden dark:block"
        />
        <div>
          <h1 className="t-h1">World Cup Pick&rsquo;em</h1>
          <p className="t-body" style={{ color: "var(--text-2)", marginTop: 8 }}>
            Predict every match of the 2026 World Cup and climb the leaderboard against your
            friends.
          </p>
        </div>
        <div className="card w-full flex flex-col gap-4" style={{ padding: 20 }}>
          <GoogleSignInButton next={sanitizeNext(next)} />
          {error === "auth" && (
            <p className="t-xs" role="alert" style={{ color: "var(--bad)", fontWeight: 650 }}>
              Sign-in didn&rsquo;t complete — please try again.
            </p>
          )}
          <p className="t-xs" style={{ color: "var(--text-3)" }}>
            Your picks are tied to your Google account — sign in on any device to keep playing.
            We never see your password or store anything beyond your name and photo.
          </p>
        </div>
        <div className="trirule" style={{ maxWidth: 110 }} />
        <p className="t-xs" style={{ color: "var(--text-3)" }}>
          Predictions lock at kickoff · Group picks, podium &amp; Golden Boot lock at the
          tournament&rsquo;s first kickoff
        </p>
      </div>
    </main>
  );
}
