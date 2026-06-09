"use client";

import { useState, useTransition } from "react";
import { updateDisplayName } from "@/app/actions";
import { Icon } from "@/components/Icon";

export function ProfileEditor({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await updateDisplayName(name);
      setMsg(res.ok ? { ok: true, text: "Saved" } : { ok: false, text: res.error });
    });
  }

  const dirty = name.trim() !== initialName.trim();

  return (
    <div className="flex flex-col gap-2">
      <label className="t-label" style={{ color: "var(--text-3)" }}>
        Display name (shown on the leaderboard)
      </label>
      <div className="flex gap-2">
        <input
          className="input"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setMsg(null);
          }}
          maxLength={40}
          placeholder="Your name"
        />
        <button
          className="btn btn-primary"
          style={{ flex: "none", padding: "11px 18px" }}
          onClick={save}
          disabled={pending || !dirty || !name.trim()}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {msg && (
        <p
          className="t-xs flex items-center gap-1.5"
          style={{ color: msg.ok ? "var(--good)" : "var(--bad)", fontWeight: 700 }}
        >
          <Icon name={msg.ok ? "check" : "x"} size={13} sw={3} />
          {msg.text}
        </p>
      )}
    </div>
  );
}
