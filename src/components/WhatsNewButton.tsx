"use client";

import { Icon } from "./Icon";

// Re-opens the "what's new" splash (handled by <FeatureSplash />) so players can
// re-read the points system / side bets / joker / streak rules at any time.
export function WhatsNewButton() {
  return (
    <button
      type="button"
      className="btn btn-ghost"
      style={{ marginTop: 14, padding: "0 16px", fontSize: 14 }}
      onClick={() => window.dispatchEvent(new Event("wc:open-features"))}
    >
      <Icon name="dice" size={16} />
      What&rsquo;s new
    </button>
  );
}
