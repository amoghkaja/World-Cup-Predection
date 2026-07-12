"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "./Icon";

export function GoogleSignInButton({ next }: { next?: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setLoading(true);
    setError(null);
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
      setError(error.message);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        className="btn btn-ghost w-full"
        style={{ minHeight: 46, fontSize: 15 }}
        onClick={signIn}
        disabled={loading}
      >
        <Icon name="google" size={17} />
        {loading ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && (
        <p className="t-xs" role="alert" style={{ color: "var(--bad)", fontWeight: 650 }}>
          {error}
        </p>
      )}
    </div>
  );
}
