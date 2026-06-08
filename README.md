# 🏆 World Cup Pick'em 2026

A multi-user prediction web app for the **FIFA World Cup 2026** (48 teams, 104 matches).
Sign in with Google, predict match scores, knockout winners, group qualifiers, and the
overall champion. Predictions **lock at kickoff**, and you earn more points for **bold,
early calls**. Climb the leaderboard against your friends. Works great on phone and laptop.

Built with **Next.js 16 + TypeScript + Tailwind CSS**, **Supabase** (Postgres + Google
Auth + Row Level Security), and deployable free on **Vercel**.

---

## ✨ Features

- **Google sign-in** (Supabase Auth) — no passwords.
- **Match predictions** — pick the exact score; the winner is derived. Live countdown to
  the per-match deadline; the form locks at kickoff (enforced server-side **and** by RLS).
- **Knockout bracket** — predict every tie from the Round of 32 to the Final, including the
  advancer when a tie is level at 90'. Matches unlock once their teams are confirmed.
- **Group predictions** — pick each group's winner and runner-up (locks at the first kickoff).
- **Champion & Golden Boot** — pre-tournament picks worth big points.
- **Leaderboard** — global ranking with avatars, points, and accuracy. Your row is highlighted.
- **My Picks** — full prediction history with points earned and the early-bird multiplier.
- **Admin panel** (`/admin/results`) — enter final scores to auto-award points; set
  knockout teams as the bracket fills; settle groups and the champion.

## 🧮 Scoring system (tiered + early-bird time bonus)

```
points = round(base_points × time_multiplier)
```

**Base points** (correct outcome, by round; exact-score adds a bonus):

| Round         | Correct outcome | + Exact score |
|---------------|:---------------:|:-------------:|
| Group         | 3               | +3            |
| Round of 32   | 4               | +4            |
| Round of 16   | 5               | +5            |
| Quarter-final | 7               | +6            |
| Semi-final    | 10              | +8            |
| Final         | 15              | +12           |

**Special:** each correct group qualifier **+4** · champion **+30** · Golden Boot **+15**.

**Early-bird time multiplier** — predicting earlier is riskier, so it pays more
(based on time before kickoff): ≥7 days `×1.5` · 3–7 days `×1.3` · 1–3 days `×1.15` · <24h `×1.0`.

All values live in [`src/lib/scoring.ts`](src/lib/scoring.ts) — tune freely.

---

## 🚀 Setup (clone & run locally)

### 1. Install
```bash
npm install
```

### 2. Create a Supabase project
1. Go to <https://supabase.com> → **New project** (free tier is fine).
2. In **SQL Editor**, run these files in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/seed.sql`  *(48 teams + 104 matches)*
3. **Authentication → Providers → Google → Enable.** Create OAuth credentials in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials) (OAuth client,
   type *Web*). Set the **Authorized redirect URI** to the value Supabase shows
   (`https://<project>.supabase.co/auth/v1/callback`). Paste the client ID/secret into Supabase.
4. **Authentication → URL Configuration:** add `http://localhost:3000/**` (and later your
   Vercel URL) to the redirect allow-list.

### 3. Environment variables
Copy the example and fill in values from **Supabase → Settings → API**:
```bash
cp .env.local.example .env.local
```
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...     # server-only; powers admin scoring
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 4. Run
```bash
npm run dev      # http://localhost:3000
```

### 5. Make yourself an admin
Sign in once, then in Supabase **SQL Editor**:
```sql
update public.profiles set is_admin = true where id = (
  select id from auth.users where email = 'you@example.com'
);
```
You'll now see the **Admin** link → `/admin/results`.

---

## ☁️ Deploy to Vercel (free)

1. Push this repo to GitHub (already done if you're reading this on GitHub).
2. <https://vercel.com> → **New Project** → import the repo.
3. Add the same env vars (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`) and set `NEXT_PUBLIC_SITE_URL` to your Vercel domain.
4. Deploy. Then add `https://<your-app>.vercel.app/**` to Supabase **URL Configuration**
   and to the Google OAuth redirect list.

> **Why Vercel, not GitHub Pages?** GitHub Pages only serves static files — it can't run
> the auth, database, and server-side deadline checks this app needs. Vercel runs the
> Next.js server for free.

---

## 🗂️ Project structure

```
src/
  app/
    (app)/            authenticated area (shared layout + nav)
      dashboard/      upcoming matches + inline predictions
      matches/[id]/   single-match prediction
      bracket/        knockout bracket predictions
      groups/         group winner / runner-up picks
      tournament/     champion + golden boot
      predictions/    my picks history
      leaderboard/    global ranking
      profile/        display name + sign out
      admin/results/  admin: enter results & settle (admin only)
    login/            Google sign-in
    auth/             OAuth callback + sign-out routes
    actions.ts        server actions (writes, deadline + admin scoring)
  components/         MatchCard, PredictionForm, Countdown, pickers, nav…
  lib/
    scoring.ts        points model (edit to tune)
    queries.ts        server data fetching
    supabase/         browser/server/proxy clients
    format.ts         countdown + date helpers
  proxy.ts            session refresh + route guard (Next 16 proxy)
supabase/
  migrations/         schema + RLS
  seed.sql            generated teams + fixtures
scripts/generate-seed.mjs   regenerate seed: `npm run seed:gen`
docs/DESIGN_BRIEF.md  UI design handoff prompt
```

## 📝 Notes & next steps

- **Data accuracy:** team groups and kickoff times in the seed are based on the published
  2026 draw but should be verified; exact kickoff times are reasonable placeholders spread
  across the real tournament window — adjust any match in the admin panel (or edit
  `scripts/generate-seed.mjs` and re-run `npm run seed:gen`).
- **Ideas to extend:** private friend leagues, per-match comments, push reminders before
  deadlines, finalists prediction (the scoring already supports it), automated group
  standings settlement.
