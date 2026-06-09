# Handoff: World Cup Pick'em

## Overview
A predictions/fantasy game for the FIFA World Cup 2026. Users predict the result and
exact score of every match, build a knockout bracket, call group winners and
pre-tournament outcomes (champion, finalist, Golden Boot), and compete on a friends
leaderboard. The app ships as a single responsive product with two presentation
targets — a **390 × 844 mobile** layout (top bar + bottom tab bar) and a
**1280 × 824 desktop** layout (left sidebar). Light and dark themes are both supported.

This bundle reflects the latest design decisions:
- The **early-bird multiplier was removed** — match scoring is now *result + exact-score bonus* only.
- The **palette was warmed** to a natural "match-programme" feel (cream paper, grass green, gold, terracotta) instead of the previous cool gray/navy.
- A dedicated **"How points work"** screen documents the full scoring model.

## About the Design Files
The files in this bundle are **design references built in HTML/React (via in-browser Babel)** —
prototypes that show intended look, layout, and behavior. They are **not production code to
ship directly**. The task is to **recreate these designs in the target codebase** using its
established framework, component library, and patterns (React, Vue, SwiftUI, native, etc.).
If no front-end environment exists yet, choose the most appropriate framework and implement
the designs there. Treat the React code here as a precise spec, not as a drop-in.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, radii, shadows, copy, and interactions
are all specified. Recreate the UI pixel-accurately using the codebase's own primitives. All
colors are defined as design tokens (see **Design Tokens**) — wire them into the target
theming system rather than hard-coding per component.

---

## Scoring Model (the core domain logic)

Points come from three places. **There is no time/early-bird multiplier** — ignore any such
concept if you see remnants elsewhere.

### 1. Per-match points = base (by round) + exact-score bonus
- **Base** is earned for calling the result correctly (Home / Draw / Away).
- **Exact-score bonus** = `round(base × 0.8)`, earned *additionally* when the precise
  scoreline is correct (the bonus requires the exact score, which implies the result).

| Round         | Code  | Base (result) | Exact bonus (+80%) | Max per match |
|---------------|-------|---------------|--------------------|---------------|
| Group stage   | Group | 10            | +8                 | 18            |
| Round of 32   | R32   | 15            | +12                | 27            |
| Round of 16   | R16   | 20            | +16                | 36            |
| Quarter-final | QF    | 30            | +24                | 54            |
| Semi-final    | SF    | 45            | +36                | 81            |
| Final         | Final | 70            | +56                | 126           |

Reference implementation (`pointsEarned` in `components2.jsx`):
```js
function pointsEarned(m, pred) {
  const r = WC.results[m.id];
  if (!r || !pred) return 0;
  const base = WC.roundPoints[m.round] || 10;       // {Group:10,R32:15,R16:20,QF:30,SF:45,Final:70}
  const realOut = r.home > r.away ? "H" : r.home < r.away ? "A" : "D";
  let pts = 0;
  if (pred.outcome === realOut) pts += base;                       // correct result
  if (pred.hs === r.home && pred.as === r.away) pts += Math.round(base * 0.8); // exact score
  return pts;                                        // NOTE: no multiplier
}
```
A prediction object is `{ outcome: "H"|"D"|"A", hs: number, as: number }`. `outcome` is
derived from the score steppers: `hs > as → "H"`, `hs < as → "A"`, else `"D"`.

### 2. Group bonuses (one-off, per group A–L)
- **Group winner** (correct top of group): **8 pts**
- **Group runner-up** (correct 2nd place): **5 pts**

