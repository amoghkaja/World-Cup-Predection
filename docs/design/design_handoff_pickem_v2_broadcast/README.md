# Handoff: World Cup Pick'em — v2 "Broadcast" Redesign

## Overview
A predictions game where users predict the score of every match, pick group winners
and runners-up, build a knockout bracket, and compete on a friends leaderboard.

**v2 is a full visual redesign** of the earlier warm "match-programme" theme (that version
is documented in `design_handoff_world_cup_pickem/`). v2 is a clean, data-dense
**broadcast-style light theme**: cool paper background, navy ink, host-trio accents
(blue / red / green — USA · Canada · Mexico), gold reserved for points/rewards.

v2 also introduces **multi-competition support**: the same UI renders World Cup 2026,
a domestic league (Premier League–style, with a standings table and relegation zones),
and a Champions League–style hybrid (league phase table + locked knockout bracket).
Screens render from a competition config (`v2/comps.js`), not hardcoded WC data.

Two presentation targets, shown side-by-side in the prototype shell:
- **Mobile — 390 × 844**: sticky top app bar + 3–4-item bottom tab bar.
- **Desktop — 1280 × 844**: top app bar with inline horizontal nav (no sidebar).

## About the Design Files
These files are **design references built in HTML/React (in-browser Babel)** — prototypes
showing intended look, layout, and behavior. They are **not production code to ship**.
Recreate the designs in the target codebase using its established framework, component
library, and patterns. If no front-end environment exists yet, pick the most appropriate
framework and implement there. Treat the React code as a precise spec, not a drop-in.

The outer shell (screen switcher, device toggle, side-by-side frames, Tweaks panel) is
**prototype chrome only** — do not implement it. Everything inside a `.frame` is product.

Open `Pick'em v2.html` in a browser to explore the live prototype.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, shadows, copy, and interactions are
final. All colors are CSS custom properties (see **Design Tokens**) — wire them into the
target theming system rather than hard-coding per component.

Tweakable variants exist in the prototype (accent color, display font, density, radius,
photo treatment). **Defaults are the spec**: blue accent, Archivo display, comfortable
density, radius 12px, duotone photos. Ship the defaults unless told otherwise; the
variant hooks (`data-accent`, `data-font`, `data-density`, `data-photo` on `<body>`)
show how theming should stay centralized.

## Screens / Views

### 1. Login (`v2/screens-a.jsx` — `LoginScreen`)
- **Purpose**: sign in with Google; sell the game.
- **Layout — desktop**: 2-column grid `1.25fr 1fr`. Left: full-height navy hero panel.
  Right: white panel, 360px-wide form centered.
- **Layout — mobile**: hero panel 470px tall on top, form below on white (`padding: 26px 22px 34px`).
- **Hero panel** (`.hero-navy`): navy gradient `linear-gradient(165deg, #0e1a2b 0%, #16263c 60%, #1b3050 100%)`,
  a photo slot behind a bottom-heavy navy scrim, tricolor rule + display headline
  "Call the tournament." (Archivo 800 uppercase, 58px desktop / 40px mobile, gold period)
  + one-line subcopy at bottom-left.
- **Form**: wordmark, `t-h1` "Sign in to play", muted subline, full-width ghost
  "Continue with Google" button (46px min-height, Google G icon), a row of 12 small
  team flags + "+36 more", legal microcopy.
- No app chrome (no app bar / tab bar) on this screen.

### 2. Dashboard / Matches (`v2/screens-a.jsx` — `DashboardScreen`)
Default screen. Desktop: 2-column `1fr 320px` grid, max-width 1180, gap 24. Mobile: single
column, `padding: 16px 16px 90px` (bottom padding clears tab bar).
- **Live now** section (when a match is live): match rows with red `LIVE 63′` blinking pill,
  live score in place of steppers.
- **Featured "Your next pick" card**: navy card (no border), gold countdown pill top-right,
  3-column layout (team / "vs" / team) with XL flag, code (Archivo 20px), name, and a
  score stepper per team; kickoff line centered at bottom.
