import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const PROFILE_KEY = "@more_brains:user_profile";

export interface UserProfile {
  id: string;            // auth.uid() UUID from Supabase anonymous auth
  name: string;          // private real name
  username: string;      // public handle shown on leaderboard
  email: string;
  emailConsent: boolean;
  createdAt: string;
  previousUsernames: string[];  // history of handles used before the current one
}

// ── Anonymous auth session ─────────────────────────────────────────────────────
// Creates a Supabase anonymous auth user on first call; subsequent calls return
// the persisted session. The UUID becomes the player's permanent identity.
export async function ensureSession(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.warn("[auth] signInAnonymously failed:", error?.message);
    return null;
  }
  return data.user.id;
}

// ── Save user (called from /register on first registration) ───────────────────
export async function saveUser(
  data: Pick<UserProfile, "name" | "username" | "email" | "emailConsent">
): Promise<UserProfile> {
  // Make sure we have a real Supabase auth session first
  const authId = await ensureSession();

  const profile: UserProfile = {
    id:                authId ?? `local-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`,
    name:              data.name.trim(),
    username:          data.username.trim().toLowerCase(),
    email:             data.email.trim().toLowerCase(),
    emailConsent:      data.emailConsent,
    createdAt:         new Date().toISOString(),
    previousUsernames: [],
  };

  // Cache locally for instant reads throughout the session
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));

  // Persist to Supabase profiles table (authoritative source)
  if (supabase && authId) {
    const { error } = await supabase.from("profiles").upsert({
      id:            authId,
      username:      profile.username,
      display_name:  profile.name,
      email:         profile.email,
      email_consent: profile.emailConsent,
    });
    if (error) console.warn("[auth] profiles upsert:", error.message);
  }

  return profile;
}

// ── Get current user ───────────────────────────────────────────────────────────
export async function getUser(): Promise<UserProfile | null> {
  // Fast path: local cache (avoids network round-trip on every game start)
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw) {
      const cached = JSON.parse(raw) as UserProfile;
      // If this is an old pre-Supabase "local-XXX" id, clear it so the player
      // goes through registration again and gets a real auth session.
      if (cached.id?.startsWith("local-")) {
        await AsyncStorage.removeItem(PROFILE_KEY);
        return null;
      }
      return cached;
    }
  } catch {}

  // Slow path: recover from an existing Supabase session (e.g. after cache clear)
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, email, email_consent, created_at")
    .eq("id", session.user.id)
    .single();

  if (!profile) return null;

  const user: UserProfile = {
    id:                profile.id,
    name:              profile.display_name,
    username:          profile.username,
    email:             profile.email ?? "",
    emailConsent:      profile.email_consent,
    createdAt:         profile.created_at,
    previousUsernames: [],
  };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(user));
  return user;
}

// ── Change username ────────────────────────────────────────────────────────────
// Records old username in local cache history, updates Supabase profiles table,
// and appends to username_history for cross-device audit trail.
export async function updateUsername(newUsername: string): Promise<UserProfile> {
  const profile = await getUser();
  if (!profile) throw new Error("No user found");

  const prev = [...(profile.previousUsernames ?? [])];
  if (!prev.includes(profile.username)) prev.push(profile.username);

  const updated: UserProfile = { ...profile, username: newUsername, previousUsernames: prev };
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));

  if (supabase && !profile.id.startsWith("local-")) {
    // Update authoritative username in profiles
    supabase
      .from("profiles")
      .update({ username: newUsername })
      .eq("id", profile.id)
      .then(({ error }) => { if (error) console.warn("[userStorage] username update:", error.message); });

    // Log history
    supabase
      .from("username_history" as any)
      .insert({ user_id: profile.id, old_username: profile.username })
      .then(({ error }: { error: any }) => { if (error) console.warn("[userStorage] username_history:", error.message); });
  }

  return updated;
}

// ── Sign out / full reset ──────────────────────────────────────────────────────
export async function clearUser(): Promise<void> {
  await AsyncStorage.removeItem(PROFILE_KEY);
  if (supabase) await supabase.auth.signOut();
}
