# Design handoff prompt — World Cup Pick'em 2026

Paste the prompt below into Claude (or "Claude design") to generate high-fidelity UI
mockups and a style guide. The app is already built to this structure, so the output can
be dropped in screen-by-screen.

---

> **Design a mobile-first responsive web app called "World Cup Pick'em" for predicting FIFA World Cup 2026 results.**
>
> **Product:** Friends/colleagues compete by predicting match winners, exact scores, knockout progression, and the overall champion. Points are awarded for correct predictions, scaled by tournament round and by how early the prediction was made. Predictions lock at each match's kickoff. Works great on phones and laptops.
>
> **Brand & style:** Energetic, modern, sporty but clean. Football/soccer World Cup 2026 theme (USA/Canada/Mexico). Use a confident primary color (deep emerald green) with a gold accent for points/winners, generous rounded cards, clear typography, country flag emojis, and subtle motion. Dark theme first, with an optional light mode. Accessible contrast. Component system like shadcn/ui + Tailwind.
>
> **Design these screens (mobile + desktop layouts for each):**
> 1. **Login** — single "Continue with Google" button, app logo, tagline, hero.
> 2. **Dashboard** — list of upcoming matches as cards: two teams + flags, kickoff date/time, a **live countdown** to the lock deadline, and inline controls to set an exact score (the winner is derived). Clearly show locked vs open matches and whether the user has already predicted.
> 3. **Match detail** — full prediction form: score steppers, countdown, points-available hint with the early-bird multiplier explained.
> 4. **My Predictions** — history grouped by date/round, each showing the pick, result, and points earned (with a small badge for the time-bonus multiplier).
> 5. **Knockout bracket** — interactive R32 → R16 → QF → SF → Final bracket where users pick winners; show locked/open state per match. Horizontally scrollable on mobile.
> 6. **Group predictions** — for each of the 12 groups (A–L), pick the group winner and runner-up from the 4 teams.
> 7. **Tournament picks** — pre-tournament: pick the **Champion** and **Golden Boot** top scorer, with a big "locks at first kickoff" countdown.
> 8. **Leaderboard** — ranked list with avatar, name, total points, and accuracy %; highlight the current user; top-3 podium treatment.
> 9. **Profile** — avatar, display name, personal stats (points, correct picks, rank), sign out.
> 10. **Admin results entry** — simple form to input final scores per match (admin only).
>
> **Key UI elements to include as reusable components:** match card, countdown timer, score stepper, points badge, team chip with flag, bracket node, leaderboard row, lock indicator, empty states, and toast notifications.
>
> **Deliverables:** high-fidelity mockups for all screens at mobile (390px) and desktop (1280px) widths, a component/style guide (colors, type scale, spacing, button/states), and notes on interactions (countdown, locking, predicting). Keep it implementable with Tailwind + shadcn/ui.

---

## Current theme tokens (so designs match the build)

Defined in `src/app/globals.css`:

| Token        | Value     | Use                    |
|--------------|-----------|------------------------|
| background   | `#0a0f0d` | page background        |
| surface      | `#121a17` | cards                  |
| surface-2    | `#1a2521` | inputs, chips          |
| border       | `#25332d` | borders                |
| foreground   | `#e8f0ec` | text                   |
| muted        | `#8aa093` | secondary text         |
| primary      | `#10b981` | emerald — buttons/CTAs |
| accent       | `#f5c518` | gold — points/winners  |
| danger       | `#ef4444` | locked/wrong           |