- **Upcoming matches grouped by day** (`Sect` header = day, right = "N matches"): cards of
  `MatchRow`s.
- **Full time** section: finished matches with final score, winner emphasized
  (loser rows drop to `--ink-3`), `FT` pill + points pill (`+10 pts` gold / `0 pts` gray).
- **Desktop right rail**: `MiniBoard` (top-5 standings card) + "Your form" card
  (W/W/L/W/D result chips: green/red/gray 26px rounded squares + streak line).

**MatchRow anatomy** (`.mrow`): 2-col grid `1fr auto`. Left: two `.mteam` rows, each a grid
`26px 40px 1fr auto` = flag · 3-letter code (Archivo 800 14px) · full name (13px muted,
ellipsized) · stepper-or-score. Right meta column (right-aligned, min-width 86px):
- *open*: kickoff time (tabular), "locks in HH:MM:SS" live countdown, `Picked`/`Open` pill
- *live*: live pill + venue city
- *done*: `FT` pill + points pill
- *locked*: `Locked` pill
On mobile, open rows hide the full team name (steppers need the room).

### 3. Group stage picks (`v2/screens-b.jsx` — `GroupsScreen`)
- Header: `t-h1` "Group stage picks" + progress pill "N / 12 done".
- Grid of 12 group cards: 3 columns on desktop, 1 on mobile, gap 16.
- **GroupCard**: header "GROUP A" (Archivo uppercase) + progress hint; 4 tappable team rows
  (flag · code · name · tag). **Tap cycles a team: winner → runner-up → clear.** Tags:
  `1st` solid green, `2nd` accent-soft w/ accent inset ring, `—` gray.

### 4. Knockout bracket (`v2/screens-b.jsx` — `BracketScreen`)
- Header + (when champion picked) gold pill "🏳 {Team} to win it".
- Horizontally scrollable bracket (`min-width: 940px`), columns: Round of 32 (16 nodes,
  seeded from group picks + third-place slots) → Round of 16 → Quarterfinals → Semifinals
  → Final → Champion column.
- **BktNode**: card of two stacked team buttons (flag · code · muted name). Tap advances a
  team; picked state = accent-soft bg, accent text, 2px accent inset bar on the left.
  Unresolved slots show seed labels ("A1", "B2", "C3"…) in muted text.
  Replacing a pick clears now-invalid downstream picks.
- **Champion card**: large flag, team name (Archivo uppercase 17px), gold pill "+70 pts if
  right"; gold border when picked; placeholder copy otherwise.
- The UCL competition swaps this for `UclBracketScreen` (`v2/screens-league.jsx`): a locked
  state card — round pills fading left→right, "Picks open after matchday 8", explanation,
  gold pill "Knockout picks score 15 – 70 pts".

### 5. Standings (leagues/UCL only, `v2/screens-league.jsx` — `StandingsScreen`)
- Club table card: header row on `--surface-2` with `t-label` column headers.
- Columns — desktop: `# · crest · Club · P · W · D · L · GD · Pts`; mobile drops W/D/L.
- GD colored green/positive, red/negative, gray/zero. Pts column Archivo 15px.
- **Zone markers**: an inline green-soft row after position N ("Champions League places" /
  "Straight to Round of 16") with tricolor rule; relegation rows get `--red-soft` bg
  + footnote "Shaded rows: relegation zone."
- Club crests are **generic monogram badges** (club-colored rounded rect + 3-letter code) —
  no copyrighted marks. Keep it that way unless the org has license.

### 6. Leaderboard (`v2/screens-c.jsx` — `LeaderboardScreen`)
- Header (`t-h1` "Leaderboard" + competition note) with tricolor rule at right.
- **Podium**: 3 equal cards, 3px top border in gold / silver `#b9c2cc` / bronze `#c9906b`;
  avatar (52px for 1st, 44px others) with place badge, name, big points, accuracy line.
