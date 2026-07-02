import { supabase, isSupabaseConfigured } from "./supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
export type SegmentType = "discount" | "multiplier" | "addup" | "shopify" | "out_of_luck";

export interface WheelSegment {
  id:            string;
  position:      number;
  label:         string;
  lines:         string[];     // derived from label: first word / rest
  type:          SegmentType;
  odds:          number;       // percentage (e.g. 10 = 10%)
  probability:   number;       // derived: odds / 100
  discount_pct:  number | null;
  discount_code: string | null;
  score_value:   number | null; // multiplier: the multiplier (2 = ×2); addup: points added
  shopify_url:   string | null;
  result_title:  string | null; // custom green title on result card (overrides generated)
  result_desc:   string | null; // custom subtitle on result card (overrides generated)
}

export interface CmsConfig {
  spin_threshold: number;
  prize_enabled:  boolean;
  wheel_segments: WheelSegment[];
}

export interface ActivePrize {
  id:           string;
  title:        string;
  description:  string;
  period_start: string;
  period_end:   string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function labelToLines(label: string): string[] {
  const u = label.toUpperCase().trim();
  const idx = u.indexOf(" ");
  if (idx === -1) return [u];
  return [u.slice(0, idx), u.slice(idx + 1)];
}

// ── Static defaults (used when Supabase is unreachable) ───────────────────────
export const DEFAULT_SPIN_THRESHOLD = 10_000;

export const DEFAULT_WHEEL_SEGMENTS: WheelSegment[] = [
  { id: "1", position: 1, label: "DOUBLE POINTS", lines: ["DOUBLE",  "POINTS"],   type: "multiplier",  odds: 10, probability: 0.10, discount_pct: null, discount_code: null,     score_value: 2,    shopify_url: null, result_title: null, result_desc: null },
  { id: "2", position: 2, label: "20% OFF CODE",  lines: ["20%",     "OFF CODE"], type: "discount",    odds: 12, probability: 0.12, discount_pct: 20,   discount_code: "RTLD20", score_value: null, shopify_url: null, result_title: null, result_desc: null },
  { id: "3", position: 3, label: "MERCH GIFT",    lines: ["MERCH",   "GIFT"],      type: "shopify",     odds:  8, probability: 0.08, discount_pct: null, discount_code: null,     score_value: null, shopify_url: "https://returnofthelivingdead.com/collections/all-products-1", result_title: null, result_desc: null },
  { id: "4", position: 4, label: "30% OFF CODE",  lines: ["30%",     "OFF CODE"], type: "discount",    odds:  8, probability: 0.08, discount_pct: 30,   discount_code: "RTLD30", score_value: null, shopify_url: null, result_title: null, result_desc: null },
  { id: "5", position: 5, label: "15% OFF CODE",  lines: ["15%",     "OFF CODE"], type: "discount",    odds: 16, probability: 0.16, discount_pct: 15,   discount_code: "RTLD15", score_value: null, shopify_url: null, result_title: null, result_desc: null },
  { id: "6", position: 6, label: "+1,000 POINTS", lines: ["+1,000",  "POINTS"],   type: "addup",       odds: 20, probability: 0.20, discount_pct: null, discount_code: null,     score_value: 1000, shopify_url: null, result_title: null, result_desc: null },
  { id: "7", position: 7, label: "NO LUCK",       lines: ["NO",      "LUCK"],     type: "out_of_luck", odds: 16, probability: 0.16, discount_pct: null, discount_code: null,     score_value: null, shopify_url: null, result_title: null, result_desc: null },
  { id: "8", position: 8, label: "10% OFF CODE",  lines: ["10%",     "OFF CODE"], type: "discount",    odds: 10, probability: 0.10, discount_pct: 10,   discount_code: "RTLD10", score_value: null, shopify_url: null, result_title: null, result_desc: null },
];

const DEFAULTS: CmsConfig = {
  spin_threshold: DEFAULT_SPIN_THRESHOLD,
  prize_enabled:  true,
  wheel_segments: DEFAULT_WHEEL_SEGMENTS,
};

// ── Wheel segments fetch (new normalized table) ───────────────────────────────
export async function fetchWheelSegments(): Promise<WheelSegment[]> {
  if (!isSupabaseConfigured || !supabase) return DEFAULT_WHEEL_SEGMENTS;

  try {
    const { data, error } = await supabase
      .from("wheel_segments")
      .select("*")
      .eq("enabled", true)
      .gt("odds", 0)
      .order("position");

    if (error || !data || data.length === 0) return DEFAULT_WHEEL_SEGMENTS;

    const totalOdds = data.reduce((sum, row) => sum + Number(row.odds), 0) || 100;

    return data.map((row) => ({
      id:            String(row.position),
      position:      row.position,
      label:         row.label,
      lines:         labelToLines(row.label),
      type:          row.type as SegmentType,
      odds:          Number(row.odds),
      probability:   Number(row.odds) / totalOdds,
      discount_pct:  row.discount_pct   ?? null,
      discount_code: row.discount_code  ?? null,
      score_value:   row.score_value    ?? null,
      shopify_url:   row.shopify_url    ?? null,
      result_title:  row.result_title   ?? null,
      result_desc:   row.result_desc    ?? null,
    }));
  } catch {
    return DEFAULT_WHEEL_SEGMENTS;
  }
}

// ── Module-level cache (60 s TTL) ────────────────────────────────────────────
let _cached: CmsConfig | null = null;
let _cachedAt = 0;
const CACHE_TTL = 60_000;

export async function fetchCmsConfig(): Promise<CmsConfig> {
  if (_cached && Date.now() - _cachedAt < CACHE_TTL) return _cached;

  if (!isSupabaseConfigured || !supabase) {
    _cached = DEFAULTS;
    return DEFAULTS;
  }

  try {
    const [cmsMaybe, segments] = await Promise.all([
      supabase
        .from("cms_config")
        .select("spin_threshold, prize_enabled")
        .limit(1)
        .maybeSingle(),
      fetchWheelSegments(),
    ]);

    const cms = cmsMaybe.data;
    _cached = {
      spin_threshold: cms?.spin_threshold ?? DEFAULTS.spin_threshold,
      prize_enabled:  cms?.prize_enabled  ?? DEFAULTS.prize_enabled,
      wheel_segments: segments,
    };
    _cachedAt = Date.now();
    return _cached;
  } catch {
    _cached = DEFAULTS;
    return DEFAULTS;
  }
}

export function getCmsConfig(): CmsConfig {
  return _cached ?? DEFAULTS;
}

// ── Active prize ──────────────────────────────────────────────────────────────
export async function fetchActivePrize(): Promise<ActivePrize | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("prizes")
      .select("id, title, description, period_start, period_end")
      .eq("enabled", true)
      .lte("period_start", now)
      .gt("period_end", now)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      id:           data.id,
      title:        data.title,
      description:  data.description,
      period_start: data.period_start,
      period_end:   data.period_end,
    };
  } catch {
    return null;
  }
}

// Back-compat named exports
export const SPIN_THRESHOLD = DEFAULT_SPIN_THRESHOLD;
export const WHEEL_CONFIG   = DEFAULT_WHEEL_SEGMENTS;
