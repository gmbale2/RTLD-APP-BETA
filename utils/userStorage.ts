/**
 * userStorage.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Local user-profile persistence using AsyncStorage.
 *
 * TODO (Phase 2): Replace AsyncStorage reads/writes with Supabase calls:
 *   - saveUser()      → supabase.from('users').insert(profile)
 *   - getUser()       → supabase.auth.getUser() + profile fetch
 *   - clearUser()     → supabase.auth.signOut()
 *
 * The UserProfile shape is intentionally designed to match the future
 * Supabase `users` table schema so the migration is a drop-in replacement.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const USER_KEY = "@more_brains:user_profile";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UserProfile {
  /** Local UUID — will map to Supabase auth.users.id in Phase 2 */
  id: string;
  name: string;
  /** Unique handle shown on the leaderboard (lowercase, no spaces) */
  username: string;
  email: string;
  createdAt: string;

  // Future leaderboard fields (populated by Supabase in Phase 2):
  // highScore: number;
  // gamesPlayed: number;
  // globalRank: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateLocalId(): string {
  // Simple UUID v4 substitute — will be replaced by Supabase auth UID
  return "local-" + Math.random().toString(36).slice(2, 10) + "-" + Date.now();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Save a new user profile to local storage.
 * Phase 2: also POST to Supabase here.
 */
export async function saveUser(
  data: Pick<UserProfile, "name" | "username" | "email">
): Promise<UserProfile> {
  const profile: UserProfile = {
    id: generateLocalId(),
    name: data.name.trim(),
    username: data.username.trim().toLowerCase(),
    email: data.email.trim().toLowerCase(),
    createdAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(profile));
  return profile;
}

/**
 * Retrieve the stored user profile, or null if first launch.
 */
export async function getUser(): Promise<UserProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch {
    return null;
  }
}

/**
 * Clear the user profile (logout / reset).
 */
export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(USER_KEY);
}