- **Table card**: rows = rank · (desktop: ▲▼— movement, green/red/gray) · avatar · name
  (+ small accent "YOU" tag) · (desktop: accuracy bar 4px accent fill + %, picks count) ·
  points. Current user row gets `--accent-soft` background.
- **Desktop right rail**: "Your season" 2×2 stat card (Rank / Points / Accuracy / Streak,
  22px tabular numerals over tiny uppercase labels) + photo card with duotone image slot
  and motivational copy ("12 pts behind the lead").
- ⚠️ The subtitle copy "early-bird bonus active" is a stale remnant — there is **no
  early-bird mechanic**. Omit it.

### 7. Competition switcher (`v2/screens-league.jsx` — `CompSwitch`)
- In the app bar next to the wordmark: bordered button showing the short comp name
  ("WC 26" / "League" / "UCL") + chevron.
- Opens a 232px dropdown card: one row per competition (name, tag line, accent "ON" badge
  on active), footer strip "One account, every competition. Points stay per league."
- Switching competitions resets to the dashboard and swaps the nav set (each comp declares
  its own nav in config — WC has Groups+Bracket, league has Standings, UCL has both).

### App chrome
- **Mobile app bar** (`.appbar`): sticky, 92%-white + blur(8px), bottom hairline.
  Wordmark · comp switcher · spacer · 28px avatar.
- **Mobile tab bar** (`.tabbar`): fixed bottom, 96%-white + blur, top hairline; 3–4 equal
  tabs (per comp config): 20px geometric stroke icon + 10px Archivo uppercase label;
  active = accent-strong.
- **Desktop app bar**: wordmark · comp switcher · inline nav (`.dnav` — uppercase Archivo
  12.5px buttons; active = solid navy pill with light text) · spacer · gold points pill
  ("241 pts") · avatar.
- **Wordmark**: "PICK'EM '26" — Archivo 800 uppercase, "'26" in accent (gold on navy),
  followed by the 44×3px tricolor rule (red/blue/green thirds, 2px radius).

## Interactions & Behavior
- **Score stepper** (`.step`): − / value / + in a bordered rounded group; buttons 30×34px,
  value Archivo 800 16px tabular. Clamp 0–9. Unset shows "–".
- **Pick states per match**: open (steppers + countdown) → locked at kickoff → live
  (score + red blinking pill) → done (FT + points). Status is derived from kickoff vs now
  and results; predictions lock at kickoff.
- **Countdowns** tick every second (`d h:mm` above 24h, `hh:mm:ss` below).
- **Group pick cycle**: tap team → winner; tap winner → demote to runner-up; tap runner-up
  → clear. Picking a new winner replaces the old.
- **Bracket**: tapping a team advances it to the next round slot; changing an earlier pick
  clears dependent downstream picks.
- **Hovers**: rows `--surface-2`; primary button darkens to `--accent-strong`; buttons
  scale 0.98 on press. Transitions: background .15s, transform .08s.
- **Live pill dot**: 6px white dot, `blink` 1.2s infinite (opacity 0.35 at 50%).
- Links: `--accent-strong`, hover `--accent` + underline.

## State Management
- `comp` — active competition id (`wc26` / `epl` / `ucl`); nav + data derive from config.
- `screen` — active screen key.
- `scores` — map matchId → `{ hs, as }` score predictions.
- `groupPicks` — map group → `{ w, r }` (winner / runner-up codes).
- `koPicks` — map `"{roundKey}-{index}"` → team code; bracket derives from groupPicks + koPicks.
- Match status derived: `live` flag → live; has result → done; `kickoff <= now` → locked; else open.
- Production needs: auth (Google), persistence of picks, fixtures/results feed,
  leaderboard aggregation, per-competition leagues.

## Scoring Model
Base points by round for a correct result (H/D/A), plus an exact-score bonus of
`round(base × 0.8)` (see `roundPoints` in `data.js`):
Group 10 (+8) · R32 15 (+12) · R16 20 (+16) · QF 30 (+24) · SF 45 (+36) · Final 70 (+56).
**No early-bird / time multiplier exists.**

