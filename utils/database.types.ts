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
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string;
          email: string | null;
          email_consent: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name: string;
          email?: string | null;
          email_consent?: boolean;
          created_at?: string;
        };
        Update: Partial<Omit<Database["public"]["Tables"]["profiles"]["Insert"], "id">>;
      };
      user_push_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          platform: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          token: string;
          platform?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_push_tokens"]["Insert"]>;
      };
      cms_config: {
        Row: {
          id: string;
          spin_threshold: number;
          prize_enabled: boolean;
          wheel_segments: unknown;
          period_start: string | null;
          period_end: string | null;
          prize_title: string | null;
          prize_description: string | null;
          prize_value: string | null;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["cms_config"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["cms_config"]["Row"]>;
      };
    };
    Views: {
      leaderboard: {
        Row: LeaderboardEntry;
      };
      period_leaderboard: {
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
  user_id: string;
}
