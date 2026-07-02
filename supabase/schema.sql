-- ─────────────────────────────────────────────────────────────────────────────
-- THE BRAIN HUNTER — Supabase Schema
-- Run this in the Supabase SQL Editor (supabase.com → your project → SQL Editor)
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. scores table ──────────────────────────────────────────────────────────
-- One row per game played. The leaderboard aggregates the best score per user.

CREATE TABLE IF NOT EXISTS public.scores (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      text        NOT NULL,         -- local UUID (Supabase auth UID in Phase 2)
  username     text        NOT NULL,         -- unique handle shown on leaderboard
  display_name text        NOT NULL,         -- full display name
  score        integer     NOT NULL DEFAULT 0,
  level        integer     NOT NULL DEFAULT 1,
  played_at    timestamptz DEFAULT now()
);

-- Index for fast per-user queries
CREATE INDEX IF NOT EXISTS scores_user_id_idx ON public.scores (user_id);
-- Index for leaderboard ranking
CREATE INDEX IF NOT EXISTS scores_score_idx   ON public.scores (score DESC);


-- ── 2. Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.scores ENABLE ROW LEVEL SECURITY;

-- Anyone (including anonymous users) can READ scores — needed for leaderboard
CREATE POLICY "Public read scores"
  ON public.scores FOR SELECT
  USING (true);

-- Anyone can INSERT a score — no auth required for Phase 1
-- Phase 2: tighten this to check auth.uid() = user_id
CREATE POLICY "Public insert scores"
  ON public.scores FOR INSERT
  WITH CHECK (true);


-- ── 3. leaderboard view ───────────────────────────────────────────────────────
-- Shows the best score per player, ranked globally.
-- Queried by the app: SELECT * FROM leaderboard ORDER BY rank LIMIT 20

CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY best_score DESC, username ASC)::integer AS rank,
  username,
  display_name,
  best_score,
  best_level,
  games_played
FROM (
  SELECT
    user_id,
    username,
    display_name,
    MAX(score)  AS best_score,
    MAX(level)  AS best_level,
    COUNT(*)    AS games_played
  FROM public.scores
  GROUP BY user_id, username, display_name
) player_bests
ORDER BY best_score DESC;


-- ── 4. cms_config table ──────────────────────────────────────────────────────
-- Single-row table controlled by the admin. The app reads the first row on startup.
-- Fields:
--   spin_threshold  — minimum score required to earn the spin wheel (default 10000)
--   prize_enabled   — toggle the entire prize/wheel feature on or off
--   wheel_segments  — JSONB array of WheelSegment objects (see cmsConfig.ts for schema)

CREATE TABLE IF NOT EXISTS public.cms_config (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  spin_threshold   integer     NOT NULL DEFAULT 10000,
  prize_enabled    boolean     NOT NULL DEFAULT true,
  wheel_segments   jsonb       NOT NULL DEFAULT '[]'::jsonb,
  updated_at       timestamptz DEFAULT now()
);

-- RLS: read-only for everyone; only service-role / dashboard can write
ALTER TABLE public.cms_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cms_config"
  ON public.cms_config FOR SELECT
  USING (true);

-- Seed one row with defaults so the first SELECT always returns data
INSERT INTO public.cms_config (spin_threshold, prize_enabled, wheel_segments)
VALUES (
  10000,
  true,
  '[
    {"id":"s0","lines":["DOUBLE","POINTS"],"type":"double","value":null,"code":null,"probability":0.10},
    {"id":"s1","lines":["20%","OFF CODE"],"type":"discount","value":"20","code":"RTLD20","probability":0.12},
    {"id":"s2","lines":["MERCH","GIFT"],"type":"merch","value":null,"code":null,"probability":0.08},
    {"id":"s3","lines":["30%","OFF CODE"],"type":"discount","value":"30","code":"RTLD30","probability":0.08},
    {"id":"s4","lines":["15%","OFF CODE"],"type":"discount","value":"15","code":"RTLD15","probability":0.16},
    {"id":"s5","lines":["+1,000","POINTS"],"type":"points","value":"1000","code":null,"probability":0.20},
    {"id":"s6","lines":["OUT OF","LUCK"],"type":"none","value":null,"code":null,"probability":0.16},
    {"id":"s7","lines":["10%","OFF CODE"],"type":"discount","value":"10","code":"RTLD10","probability":0.10}
  ]'::jsonb
)
ON CONFLICT DO NOTHING;


-- ── 5. Phase 2 — Full Supabase integration ───────────────────────────────────
-- Run the SQL below in the Supabase SQL Editor.
-- PREREQUISITE: Enable anonymous sign-ins in the Supabase Dashboard first:
--   Authentication → Settings → Enable anonymous sign-ins → Save

