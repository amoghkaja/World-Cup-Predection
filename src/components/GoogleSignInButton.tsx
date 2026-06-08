"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setLoading(true);
    const supabase = createClient();
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
      next || "/dashboard"
    )}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      setLoading(false);
      alert(error.message);
    }
  }

  return (
    <button className="btn btn-primary w-full text-base py-3" onClick={signIn} disabled={loading}>
      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
        <path
          fill="currentColor"
          d="M21.35 11.1H12v3.2h5.35c-.25 1.4-1.6 4.1-5.35 4.1-3.2 0-5.8-2.65-5.8-5.9s2.6-5.9 5.8-5.9c1.8 0 3 .77 3.7 1.43l2.5-2.4C16.9 3.6 14.7 2.7 12 2.7 6.95 2.7 2.85 6.8 2.85 12S6.95 21.3 12 21.3c5.25 0 8.7-3.7 8.7-8.9 0-.6-.06-1-.15-1.3z"
        />
      </svg>
      {loading ? "Redirecting…" : "Continue with Google"}
    </button>
  );
}
