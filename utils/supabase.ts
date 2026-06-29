/**
 * supabase.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Supabase client singleton.
 *
 * SETUP (one-time):
 *   1. Create a free project at https://supabase.com
 *   2. Go to Project Settings → API
 *   3. Copy "Project URL" and "anon public" key
 *   4. Create a .env file in the project root with:
 *        EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
 *        EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJh...
 *   5. Run the SQL in supabase/schema.sql in the Supabase SQL editor
 *   6. Restart the dev server
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const SUPABASE_URL       = process.env.EXPO_PUBLIC_SUPABASE_URL       ?? "";
const SUPABASE_ANON_KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY  ?? "";

export const isSupabaseConfigured =
  SUPABASE_URL.startsWith("https://") && SUPABASE_ANON_KEY.length > 10;

export const supabase = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;
