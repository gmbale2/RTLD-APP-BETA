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


-- ── Done ─────────────────────────────────────────────────────────────────────
-- After running this, add these to your .env file:
--   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
--   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...
-- (Find these in: Supabase project → Settings → API)
