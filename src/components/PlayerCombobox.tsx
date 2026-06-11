"use client";

import { useMemo, useRef, useState } from "react";
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
  const [hi, setHi] = useState(0); // keyboard highlight index
  const listRef = useRef<HTMLDivElement | null>(null);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const out: Player[] = [];
    for (const p of players) {
      if (p.name.toLowerCase().includes(s)) {
        out.push(p);
        if (out.length >= 30) break;
      }
    }
    return out;
  }, [q, players]);

  function choose(p: Player) {
    onSelect(p.name);
    setOpen(false);
    setQ("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(results[Math.min(hi, results.length - 1)]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  if (value && !open) {
    return (
      <div
        className="flex items-center gap-2"
        style={{
          padding: "10px 12px",
          minHeight: 46,
          borderRadius: 10,
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
            className="t-sm"
            style={{
              color: "var(--text-2)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontWeight: 650,
              padding: "8px 6px",
            }}
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
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="player-combobox-list"
        aria-autocomplete="list"
        placeholder={placeholder}
        value={q}
        disabled={disabled}
        onChange={(e) => {
          setQ(e.target.value);
          setHi(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && results.length > 0 && (
        <div
          ref={listRef}
          id="player-combobox-list"
          role="listbox"
          style={{
            marginTop: 4,
            maxHeight: 240,
            overflowY: "auto",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 10,
          }}
        >
          {results.map((p, i) => (
            <button
              key={`${p.name}-${p.nationality ?? ""}`}
              type="button"
              role="option"
              aria-selected={i === hi}
              onClick={() => choose(p)}
              onMouseEnter={() => setHi(i)}
              className="flex items-center gap-2 w-full text-left"
              style={{
                padding: "11px 12px",
                background: i === hi ? "var(--surface-2)" : "transparent",
                border: "none",
                borderBottom: "1px solid var(--line)",
                cursor: "pointer",
              }}
            >
              <span className="flex-1 truncate" style={{ fontWeight: 600, fontSize: 14 }}>
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
