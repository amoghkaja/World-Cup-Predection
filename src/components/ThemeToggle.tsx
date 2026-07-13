"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";

type Theme = "light" | "dark";

function currentTheme(): Theme {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Light/dark switch. First use snapshots the system theme; after that the
// choice is saved and wins over the system (see the init script in layout).
export function ThemeToggle() {
  // null until mounted — server render shows a neutral icon, no hydration mismatch
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-only: reads the DOM theme once
    setTheme(currentTheme());
  }, []);

  function toggle() {
    const next: Theme = currentTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("wc-theme", next);
    } catch {
      /* private mode — theme still applies for this page */
    }
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className="grid place-items-center press"
      style={{
        width: 40,
        height: 40,
        border: "none",
        background: "transparent",
        borderRadius: 10,
        color: "var(--text-2)",
        cursor: "pointer",
      }}
    >
      <span key={theme ?? "boot"} className="anim-pop grid place-items-center">
        <Icon name={theme === "dark" ? "sun" : "moon"} size={19} />
      </span>
    </button>
  );
}
