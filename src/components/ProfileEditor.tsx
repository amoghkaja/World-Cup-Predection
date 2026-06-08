"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/app/actions";

export function ProfileEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateDisplayName(name);
      setMsg(res.ok ? "Saved" : res.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs text-[var(--muted)]">Display name (shown on the leaderboard)</label>
      <div className="flex gap-2">
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
        <button className="btn btn-primary" onClick={save} disabled={pending}>
          {pending ? "…" : "Save"}
        </button>
      </div>
      {msg && <p className="text-xs text-[var(--primary)]">{msg}</p>}
    </div>
  );
}
