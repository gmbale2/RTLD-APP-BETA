/**
 * wheelState.ts — Shared spin-wheel result state
 * ─────────────────────────────────────────────────────────────────────────────
 * Module-level singleton used to pass prize data from spinwheel.tsx back to
 * the game screen (index.tsx) on focus return — no prop drilling needed.
 *
 * Phase 2: replace with a Supabase "spin_results" table or Zustand store.
 */

export type WheelPrize = {
  type: "discount" | "double" | "merch" | "points" | "none";
  label: string;
  code?: string;
  value?: string;
  storeUrl?: string;
};

// ── Module-level state (singleton per app session) ────────────────────────────

let _pendingPrize: WheelPrize | null = null;
let _doubleActive = false;

/** Called from spinwheel.tsx after the wheel lands on a prize. */
export function setPendingPrize(prize: WheelPrize): void {
  _pendingPrize = prize;
  _doubleActive = prize.type === "double";
}

/**
 * Read and clear the pending prize.
 * Call once from index.tsx's useFocusEffect on return from spin screen.
 */
export function consumePendingPrize(): WheelPrize | null {
  const p = _pendingPrize;
  _pendingPrize = null;
  return p;
}

export function isDoubleActive(): boolean {
  return _doubleActive;
}

/** Reset double flag — call at the start of a new game. */
export function clearDoubleActive(): void {
  _doubleActive = false;
}
