import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/queries";
import { sanitizeNext } from "@/lib/redirects";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { Logo, Trico } from "@/components/Logo";

// A dozen contenders for the flag strip — decorative, real teams.
const LOGIN_FLAGS = ["us", "ca", "mx", "ar", "br", "fr", "gb-eng", "es", "de", "pt", "jp", "ma"];

function HeroPanel() {
  return (
    <div className="hero-navy relative flex flex-col justify-end w-full h-full min-h-[46vh] lg:min-h-full">
      {/* decorative glow + oversized year, in place of the photo slot */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px 420px at 78% 18%, rgb(64 110 180 / 0.35), transparent 65%), radial-gradient(420px 320px at 12% 82%, rgb(27 48 80 / 0.9), transparent 70%)",
        }}
      />
      <span
        aria-hidden
        className="td absolute pointer-events-none select-none"
        style={{
          fontSize: "min(44vw, 340px)",
          right: -20,
          top: -30,
          color: "rgb(242 245 249 / 0.05)",
          lineHeight: 1,
        }}
      >
        26
      </span>
      {/* official WC26 mark — dark variant sits on the navy hero in both themes */}
      <Image
        src="/wc26-logo-dark.webp"
        alt="FIFA World Cup 2026"
        width={124}
        height={192}
        priority
        className="absolute anim-pop"
        style={{ top: 26, left: 26, width: "min(19vw, 108px)", height: "auto", zIndex: 3 }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(15deg, rgb(14 26 43 / 0.92) 18%, rgb(14 26 43 / 0.25) 60%, transparent)",
        }}
      />

      <div className="relative stagger" style={{ padding: 26, zIndex: 2 }}>
        <div style={{ ["--i" as string]: 0 }}>
          <Trico wide style={{ maxWidth: 260 }} />
        </div>
        <div
          className="td"
          style={{
            ["--i" as string]: 1,
            fontSize: "clamp(40px, 5vw, 58px)",
            marginTop: 14,
            color: "var(--on-navy)",
          }}
        >
          Call the
          <br />
          tournament<span style={{ color: "var(--gold)" }}>.</span>
        </div>
        <div
          style={{
            ["--i" as string]: 2,
            marginTop: 10,
            fontSize: 14,
            color: "rgb(242 245 249 / 0.75)",
            maxWidth: 340,
          }}
        >
          Predict all 104 matches of World Cup 2026 and outscore your friends.
        </div>
      </div>
    </div>
  );
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const user = await getCurrentUser();
  if (user) redirect(sanitizeNext(next));

  return (
    <main className="flex-1 grid lg:grid-cols-[1.25fr_1fr] min-h-dvh">
      <HeroPanel />

      <div
        className="flex items-start lg:items-center justify-center"
        style={{ background: "var(--surface)", padding: "26px 22px 34px" }}
      >
        <div className="w-full stagger" style={{ maxWidth: 360, display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ ["--i" as string]: 0 }}>
            <Logo size={20} />
          </div>
          <div style={{ ["--i" as string]: 1 }}>
            <h1 className="t-h1">Sign in to play</h1>
            <p className="t-sm" style={{ color: "var(--text-2)", marginTop: 5 }}>
              Free to join. Predictions lock at each kickoff.
            </p>
          </div>
          <div style={{ ["--i" as string]: 2 }}>
            <GoogleSignInButton next={sanitizeNext(next)} />
            {error === "auth" && (
              <p
                className="t-xs"
                role="alert"
                style={{ color: "var(--bad)", fontWeight: 650, marginTop: 8 }}
              >
                Sign-in didn&rsquo;t complete — please try again.
              </p>
            )}
          </div>
          <div
            className="flex items-center flex-wrap"
            style={{ ["--i" as string]: 3, gap: 8 }}
          >
            {LOGIN_FLAGS.map((iso) => (
              <span key={iso} className="flag sm" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element -- tiny external flag, no optimization needed */}
                <img src={`https://flagcdn.com/${iso}.svg`} alt="" loading="lazy" />
              </span>
            ))}
            <span className="t-xs" style={{ color: "var(--text-3)" }}>
              +36 more
            </span>
          </div>
          <p className="t-xs" style={{ ["--i" as string]: 4, color: "var(--text-3)" }}>
            Your picks are tied to your Google account — sign in on any device to keep playing.
            We never see your password or store anything beyond your name and photo.
          </p>
          <p className="t-xs" style={{ ["--i" as string]: 5, color: "var(--text-3)" }}>
            Predictions lock at kickoff · Group picks, podium &amp; Golden Boot lock at the
            tournament&rsquo;s first kickoff · June 11 — July 19 · USA · Canada · Mexico
          </p>
        </div>
      </div>
    </main>
  );
}
