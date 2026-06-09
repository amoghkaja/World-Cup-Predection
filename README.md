# 🏆 World Cup Pick'em 2026

A multi-user prediction game for the **FIFA World Cup 2026** (48 teams, 104 matches). Sign in
with Google, predict every match score, build the knockout bracket, call group qualifiers, and
pick the podium + Golden Boot. Predictions **lock at kickoff**, results sync automatically, and
you climb a friends leaderboard. Mobile-first, with light **and** dark themes.

Built with **Next.js 16 + TypeScript + Tailwind CSS v4**, **Supabase** (Postgres + Google Auth +
Row-Level Security), live results from **football-data.org**, and deployed free on **Vercel**.

---

## ✨ Features

- **Google sign-in** (Supabase Auth) — no passwords.
- **Match predictions** — pick the exact score; the winner is derived. Live countdown to each
  per-match deadline; the form locks at kickoff (enforced server-side **and** by RLS). Edit any
  open pick straight from the **My Predictions** tab.
- **Knockout bracket** — predict every tie from the Round of 32 to the Final.
- **Group predictions** — pick each group's 1st & 2nd (auto-saves; locks at the first kickoff).
- **Podium & Golden Boot** — call the top three (champion / runner-up / third) with a two-window
  lock for max points, plus the tournament's top scorer.
- **Leaderboard** — global ranking with a top-3 podium; tap any player to see their picks for
  matches that have already kicked off.
- **Onboarding** — a first-login walkthrough; a dashboard checklist nudges new players to make
  their pre-tournament picks before they lock.
- **Admin panel** (`/admin/results`) — enter/override results, assign knockout teams, and settle
  groups, the podium, and the Golden Boot.
- **Automatic results** — a scheduled job pulls finished scores from football-data.org and
  re-scores every prediction (the admin panel is just a manual fallback).

## 🧮 Scoring

Round-weighted match points — **no time/early-bird multiplier**:

| Round | Correct result | Exact score |
|---|:--:|:--:|
| Group | 3 | 5 |
| Round of 32 | 4 | 6 |
| Round of 16 | 5 | 8 |
| Quarter-final | 6 | 10 |
| Semi-final | 8 | 13 |
| 3rd-place | 5 | 8 |
| Final | 9 | 15 |

**Bonuses:** group winner/runner-up **+4** each · **Podium (top-3)** — champion/runner-up/third
worth **15/12/10** if locked before the group stage, **12/10/8** if revised after groups (exact
slot only) · **Golden Boot +15**.

All values live in [`src/lib/scoring.ts`](src/lib/scoring.ts); the full design is in
[`docs/SCORING_REDESIGN.md`](docs/SCORING_REDESIGN.md).

---

## 🚀 Run it locally

> **Node 20+ is required** (Next.js 16). An `.nvmrc` is included — `nvm use` picks it up.

### 1. Install
```bash
npm install
```

### 2. Supabase
1. Create a project at <https://supabase.com> (free tier is fine).
2. In the **SQL Editor**, run these in order:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
   - `supabase/seed.sql`  *(48 teams + 104 matches)*
   - `supabase/migrations/0003_scoring_redesign.sql`  *(podium table + leaderboard)*
   - `supabase/migrations/0004_security_hardening.sql`  *(locks down self-scoring / admin escalation)*
   - `supabase/migrations/0005_fix_2026_teams.sql`  *(real 2026 draw)*
3. **Authentication → Sign In / Providers → Google → Enable.** Create a Web OAuth client in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials), set the redirect URI
   to `https://<project>.supabase.co/auth/v1/callback`, and paste the client ID/secret into Supabase.
4. **Authentication → URL Configuration:** allow-list `http://localhost:3000/**` (and your Vercel URL).

### 3. Environment
```bash
cp .env.local.example .env.local   # then fill in the values
```
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # server-only; powers admin scoring + the results sync
NEXT_PUBLIC_SITE_URL=http://localhost:3000
FOOTBALL_DATA_KEY=...                # free key from football-data.org (results sync)
CRON_SECRET=...                      # any long random string; protects the sync endpoint
```

### 4. Run
```bash
npm run dev      # http://localhost:3000
```

### 5. Make yourself admin
Sign in once, then in the Supabase SQL editor:
```sql
update public.profiles set is_admin = true where id = (
  select id from auth.users where email = 'you@example.com'
);
```

---

## 🔄 Automatic results

`GET /api/cron/sync-results` (guarded by `CRON_SECRET`) makes a **single** call to football-data.org,
updates real kickoff times, fills knockout teams as the bracket fills, applies final scores, and
re-scores predictions. Trigger it from the included GitHub Action
([`.github/workflows/sync-results.yml`](.github/workflows/sync-results.yml)) — set the `APP_URL` and
`CRON_SECRET` repo secrets and re-enable its schedule. The free football-data.org tier (10 req/min)
is plenty: one call returns all 104 matches.

## ☁️ Deploy to Vercel

Import the repo at <https://vercel.com>, add the six env vars above (set `NEXT_PUBLIC_SITE_URL` to
your Vercel domain), and deploy. Then add `https://<app>.vercel.app/**` to the Supabase URL
allow-list and the Google OAuth JavaScript origins.

---

## 🗂️ Project structure

```
src/
  app/
    (app)/            authenticated area (responsive shell: sidebar + bottom tab bar)
      dashboard/  matches/[id]/  bracket/  groups/  tournament/  predictions/
      leaderboard/  u/[id]/  profile/  scoring/  admin/results/
    api/cron/sync-results/   football-data.org results sync (route handler)
    login/  auth/            Google sign-in + OAuth callbacks
    actions.ts               server actions (writes, deadline + admin scoring)
  components/                Shell, Icon, MatchCard, PredictionForm, pickers, Onboarding…
  lib/
    scoring.ts               points model
    queries.ts  format.ts  types.ts  supabase/   data + helpers
  proxy.ts                   session refresh + route guard (Next 16 proxy)
supabase/migrations/         schema, RLS, scoring redesign, security, team fix
docs/                        design handoff + scoring spec
```

## 🛠️ Tech stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · Supabase
(Postgres, Auth, RLS) · football-data.org · Vercel.