-- ── 5a. profiles table ───────────────────────────────────────────────────────
-- One row per registered player, keyed by Supabase auth.uid().
CREATE TABLE IF NOT EXISTS public.profiles (
  id             uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username       text        UNIQUE NOT NULL,
  display_name   text        NOT NULL,
  email          text,
  email_consent  boolean     NOT NULL DEFAULT false,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read profiles"
  ON public.profiles FOR SELECT USING (true);

CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ── 5b. user_push_tokens table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token        text        NOT NULL,
  platform     text        NOT NULL DEFAULT 'unknown',
  updated_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, token)
);

ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push tokens"
  ON public.user_push_tokens FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 5c. Expand cms_config with period + prize fields ─────────────────────────
ALTER TABLE public.cms_config
  ADD COLUMN IF NOT EXISTS period_start     timestamptz,
  ADD COLUMN IF NOT EXISTS period_end       timestamptz,
  ADD COLUMN IF NOT EXISTS prize_title      text DEFAULT 'PRIZE OF THE WEEK',
  ADD COLUMN IF NOT EXISTS prize_description text DEFAULT 'RTLD Limited Edition Signed Poster',
  ADD COLUMN IF NOT EXISTS prize_value      text DEFAULT '$150 value';

-- Set initial ranking period to the current week (Mon–Sun) in PST
UPDATE public.cms_config SET
  prize_title       = 'PRIZE OF THE WEEK',
  prize_description = 'RTLD Limited Edition Signed Poster',
  prize_value       = '$150 value',
  period_start      = date_trunc('week', now() AT TIME ZONE 'America/Los_Angeles') AT TIME ZONE 'America/Los_Angeles',
  period_end        = (date_trunc('week', now() AT TIME ZONE 'America/Los_Angeles') + interval '7 days') AT TIME ZONE 'America/Los_Angeles';

-- ── 5d. All-time leaderboard view (join profiles for authoritative usernames) ─
CREATE OR REPLACE VIEW public.leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY s.best_score DESC, p.username ASC)::integer AS rank,
  p.username,
  p.display_name,
  s.best_score,
  s.best_level,
  s.games_played,
  s.user_id
FROM (
  SELECT
    user_id,
    MAX(score)  AS best_score,
    MAX(level)  AS best_level,
    COUNT(*)    AS games_played
  FROM public.scores
  GROUP BY user_id
) s
JOIN public.profiles p ON p.id::text = s.user_id
ORDER BY s.best_score DESC;

-- ── 5e. Period leaderboard view (filtered by cms_config period, PST-aware) ───
-- Period start/end stored as UTC timestamptz; scores.played_at is also UTC.
-- Admin sets period dates in the Supabase Table Editor (cms_config row).
CREATE OR REPLACE VIEW public.period_leaderboard AS
WITH cfg AS (
  SELECT period_start, period_end
  FROM public.cms_config
  WHERE period_start IS NOT NULL AND period_end IS NOT NULL
  LIMIT 1
),
period_scores AS (
  SELECT
    sc.user_id,
    MAX(sc.score)  AS best_score,
    MAX(sc.level)  AS best_level,
    COUNT(*)       AS games_played
  FROM public.scores sc
  JOIN cfg ON sc.played_at >= cfg.period_start AND sc.played_at < cfg.period_end
  GROUP BY sc.user_id
)
SELECT
  ROW_NUMBER() OVER (ORDER BY ps.best_score DESC, p.username ASC)::integer AS rank,
  p.username,
  p.display_name,
  ps.best_score,
  ps.best_level,
  ps.games_played,
  ps.user_id
FROM period_scores ps
JOIN public.profiles p ON p.id::text = ps.user_id
ORDER BY ps.best_score DESC;

-- ── 5f. Update scores RLS: require authenticated session (incl. anonymous) ────
DROP POLICY IF EXISTS "Public insert scores" ON public.scores;

CREATE POLICY "Authenticated insert scores"
  ON public.scores FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- ── 5g. Clear test scores (all have fake local-XXX user IDs) ─────────────────
-- Safe: no real players have registered yet.
TRUNCATE TABLE public.scores;

-- ── 6. username_history table ────────────────────────────────────────────────
-- Logs every username change. Written by the app whenever a user updates their
-- handle in Control Central → Account. Keyed by auth user_id (UUID).

CREATE TABLE IF NOT EXISTS public.username_history (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  old_username text        NOT NULL,
  changed_at   timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_username_history_user ON public.username_history (user_id);

ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own username history"
  ON public.username_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read username history"
  ON public.username_history FOR SELECT
  USING (true);


-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running this, add these to your .env file:
--   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...
-- (Find these in: Supabase project → Settings → API)
