"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";

type Player = { name: string; nationality: string | null };

// Searchable player picker backed by the squads in our DB (no API call per use).
export function PlayerCombobox({
  players,
  value,
  onSelect,
  disabled,
  placeholder = "Search a player…",
}: {
  players: Player[];
  value: string;
  onSelect: (name: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: Player[] = [];
    for (const p of players) {
      if (p.name.toLowerCase().includes(s)) {
        out.push(p);
        if (out.length >= 40) break;
      }
    }
    return out;
  }, [q, players]);

  if (value && !open) {
    return (
      <div
        className="flex items-center gap-2"
        style={{
          padding: "10px 12px",
          borderRadius: 12,
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
        }}
      >
        <Icon name="check" size={16} sw={2.6} style={{ color: "var(--brand)" }} />
        <span className="flex-1 truncate" style={{ fontWeight: 700, fontSize: 14 }}>
          {value}
        </span>
        {!disabled && (
          <button
            type="button"
            className="t-xs"
            style={{ color: "var(--text-3)", background: "none", border: "none", cursor: "pointer" }}
            onClick={() => {
              setOpen(true);
              setQ("");
            }}
          >
            Change
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <input
        className="input"
        placeholder={placeholder}
        value={q}
        disabled={disabled}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div
          className="scroll"
          style={{
            marginTop: 4,
            maxHeight: 220,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 12,
          }}
        >
          {results.map((p) => (
            <button
              key={`${p.name}-${p.nationality ?? ""}`}
              type="button"
              onClick={() => {
                onSelect(p.name);
                setOpen(false);
                setQ("");
              }}
              className="flex items-center gap-2 w-full text-left"
              style={{
                padding: "9px 12px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              <span className="flex-1 truncate" style={{ fontWeight: 600, fontSize: 13.5 }}>
                {p.name}
              </span>
              <span className="t-xs" style={{ color: "var(--text-3)", flex: "none" }}>
                {p.nationality}
              </span>
            </button>
          ))}
        </div>
      )}
      {open && q.trim() && results.length === 0 && (
        <div className="t-xs" style={{ color: "var(--text-3)", padding: "8px 4px" }}>
          No players found.
        </div>
      )}
    </div>
  );
}
