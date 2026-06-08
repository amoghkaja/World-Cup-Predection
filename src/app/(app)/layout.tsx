import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/queries";
import { Nav } from "@/components/Nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-col min-h-screen">
      <header className="border-b border-[var(--border)] sticky top-0 z-10 bg-[var(--background)]/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/dashboard" className="font-extrabold text-lg flex items-center gap-2">
            <span aria-hidden>🏆</span> World Cup Pick&apos;em
          </Link>
          <div className="flex items-center gap-3">
            {profile.is_admin && (
              <Link href="/admin/results" className="chip" style={{ color: "var(--accent)" }}>
                Admin
              </Link>
            )}
            <Link href="/profile" className="flex items-center gap-2">
              {profile.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="w-8 h-8 rounded-full border border-[var(--border)]"
                />
              ) : (
                <span className="w-8 h-8 rounded-full bg-[var(--surface-2)] grid place-items-center text-sm">
                  {(profile.display_name ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm hidden sm:inline">{profile.display_name}</span>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto w-full px-4 py-4 flex flex-col md:flex-row gap-4 flex-1">
        <aside className="md:w-44 shrink-0">
          <div className="md:sticky md:top-20">
            <Nav />
          </div>
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
