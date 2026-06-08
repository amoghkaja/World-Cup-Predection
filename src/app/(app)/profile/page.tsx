import { getProfile } from "@/lib/queries";
import { createClient } from "@/lib/supabase/server";
import { ProfileEditor } from "@/components/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await getProfile();
  const supabase = await createClient();
  const { data: lb } = await supabase
    .from("leaderboard")
    .select("total_points, correct_matches")
    .eq("user_id", profile!.id)
    .maybeSingle();

  return (
    <div className="flex flex-col gap-4 max-w-md">
      <h1 className="text-2xl font-extrabold">Profile</h1>

      <div className="card p-5 flex items-center gap-4">
        {profile?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-[var(--surface-2)] grid place-items-center text-2xl">
            {(profile?.display_name ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <div>
          <div className="font-bold text-lg">{profile?.display_name}</div>
          <div className="text-sm" style={{ color: "var(--accent)" }}>
            {lb?.total_points ?? 0} pts · {lb?.correct_matches ?? 0} correct
          </div>
        </div>
      </div>

      <div className="card p-5">
        <ProfileEditor initialName={profile?.display_name ?? ""} />
      </div>

      <form action="/auth/signout" method="post">
        <button className="btn btn-ghost w-full" type="submit">
          Sign out
        </button>
      </form>
    </div>
  );
}
