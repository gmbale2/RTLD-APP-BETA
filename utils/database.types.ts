/**
 * database.types.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * TypeScript types mirroring the Supabase schema.
 * Run `npx supabase gen types typescript` to regenerate from a live project.
 */

export type Database = {
  public: {
    Tables: {
      scores: {
        Row: {
          id: string;
          user_id: string;
          username: string;
          display_name: string;
          score: number;
          level: number;
          played_at: string;
        };
        Insert: {
          user_id: string;
          username: string;
          display_name: string;
          score: number;
          level: number;
          played_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["scores"]["Insert"]>;
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardEntry;
      };
    };
  };
};

export interface LeaderboardEntry {
  rank: number;
  username: string;
  display_name: string;
  best_score: number;
  best_level: number;
  games_played: number;
}
