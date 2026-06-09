import { redirect } from "next/navigation";
import { getProfile } from "@/lib/queries";
import { Shell } from "@/components/Shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();
  if (!profile) redirect("/login");

  return (
    <Shell
      profile={{
        display_name: profile.display_name,
        avatar_url: profile.avatar_url,
        is_admin: profile.is_admin,
      }}
    >
      {children}
    </Shell>
  );
}