## Design Tokens (from `v2/styles.css`)
**Neutrals**: `--bg #eef0f3` · `--surface #ffffff` · `--surface-2 #f5f6f8` ·
`--line #e4e7eb` · `--line-2 #cfd5db` · `--ink #101720` · `--ink-2 #4c5764` ·
`--ink-3 #8a94a0` · page backdrop `#dfe2e7` (prototype shell only).

**Accents (oklch)**:
- blue `oklch(0.44 0.155 257)` / strong `oklch(0.36 0.14 258)` / soft `oklch(0.945 0.025 250)` — **default accent**
- red `oklch(0.54 0.185 27)` / strong `oklch(0.46 0.18 27)` / soft `oklch(0.95 0.035 27)` — live, losses, relegation
- green `oklch(0.5 0.12 155)` / strong `oklch(0.42 0.11 156)` / soft `oklch(0.94 0.045 155)` — open, wins, qualification
- gold `oklch(0.7 0.13 80)` / soft `oklch(0.95 0.055 88)` / deep `oklch(0.56 0.12 72)` — points & rewards only
- navy `#0e1a2b` / `#16263c`, on-navy `#f2f5f9` — hero, featured card, active desktop nav

**Type**: display **Archivo** (500–900) — headings, codes, numerals, labels, all uppercase
display via `.td` (800, ls −0.02em, lh 0.98); body **Manrope** (500–800) at 15px base.
Alternate display: Barlow Condensed (variant only). Scale: h1 24/800, h2 18/750,
label 10.5/700 ls 0.1em uppercase, sm 12.5, xs 11. Numerals always tabular.

**Spacing/shape**: `--radius 12px` (buttons −3px, steppers −4px), `--rowpad 12px`,
`--cardpad 16px` (compact variant: 7/11). Frames: mobile 390×844, desktop 1280×844.

**Shadows**: sm `0 1px 2px rgb(16 23 32 / .06)` · md `0 4px 14px rgb(16 23 32 / .08)` ·
lg `0 18px 44px rgb(16 23 32 / .16)`.

**Photo treatment (duotone default)**: image grayscale(1) contrast(1.06) brightness(1.04),
accent overlay at 0.82 multiply + navy at 0.25 lighten.

## Assets
- **Flags**: flagcdn.com PNGs (`w80` + `w160` 2x), 26×19.5px default (sm 20, lg 42, xl 58),
  3px radius, 1px inner inset ring. ISO mapping in `v2/ui.jsx`.
- **Club crests**: generic monograms drawn in CSS (see `CLUBS` in `v2/comps.js` for colors).
- **Icons**: inline geometric stroke SVGs (`TIcon` in `v2/ui.jsx`), 20×20, stroke 1.8.
- **Photos**: `<image-slot>` placeholders (login hero, leaderboard card) — supply real
  photography; the duotone treatment is applied in CSS.
- **Fonts**: Google Fonts — Archivo, Manrope (+ Barlow Condensed for the variant).

## Files
- `Pick'em v2.html` — entry point (open in a browser)
- `v2/styles.css` — all tokens + component CSS (the styling spec)
- `v2/comps.js` — competition registry (nav, fixtures, standings, club colors)
- `v2/ui.jsx` — primitives: Flag/TeamMark, Trico, Wordmark, Avatar, Stepper, Countdown, icons
- `v2/app.jsx` — prototype shell + app state (shell is not product)
- `v2/screens-a.jsx` — Login, Dashboard
- `v2/screens-b.jsx` — Groups, Bracket
- `v2/screens-c.jsx` — Leaderboard
- `v2/screens-league.jsx` — CompSwitch, Standings, UCL locked bracket
- `data.js` — WC26 mock data + `roundPoints` scoring table
- `image-slot.js`, `tweaks-panel.jsx` — prototype support only (do not implement)