### 3. Tournament bonuses (one-off, lock at first kickoff)
- **Champion** (lifts the trophy): **70 pts**
- **Other finalist** (loses the final): **40 pts**
- **Golden Boot** (top scorer's nation): **30 pts**

### Locking rule
Every prediction is **editable any number of times until the match kicks off**, then locks
permanently. Tournament/group bonus picks lock at the **first** match kickoff of the tournament.

### Worked example (group match)
France beat Denmark 2–1; user predicted France 2–1.
- Correct result (France win): **+10**
- Exact score 2–1 bonus: **+8**
- **Total: 18 pts**

---

## Screens / Views

Routing is a single `route = { name, params }` switch (see `SCREENS` map in `app.jsx`). The
mobile shell shows a 5-item bottom tab bar (Home, Bracket, Groups, Board, Profile) plus a top
bar; the desktop shell shows an 8-item left sidebar. Content max-width is generally 760px,
centered. Standard screen padding wrapper: `padding: 22px clamp(16px,4vw,34px) 120px; max-width: 1120px; margin: 0 auto`.

### 1. Login (`LoginScreen`, `screens1.jsx`)
- **Purpose:** entry point; "Continue with Google" (demo: routes to dashboard).
- **Layout (desktop):** two-pane. Left = deep-green brand panel (`--brand-grad`) with pitch
  lines, eyebrow "FIFA World Cup 2026" + host flags, 56px display headline "Call the
  tournament.", a three-stat row (**104** matches · **48** teams · **16** host cities), and an
  animated flag marquee. Right = form panel on `--bg` with logo, headline, Google button,
  fine print, and a second flag marquee. **Mobile:** single column, form-centric.

### 2. Dashboard / Home (`Dashboard`, `screens1.jsx`)
- **Purpose:** the matchday hub; predict open matches inline.
- **Header:** "Matchday · {date}" eyebrow + "Hey Alex" (no emoji). A 3-stat strip: Rank,
  Points, "To pick" count.
- **CTA card:** green "Pick your Champion" card → tournament picks.
- **Filter segmented control:** All / Open (count badge) / My picks.
- **Match list:** grouped by day; each match is a `MatchCard` (see Components) with an inline
  predict drawer. Finished matches show the score and an earned-points badge.

### 3. Match detail (`MatchDetail`, `screens1.jsx`)
- **Purpose:** full prediction surface for one match.
- **Hero card:** Group + round label, status pill, both flags with "vs", venue, and a big
  countdown ("Prediction locks in") or "Kickoff has passed".
- **Prediction form:** Home/Draw/Away `OutcomeToggle` + two `ScoreStepper`s (home : away).
- **Points hint card (gold):** "Up to {max} pts on offer" listing *Correct result* (`{base} pts`)
  and *Exact score bonus* (`+{round(base×0.8)} pts`). Footer note: picks lock at kickoff, no
  edits after. Button → "How points work". **No multiplier row.**
- **Primary action:** "Lock in / Update prediction".

### 4. My Predictions (`MyPredictions`, `screens2.jsx`)
- **Purpose:** full pick history.
- **Summary cards (3):** Points banked, Correct results (`hits/settled`), Pending picks.
- **Segmented control:** All / Settled / Pending. List grouped by day of `CompactPredictionRow`s,
  each showing teams, predicted score, final score, correct/incorrect chip, and points badge.

### 5. Knockout bracket (`KnockoutBracket`, `screens2.jsx`)
- **Purpose:** build R32 → Final by tapping winners.
- **Layout:** horizontally scrollable columns (R32, R16, QF, SF, Final) of 184px-wide
  `BracketNode` cards, plus a 172px Champion column. Tapping a team advances it (highlights with
  `--brand-soft`, dims the loser to 0.45 opacity); some R32 nodes are pre-locked. Picking
  re-derives downstream rounds. Toast on advance; special toast for champion.
- **Champion card:** gold when filled ("70 pts if they lift it"), dashed placeholder otherwise.

### 6. Group predictions (`GroupPredictions`, `screens2.jsx`)
- **Purpose:** call 1st & 2nd in each of 12 groups.
- **Layout:** progress bar (`done/12`), then a grid (2-col desktop / 1-col mobile) of group
  cards. Each lists 4 teams with two `PosToggle` buttons (1st = gold, 2nd = green) that behave as
  a swap/clear pair. Header sub: "Correct winner = 8 pts, runner-up = 5 pts".

### 7. Tournament picks (`TournamentPicks`, `screens3.jsx`)
- **Purpose:** Champion / Other finalist / Golden Boot.
- **Hero:** green countdown card, "Lock your champion", "Pre-tournament picks" eyebrow (no
  emoji), locks at first kickoff.
- **Three expandable slot rows:** each opens a flag-grid picker; shows pts pill (70/40/30).

### 8. Leaderboard (`Leaderboard`, `screens3.jsx`)
- **Purpose:** standings.
- **Podium:** 2nd/1st/3rd bars with avatars, medal badges, points; place 1 uses `--brand` bar +
  gold ring. Below: full list of `LeaderboardRow`s (rank, avatar, name, accuracy/picks, points).
- League / Global segmented control. Footnote: "Accuracy = correct outcomes ÷ settled picks".

### 9. Profile (`Profile`, `screens3.jsx`)
- Header card (green banner + avatar + name + "{n}-pick streak", no emoji), 2×2 stat grid
  (Total points, League rank, Correct picks, Accuracy), nav link list (incl. **How scoring
  works → "Points & bonuses explained"**), and an Appearance (theme toggle) + Sign out card.

### 10. How points work (`HowScoring`, `screens4.jsx`) — *focus screen*
- **Purpose:** explain the full scoring model. Max-width 760px, centered.
- **Hero card:** `trirule` top stripe, "Scoring guide" eyebrow, "How points work" H1, intro
  paragraph, and **three "ways" cards**:
  1. **Match result** — green icon chip (`--brand-soft`/`--brand-strong`), "Call Home, Draw or Away", "10–70 pts"
  2. **Exact score** — gold icon chip (`--gold-soft`/`--on-gold`), "Nail the precise scoreline", "+80% bonus"
  3. **Tournament bets** — terracotta icon chip (`--red-soft`/`--red-strong`), "Champion, finalists & more", "up to 70"
- **"Match points by round" table:** columns Round / Result / Exact / Max. Each row has a round
  badge (GR or round code), label, and an animated proportional bar (green for Group, blue for
  knockout) plus the three numbers. Data is the table above (Group 10/+8/18 … Final 70/+56/126).
- **Lock-rule callout (green):** lock icon, "Picks lock at kickoff", "You can edit a prediction
  as many times as you like — right up until the whistle. Once the match starts, it's locked for
  good." (This replaced the old early-bird multiplier tiers.)
- **"Group & tournament bonuses" list card:** Group winner +8, Group runner-up +5, Champion +70,
  Other finalist +40, Golden Boot +30 — each a row with icon chip (gold chip if pts ≥ 40) and a
  `PointsBadge`.
- **Worked example card (`WorkedExample`):** `trirule` stripe, "Worked example · group match",
  France 2–1 Denmark pick visual (two large flags + "2–1"), two ledger lines (Correct result
  +10, Exact score 2–1 bonus +8), and a green "Total earned 18 pts" bar. **No ×multiplier line.**

---

## Interactions & Behavior
- **Routing:** `go(name, params)` sets `route` and scrolls content to top. No URL hash; in the
  target app use the real router.
- **Inline predict drawer (MatchCard):** "Predict"/"Edit" toggles a drawer with OutcomeToggle +
  two ScoreSteppers + Save; saving fires a toast and collapses. Open only when match status is `open`.
- **Score steppers:** clamp at 0; changing a score re-derives `outcome`.
- **Bracket:** tap-to-advance with downstream re-derivation; locked nodes are non-interactive.
- **Theme toggle:** sets `data-theme="dark"` on the frame; also exposed as a Tweak.
- **Toasts:** bottom-center, `toastin` animation, optional `kind: "gold"` and an icon.
- **Match status** is derived live from `kickoff` vs a clock (`now`): a result exists → `done`;
  `now ≥ kickoff` → `live`; else `open`. Status pills: Open (brand), Locked (neutral), Live
  (red, pulsing dot), Final (green).
- **Animations** (defined in `styles.css`): `slideup` (`.anim-up`), `slideright` (`.anim-right`),
  `fadein`, `popin` (`.anim-pop`), `bargrow` (table/progress bars), `marquee` (flag strips, 38s),
  `livepulse` (live dot). Entrance anims animate *from* hidden so paused/reduced-motion states
  remain visible. `prefers-reduced-motion: reduce` collapses durations to ~0.

## State Management
Local React state in the prototype; map to the target app's store + API.
- `route { name, params }` — current screen.
- `predictions` — `{ [matchId]: { outcome, hs, as } }`. Persisted server-side in production.
- `theme` — `"light" | "dark"`.
- `device` — `"mobile" | "desktop"` (presentation only; in production this is responsive, not a toggle).
- Per-screen drafts: bracket `picks` (by round), group `picks` (`{first, second}` per group),
  tournament `picks` (`{champ, finalist, boot}`), admin `scores`.
- **Data needs:** teams, groups (A–L, 4 each), fixtures (home/away/kickoff/group/round/venue),
  results, leaderboard, current user, and the points config (`roundPoints`, group/tournament
  bonus values). See `data.js` for the exact shape (mock data — replace with API).

## Design Tokens

All colors are authored in **oklch** as CSS custom properties in `styles.css` (`:root` for light,
`[data-theme="dark"]` for dark). Below are the light-theme source values; convert to the target
system's color format as needed. Several tokens are driven by Tweaks (see that section).

### Brand — grass-pitch green (`--brand-h: 152`)
| Token | Light | Dark |
|---|---|---|
| `--brand` | `oklch(0.5 0.11 152)` | `oklch(0.76 0.15 152)` |
| `--brand-strong` | `oklch(0.42 0.108 152)` | `oklch(0.84 0.14 152)` |
| `--brand-soft` | `oklch(0.95 0.035 152)` | `oklch(0.35 0.08 152)` |
| `--brand-ring` | `oklch(0.5 0.11 152 / 0.3)` | `oklch(0.76 0.15 152 / 0.42)` |
| `--on-brand` | `#f5fbf2` | `#06130c` |
| `--brand-grad` | `linear-gradient(152deg, oklch(0.41 0.092 150), oklch(0.31 0.072 156))` | `linear-gradient(152deg, oklch(0.36 0.09 150), oklch(0.25 0.07 158))` |

### Gold — points & trophies
| Token | Light | Dark |
|---|---|---|
| `--gold` | `oklch(0.78 0.125 80)` | `oklch(0.85 0.14 84)` |
| `--gold-strong` | `oklch(0.63 0.13 64)` | `oklch(0.89 0.135 82)` |
| `--gold-soft` | `oklch(0.945 0.055 84)` | `oklch(0.4 0.085 76)` |
| `--on-gold` | `#3c2a06` | `#18120a` |

### Blue (host accent) & Terracotta red (host accent / bad)
| Token | Light | Dark |
|---|---|---|
| `--blue` | `oklch(0.52 0.12 245)` | `oklch(0.72 0.13 248)` |
| `--blue-strong` | `oklch(0.45 0.13 248)` | `oklch(0.8 0.12 248)` |
| `--blue-soft` | `oklch(0.95 0.035 240)` | `oklch(0.37 0.09 250)` |
| `--red` | `oklch(0.56 0.17 32)` | `oklch(0.69 0.16 33)` |
| `--red-strong` | `oklch(0.49 0.18 32)` | `oklch(0.76 0.15 33)` |
| `--red-soft` | `oklch(0.95 0.05 36)` | `oklch(0.38 0.1 33)` |

### Neutrals — warm paper / cream
| Token | Light | Dark |
|---|---|---|
| `--bg` | `oklch(0.965 0.013 84)` | `oklch(0.19 0.013 120)` |
| `--surface` | `oklch(0.995 0.005 84)` | `oklch(0.235 0.015 124)` |
| `--surface-2` | `oklch(0.955 0.013 82)` | `oklch(0.275 0.016 124)` |
| `--line` | `oklch(0.9 0.014 80)` | `oklch(0.32 0.016 124)` |
| `--line-strong` | `oklch(0.83 0.016 78)` | `oklch(0.42 0.018 124)` |
| `--text` | `oklch(0.27 0.024 126)` | `oklch(0.96 0.009 92)` |
| `--text-2` | `oklch(0.45 0.02 116)` | `oklch(0.78 0.014 100)` |
| `--text-3` | `oklch(0.6 0.016 104)` | `oklch(0.6 0.016 108)` |

### Semantic
`--good oklch(0.55 0.13 150)` · `--good-soft oklch(0.94 0.045 150)` · `--bad` = red · `--warn oklch(0.7 0.13 65)`.

### Radii (Tweak "Corners": soft / round[default] / sharp)
`round` → `--radius:22 / --radius-sm:13 / --radius-xs:10` (px). `soft` → 14/9/7. `sharp` → 6/4/3.
Pills/buttons use `border-radius: 999px`.

### Shadows (light)
- `--shadow-sm`: `0 1px 2px oklch(0.35 0.04 90 / .06), 0 1px 3px oklch(0.35 0.04 90 / .08)`
- `--shadow-md`: `0 4px 12px oklch(0.3 0.04 90 / .09), 0 2px 4px oklch(0.3 0.04 90 / .06)`
- `--shadow-lg`: `0 18px 48px oklch(0.28 0.04 90 / .16), 0 6px 14px oklch(0.28 0.04 90 / .08)`

### Spacing & density
8px-ish rhythm; card padding ~14–22px; screen gutters `clamp(16px, 4vw, 34px)`. A density
multiplier `--pad` (Tweak: cozy = 0.7, comfy = 1) scales screen vertical padding.

### Typography
- **Display:** Archivo (Tweakable: Archivo / Sora / Space Grotesk), weights 700–900, tight
  tracking (`-0.02em` to `-0.03em`).
- **Body:** Manrope, weights 500–800.
- Scale (`styles.css`): `.t-display` 40 / `.t-h1` 28 / `.t-h2` 21 / `.t-h3` 16 / `.t-body` 15 /
  `.t-sm` 13 / `.t-xs` 11.5 / `.t-label` 11 (uppercase, `0.07em` tracking, weight 700).
- Numerals use `font-variant-numeric: tabular-nums` (`.tnum`).
- Google Fonts imported in `index.html` (Archivo, Manrope, Sora, Space Grotesk).

### Component primitives (classes in `styles.css`)
`.btn` (+ `.btn-primary` / `.btn-ghost` / `.btn-gold`), `.card`, `.chip`, `.pill`
(`.pill-open/-locked/-live/-done`), `.flag` (circular flag chip, sizes sm/lg), `.seg` + `.seg-btn`
(segmented control), `.trirule` / `.tribar-v` (green→gold→blue host-trio rule), `.lift`/`.press`
(hover/active micro-interactions), `.marquee-track`/`.marquee-mask`.

## Tweaks (design knobs, prototype-only)
Exposed via a Tweaks panel; not user-facing features. Defaults: `accent: "green"`,
`dark: false`, `corners: "round"`, `density: "comfy"`, `displayFont: "Archivo"`.
- **Accent** → sets `--brand-h`: green 152 / blue 245 / terracotta 32.
- **Dark mode** → `data-theme`.
- **Corners** → radii set above. **Density** → `--pad`. **Display font** → `--font-display`.

## Assets
- **No raster/image assets.** Team flags are **emoji** (e.g. 🇧🇷, 🇫🇷) from `data.js`; in
  production prefer a proper flag set (SVG sprite or flag-icons library) keyed by country code.
- **Icons** are inline SVG paths in an `Icon` component (`components.jsx`, map `P`) — names used:
  home, trophy, target, list, grid, bracket, medal, user, spark, bolt, clock, lock, unlock, check,
  x, chevL/R/D, minus, plus, settings, logout, sun, moon, monitor, phone. Swap for the codebase's
  icon system; keep stroke-based, ~2px weight.
- **Avatars** are initials on a hue-tinted background (`Avatar`, `components.jsx`).
- The brand "logo" is a trophy glyph in a rounded green tile + wordmark (`Logo`).

## Files
Source design files (in this bundle and the project root):
- `index.html` — entry; loads fonts, React 18 + Babel, and all scripts in order.
- `styles.css` — **all design tokens, type scale, primitives, animations.** Start here.
- `data.js` — mock data + the points config (`roundPoints`, group/tournament bonus values) and `WC` helpers.
- `components.jsx` — primitives: `Icon`, `Flag`, `TeamChip`, `Countdown`, `ScoreStepper`,
  `OutcomeToggle`, `PointsBadge`, `StatusPill`, `Avatar`, `EmptyState`, toasts, clock/format helpers.
- `components2.jsx` — `MatchCard` (+ inline drawer), **`pointsEarned`** (scoring logic),
  `CompactPredictionRow`, `LeaderboardRow`, `SectionHeader`.
- `screens1.jsx` — `LoginScreen`, `Dashboard`, `MatchDetail`, `Logo`, `PitchLines`, `FlagMarquee`.
- `screens2.jsx` — `MyPredictions`, `KnockoutBracket`, `GroupPredictions`.
- `screens3.jsx` — `TournamentPicks`, `Leaderboard`, `Profile`, `AdminResults`.
- `screens4.jsx` — **`HowScoring`** (the "How points work" screen) + `WorkedExample`.
- `app.jsx` — app shell, routing, mobile/desktop shells, theme, Tweaks wiring.
- `tweaks-panel.jsx` — Tweaks panel scaffold (prototype tooling; not part of the product).

**Recommended reading order:** `README.md` → `styles.css` (tokens) → `data.js` (scoring config) →
`components2.jsx` (`pointsEarned`) → `screens4.jsx` (`HowScoring`) → the rest.
