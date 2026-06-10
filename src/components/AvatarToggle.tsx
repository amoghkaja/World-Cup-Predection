"use client";

import { useState, useTransition } from "react";
import { setAvatarHidden } from "@/app/actions";
import { Avatar } from "./Avatar";

// Profile-photo privacy switch: photo ⟷ initials. Optimistic, server-persisted.
export function AvatarToggle({
  name,
  avatarUrl,
  initialHidden,
}: {
  name: string;
  avatarUrl: string | null;
  initialHidden: boolean;
}) {
  const [hidden, setHidden] = useState(initialHidden);
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function toggle(next: boolean) {
    if (next === hidden) return;
    setErr(null);
    setHidden(next);
    start(async () => {
      const res = await setAvatarHidden(next);
      if (!res.ok) {
        setHidden(!next);
        setErr(res.error);
      }
    });
  }

  const opts: { label: string; value: boolean; preview: React.ReactNode }[] = [
    { label: "Photo", value: false, preview: <Avatar name={name} src={avatarUrl} size={28} /> },
    { label: "Initials", value: true, preview: <Avatar name={name} src={null} size={28} /> },
  ];

  return (
    <div className="flex flex-col gap-2">
      <label className="t-label" style={{ color: "var(--text-3)" }}>
        Profile picture
      </label>
      <div className="flex gap-2">
        {opts.map((o) => {
          const on = hidden === o.value;
          return (
            <button
              key={o.label}
              type="button"
              disabled={pending}
              onClick={() => toggle(o.value)}
              className="press flex items-center gap-2.5 flex-1"
              style={{
                padding: "9px 12px",
                borderRadius: 12,
                border: on ? "1.5px solid var(--brand)" : "1px solid var(--line)",
                background: on ? "var(--brand-soft)" : "var(--surface)",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: 13.5,
                color: on ? "var(--brand-strong)" : "var(--text-2)",
              }}
            >
              {o.preview}
              {o.label}
            </button>
          );
        })}
      </div>
      <p className="t-xs" style={{ color: "var(--text-3)" }}>
        Initials hides your Google photo from everyone, including the leaderboard.
      </p>
      {err && (
        <p className="t-xs" style={{ color: "var(--bad)", fontWeight: 700 }}>
          {err}
        </p>
      )}
    </div>
  );
}
