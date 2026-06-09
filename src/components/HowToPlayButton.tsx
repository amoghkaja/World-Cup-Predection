"use client";

import { Icon } from "./Icon";

// Re-opens the onboarding splash (handled by <Onboarding />).
export function HowToPlayButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ marginTop: 14, padding: "9px 16px", fontSize: 14 }}
      onClick={() => window.dispatchEvent(new Event("wc:open-onboarding"))}
    >
      <Icon name="spark" size={16} />
      Replay the intro
    </button>
  );
}
