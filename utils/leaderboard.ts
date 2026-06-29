/**
 * leaderboard.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Submit a score and fetch the top-20 leaderboard from Supabase.
 *
 * Falls back to simulated data when Supabase is not yet configured so the
 * leaderboard screen always renders correctly during development / demo.
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import type { LeaderboardEntry } from "./database.types";
import { getUser } from "./userStorage";

// ── Mock data (used when Supabase is not configured) ─────────────────────────

const MOCK_NAMES = [
  ["tarman_666",   "Tarman"],
  ["burt_h",       "Burt H."],
  ["frank_z",      "Frank Z."],
  ["spider_punk",  "Spider"],
  ["deadhead88",   "Deadhead"],
  ["casey_rules",  "Casey"],
  ["trash_king",   "Trash King"],
  ["ernie_k",      "Ernie K."],
  ["meatpie_96",   "Meatpie"],
  ["brainz4ever",  "Brainz4Ever"],
  ["chuck_norns",  "Chuck N."],
  ["zombie_zara",  "Zombie Zara"],
  ["punk_not_ded", "Punk Not Dead"],
  ["rigor_mortis", "Rigor M."],
  ["eat_deadz",    "Eat Deadz"],
  ["tombstone_t",  "Tombstone T"],
  ["grave_grrl",   "Grave Grrl"],
  ["colonel_kal",  "Colonel K."],
  ["nite_of_ded",  "Nite of Dead"],
  ["doc_tongue",   "Doc Tongue"],
];

function buildMockLeaderboard(playerScore: number, playerUsername: string, playerName: string): LeaderboardEntry[] {
  const scores = [
    142600, 118400, 97200, 81500, 74300,
    63800,  58100,  51400, 46700, 41200,
    37600,  33900,  29400, 25800, 22300,
    19600,  16900,  14200, 11800, 9400,
  ];

  const board: LeaderboardEntry[] = scores.map((s, i) => ({
    rank: i + 1,
    username: MOCK_NAMES[i][0],
    display_name: MOCK_NAMES[i][1],
    best_score: s,
    best_level: Math.max(1, Math.floor(s / 12000)),
    games_played: Math.floor(Math.random() * 80) + 10,
  }));

  // Insert the real player at the correct rank if they have a score
  if (playerScore > 0) {
    const insertAt = board.findIndex((e) => playerScore >= e.best_score);
    const playerEntry: LeaderboardEntry = {
      rank: insertAt === -1 ? board.length + 1 : insertAt + 1,
      username: playerUsername,
      display_name: playerName,
      best_score: playerScore,
      best_level: 1,
      games_played: 1,
    };
    if (insertAt !== -1) {
      board.splice(insertAt, 0, playerEntry);
      board.splice(20); // keep top 20
      board.forEach((e, i) => (e.rank = i + 1));
    }
  }

  return board.slice(0, 20);
}

// ── Real Supabase implementation ──────────────────────────────────────────────

/**
 * Submit the player's score for the current game session.
 * Safe to call even if Supabase is not configured (no-op).
 */
export async function submitScore(score: number, level: number): Promise<void> {
  if (!supabase || !isSupabaseConfigured) return;

  const user = await getUser();
  if (!user) return;

  const { error } = await supabase.from("scores").insert({
    user_id:      user.id,
    username:     user.username,
    display_name: user.name,
    score,
    level,
  });

  if (error) console.warn("[leaderboard] submitScore error:", error.message);
}

export interface LeaderboardResult {
  entries: LeaderboardEntry[];
  playerRank: number | null;
  isMock: boolean;
}

/**
 * Fetch the top-20 leaderboard and the current player's global rank.
 * Falls back to mock data when Supabase is not configured.
 */
export async function fetchLeaderboard(
  playerScore: number,
): Promise<LeaderboardResult> {
  const user = await getUser();

  // ── Mock fallback ────────────────────────────────────────────────────────
  if (!supabase || !isSupabaseConfigured) {
    const entries = buildMockLeaderboard(
      playerScore,
      user?.username ?? "you",
      user?.name ?? "You",
    );
    const playerRank =
      entries.find((e) => e.username === (user?.username ?? "you"))?.rank ?? null;
    return { entries, playerRank, isMock: true };
  }

  // ── Live Supabase ────────────────────────────────────────────────────────
  const { data: top20, error: boardErr } = await supabase
    .from("leaderboard")
    .select("*")
    .order("rank", { ascending: true })
    .limit(20);

  if (boardErr) {
    console.warn("[leaderboard] fetch error:", boardErr.message);
    // Fall back to mock on error
    const entries = buildMockLeaderboard(
      playerScore,
      user?.username ?? "you",
      user?.name ?? "You",
    );
    return { entries, playerRank: null, isMock: true };
  }

  // Fetch player's actual global rank (their best score may be from a prior game)
  let playerRank: number | null = null;
  if (user) {
    const { data: rankRow } = await supabase
      .from("leaderboard")
      .select("rank")
      .eq("username", user.username)
      .single();
    playerRank = rankRow?.rank ?? null;
  }

  return {
    entries: (top20 ?? []) as LeaderboardEntry[],
    playerRank,
    isMock: false,
  };
}
