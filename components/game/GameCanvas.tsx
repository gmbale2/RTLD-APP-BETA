import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Circle, G, Image as SvgImage, Ellipse, Text as SvgText } from "react-native-svg";

import { GameState } from "./GameEngine";

interface Props {
  state: GameState;
  size: number;
}

const BG_COLOR     = "#05000f";
const PATH_COLOR   = "#000000";
const BORDER_COLOR = "#ffffff";

// ─── Sprite assets ───────────────────────────────────────────────────────────
const SPR_TARMAN        = require("../../assets/sprites/tarman.png");
const SPR_PUNK_GREEN    = require("../../assets/sprites/punk_green.png");
const SPR_PUNK_BLUE     = require("../../assets/sprites/punk_blue.png");
const SPR_PUNK_SCARED   = require("../../assets/sprites/punk_scared.png");
const SPR_PUNK_ORANGE_L      = require("../../assets/sprites/punk_orange_l.png");
const SPR_PUNK_ORANGE_R      = require("../../assets/sprites/punk_orange_r.png");
const SPR_PUNK_BLUE2_L       = require("../../assets/sprites/punk_blue2_l.png");
const SPR_PUNK_BLUE2_R       = require("../../assets/sprites/punk_blue2_r.png");
const SPR_PUNK_GREEN2_L      = require("../../assets/sprites/punk_green2_l.png");
const SPR_PUNK_GREEN2_R      = require("../../assets/sprites/punk_green2_r.png");
const SPR_PUNK_ZOMBIE_L      = require("../../assets/sprites/punk_zombie_l.png");
const SPR_PUNK_ZOMBIE_R      = require("../../assets/sprites/punk_zombie_r.png");
const SPR_PUNK_SKULL_GREEN_L = require("../../assets/sprites/punk_skull_green_l.png");
const SPR_PUNK_SKULL_GREEN_R = require("../../assets/sprites/punk_skull_green_r.png");
const SPR_PUNK_GIRL_GREEN_L  = require("../../assets/sprites/punk_girl_green_l.png");
const SPR_PUNK_GIRL_GREEN_R  = require("../../assets/sprites/punk_girl_green_r.png");
const SPR_PUNK_DOG_ZOMBIE_L  = require("../../assets/sprites/punk_dog_zombie_l.png");
const SPR_PUNK_DOG_ZOMBIE_R  = require("../../assets/sprites/punk_dog_zombie_r.png");
const SPR_PUNK_GHOST_RED_L   = require("../../assets/sprites/punk_ghost_red_l.png");
const SPR_PUNK_GHOST_RED_R   = require("../../assets/sprites/punk_ghost_red_r.png");
const SPR_BRAIN         = require("../../assets/sprites/brain.png");
const SPR_TRIOXIN       = require("../../assets/sprites/trioxin.png");
const SPR_FLOOR         = require("../../assets/sprites/floor_dark.png");

// ─── Punk skin sets — changes every level, 10 unique sets before cycling ──────
// Each set: [slot-0 = green punk, slot-1 = blue punk, slot-2 = orange punk]
// useFlip=true  → single image + CSS mirror for east-facing (original sprites)
// useFlip=false → explicit _l/_r sources; NOTE: designer convention is reversed:
//                 _r.png faces LEFT (use as leftSrc), _l.png faces RIGHT (use as rightSrc)
type PunkSkin = { leftSrc: any; rightSrc: any; useFlip: boolean };

// ── Shorthand skin entries for all 10 characters ─────────────────────────────
// A–B: original sprites (CSS flip)    C–J: directional sprites (explicit L/R)
const skA = { leftSrc: SPR_PUNK_GREEN,        rightSrc: SPR_PUNK_GREEN,        useFlip: true  };
const skB = { leftSrc: SPR_PUNK_BLUE,         rightSrc: SPR_PUNK_BLUE,         useFlip: true  };
const skC = { leftSrc: SPR_PUNK_ORANGE_R,     rightSrc: SPR_PUNK_ORANGE_L,     useFlip: false }; // orange
const skD = { leftSrc: SPR_PUNK_BLUE2_R,      rightSrc: SPR_PUNK_BLUE2_L,      useFlip: false }; // blue mohawk v2
const skE = { leftSrc: SPR_PUNK_GREEN2_R,     rightSrc: SPR_PUNK_GREEN2_L,     useFlip: false }; // green mohawk v2
const skF = { leftSrc: SPR_PUNK_ZOMBIE_R,     rightSrc: SPR_PUNK_ZOMBIE_L,     useFlip: false }; // skeleton zombie
const skG = { leftSrc: SPR_PUNK_SKULL_GREEN_R, rightSrc: SPR_PUNK_SKULL_GREEN_L, useFlip: false }; // green skull
const skH = { leftSrc: SPR_PUNK_GIRL_GREEN_R, rightSrc: SPR_PUNK_GIRL_GREEN_L, useFlip: false }; // zombie girl
const skI = { leftSrc: SPR_PUNK_DOG_ZOMBIE_R, rightSrc: SPR_PUNK_DOG_ZOMBIE_L, useFlip: false }; // zombie dog
const skJ = { leftSrc: SPR_PUNK_GHOST_RED_R,  rightSrc: SPR_PUNK_GHOST_RED_L,  useFlip: false }; // red ghost

// ── 10 sets, every level — blue2/green2 held until the very end ──────────────
// Sets 0-7 use only A,B,C,F,G,H,I,J (no blue2/green2).
// Sets 8-9 introduce D(blue2) and E(green2) right before the cycle resets.
// No character ever appears in two back-to-back sets (wrap-around verified too).
const SKIN_SETS: PunkSkin[][] = [
  [skA, skB, skC],  // L1  : green(orig) · blue(orig) · orange
  [skF, skG, skH],  // L2  : zombie · skull · girl
  [skI, skJ, skB],  // L3  : dog · ghost-red · blue(orig)
  [skA, skC, skH],  // L4  : green(orig) · orange · girl
  [skF, skI, skJ],  // L5  : zombie · dog · ghost-red
  [skA, skB, skG],  // L6  : green(orig) · blue(orig) · skull
  [skC, skF, skJ],  // L7  : orange · zombie · ghost-red
  [skG, skH, skI],  // L8  : skull · girl · dog
  [skD, skJ, skC],  // L9  : blue2 ← first appearance · ghost-red · orange
  [skE, skF, skI],  // L10 : green2 ← first appearance · zombie · dog → cycles
];

/** Map punk color string → skin slot index (0=green, 1=blue, 2=orange/other) */
function punkSlotIndex(color: string): number {
  if (color === "#00ff88") return 0;
  if (color === "#00d4ff") return 1;
  return 2;
}
// Wall tile variants — 20 stone/ivy tiles from design-10 pack
const WALL_TILES = [
  require("../../assets/sprites/wall_53.png"),  // 0  light mossy stone
  require("../../assets/sprites/wall_54.png"),  // 1  dense ivy
  require("../../assets/sprites/wall_55.png"),  // 2  horizontal vine
  require("../../assets/sprites/wall_56.png"),  // 3  dark moss top
  require("../../assets/sprites/wall_57.png"),  // 4  light rounded rocks
  require("../../assets/sprites/wall_58.png"),  // 5  light mossy stone B
  require("../../assets/sprites/wall_59.png"),  // 6  cracked stone w/ ivy
  require("../../assets/sprites/wall_60.png"),  // 7  mixed stones
  require("../../assets/sprites/wall_61.png"),  // 8  mixed stones B
  require("../../assets/sprites/wall_62.png"),  // 9  stone w/ leaf
  require("../../assets/sprites/wall_63.png"),  // 10 plain light stone
  require("../../assets/sprites/wall_64.png"),  // 11 diagonal vine
  require("../../assets/sprites/wall_65.png"),  // 12 dense dark ivy
  require("../../assets/sprites/wall_66.png"),  // 13 curve vine top→right
  require("../../assets/sprites/wall_67.png"),  // 14 stone w/ ivy cluster
  require("../../assets/sprites/wall_68.png"),  // 15 vertical vine left
  require("../../assets/sprites/wall_69.png"),  // 16 dark stone ivy top
  require("../../assets/sprites/wall_70.png"),  // 17 dark cobble diagonal vine
  require("../../assets/sprites/wall_71.png"),  // 18 dark cobblestone
  require("../../assets/sprites/wall_72.png"),  // 19 very dark cobblestone
] as const;

// ─── Large tomb sprites — 2 cols × 3 rows each ───────────────────────────────
// Left tomb "Tar Man"  → rows 13–15, cols 2–3
const TOMB_LEFT_TILES = [
  require("../../assets/sprites/tomb_left_r0c0.png"),
  require("../../assets/sprites/tomb_left_r0c1.png"),
  require("../../assets/sprites/tomb_left_r1c0.png"),
  require("../../assets/sprites/tomb_left_r1c1.png"),
  require("../../assets/sprites/tomb_left_r2c0.png"),
  require("../../assets/sprites/tomb_left_r2c1.png"),
] as const;

// Right tomb "Send More Paramedics" → rows 13–15, cols 16–17
const TOMB_RIGHT_TILES = [
  require("../../assets/sprites/tomb_right_r0c0.png"),
  require("../../assets/sprites/tomb_right_r0c1.png"),
  require("../../assets/sprites/tomb_right_r1c0.png"),
  require("../../assets/sprites/tomb_right_r1c1.png"),
  require("../../assets/sprites/tomb_right_r2c0.png"),
  require("../../assets/sprites/tomb_right_r2c1.png"),
] as const;

function largeTombIdx(r: number, c: number, colBase: number): number {
  return (r - 13) * 2 + (c - colBase);
}

// ─── Angel statue — 2 cols × 4 rows, rows 2–5 cols 2–3 (left) and cols 16–17 (right) ──
const ANGEL_STATUE = require("../../assets/sprites/angel_statue_full.png");

function isAngelStatueCell(r: number, c: number): boolean {
  return (r >= 2 && r <= 5) && (c === 2 || c === 3 || c === 16 || c === 17);
}

function angelStatueOriginX(c: number): number {
  return c <= 3 ? 2 : 16;
}

// ─── Celtic cross statue — 2 cols × 2 rows, placed at 4 positions ────────────
// Top: rows 2–3 cols 5–6 (left) and cols 13–14 (right)  — all wall tiles
// Bottom: rows 7–8 cols 1–2 (left) and cols 17–18 (right) — all wall tiles
const CROSS_TILES = [
  require("../../assets/sprites/cross_r0c0.png"),
  require("../../assets/sprites/cross_r0c1.png"),
  require("../../assets/sprites/cross_r1c0.png"),
  require("../../assets/sprites/cross_r1c1.png"),
] as const;

function isCrossCell(r: number, c: number): boolean {
  return (
    (r >= 2 && r <= 3 && (c === 5 || c === 6)) ||
    (r >= 2 && r <= 3 && (c === 13 || c === 14)) ||
    (r >= 7 && r <= 8 && (c === 1 || c === 2)) ||
    (r >= 7 && r <= 8 && (c === 17 || c === 18))
  );
}

function crossTileIdx(r: number, c: number): number {
  let localRow: number;
  let localCol: number;
  if (r === 2 || r === 3) {
    localRow = r - 2;
    localCol = (c === 5 || c === 13) ? 0 : 1;
  } else {
    localRow = r - 7;
    localCol = (c === 1 || c === 17) ? 0 : 1;
  }
  return localRow * 2 + localCol;
}

// ─── Ghost house fixed tilemap — 4 cols × 3 rows, row-major order ─────────────
const GHOST_HOUSE_TILES = [
  require("../../assets/sprites/gh_00.png"), // (8,8)
  require("../../assets/sprites/gh_01.png"), // (8,9)
  require("../../assets/sprites/gh_02.png"), // (8,10)
  require("../../assets/sprites/gh_03.png"), // (8,11)
  require("../../assets/sprites/gh_10.png"), // (9,8)
  require("../../assets/sprites/gh_11.png"), // (9,9)
  require("../../assets/sprites/gh_12.png"), // (9,10)
  require("../../assets/sprites/gh_13.png"), // (9,11)
  require("../../assets/sprites/gh_20.png"), // (10,8)
  require("../../assets/sprites/gh_21.png"), // (10,9)
  require("../../assets/sprites/gh_22.png"), // (10,10)
  require("../../assets/sprites/gh_23.png"), // (10,11)
] as const;

function isGhostHouseCell(r: number, c: number): boolean {
  return r >= 8 && r <= 10 && c >= 8 && c <= 11;
}

// ─── Cemetery decoration sprites (6 approved) + flower wreaths ───────────────
const WALL_DECO_SPRITES = [
  require("../../assets/sprites/deco_rip.png"),
  require("../../assets/sprites/deco_cross_moss.png"),
  require("../../assets/sprites/deco_cross_silver.png"),
  require("../../assets/sprites/deco_cross_plain.png"),
  require("../../assets/sprites/deco_rip_tall.png"),
  require("../../assets/sprites/deco_rip_sarcophagus.png"),
  // Flowers & wreaths
  require("../../assets/sprites/flower_01.png"),
  require("../../assets/sprites/flower_05.png"),
  require("../../assets/sprites/flower_09.png"),
  require("../../assets/sprites/flower_13.png"),
  require("../../assets/sprites/flower_17.png"),
] as const;


/** Explicit per-cell overrides: key = "col-row", value = WALL_TILES index */
const WALL_OVERRIDES: Record<string, number> = {
  // ── interior accents ──
  "0-10": 18, "1-10": 18, "1-11": 18, "2-10": 18,
  "2-11": 16, "17-11": 17,
  "8-2": 6, "8-17": 0, "12-17": 0,
  "4-17": 6, "16-17": 14,
  "5-6": 6, "14-6": 6, "15-11": 6, "10-3": 6,
  "4-11": 11, "14-5": 11,

  // ── top border (row 0) ──
  "0-0": 18, "1-0":  2, "2-0":  3, "3-0": 16,
  "4-0": 18, "5-0":  2, "6-0":  3, "7-0": 16,
  "8-0": 18, "9-0":  2, "10-0": 3, "11-0": 16,
  "12-0": 18, "13-0": 2, "14-0": 3, "15-0": 16,
  "16-0": 18, "17-0": 2, "18-0": 3, "19-0": 16,

  // ── right border (col 19) ──
  "19-1": 16, "19-2": 18, "19-3":  2, "19-4":  3,
  "19-5": 16, "19-6": 18, "19-7":  2, "19-8":  3,
  "19-9": 16, "19-10": 18, "19-11": 2, "19-12": 3,
  "19-13": 16, "19-14": 18, "19-15": 2, "19-16": 3,
  "19-17": 16, "19-18": 18, "19-19": 16,

  // ── left border (col 0) ──
  "0-1":  2, "0-2": 18, "0-3":  2, "0-4":  3,
  "0-5": 16, "0-6": 18, "0-7":  2, "0-8":  3,
  "0-9": 16,             "0-11": 2, "0-12": 3,
  "0-13": 16, "0-14": 18, "0-15": 2, "0-16": 3,
  "0-17": 16, "0-18": 18,

  // ── bottom border (row 19) ──
  "0-19": 18, "1-19":  2, "2-19":  3, "3-19": 16,
  "4-19": 18, "5-19":  2, "6-19":  3, "7-19": 16,
  "8-19": 18, "9-19":  2, "10-19": 3, "11-19": 16,
  "12-19": 18, "13-19": 2, "14-19": 3, "15-19": 16,
  "16-19": 18, "17-19": 2, "18-19": 3,
};

/**
 * Context-aware wall tile picker — uses neighbor topology to create vine/plant
 * runs that cross multiple tiles, following the page-52 reference patterns.
 *
 * Index map matches WALL_TILES order (0=53 … 19=72).
 */
function wallVariant(r: number, c: number, maze: number[][]): number {
  const override = WALL_OVERRIDES[`${c}-${r}`];
  if (override !== undefined) return override;

  const seed = (((r * 0x9e3779b9) ^ (c * 0x6c62272e)) >>> 0);

  const left  = maze[r]?.[c - 1] === 1;
  const right = maze[r]?.[c + 1] === 1;
  const up    = maze[r - 1]?.[c] === 1;
  const down  = maze[r + 1]?.[c] === 1;
  const nbrs  = (left ? 1 : 0) + (right ? 1 : 0) + (up ? 1 : 0) + (down ? 1 : 0);

  // Outer perimeter → dark cobblestone with occasional vine
  if (r === 0 || r === 19 || c === 0 || c === 19) {
    return [18, 19, 19, 18, 3, 17, 7, 8][seed % 8];
  }

  // Deep interior (3–4 wall neighbours) → plain stone, moss, dense ivy
  if (nbrs >= 3) {
    return [0, 0, 5, 5, 10, 1, 12, 3, 8, 7][seed % 10];
  }

  // Pure horizontal run (left or right wall, nothing above/below)
  // → horizontal vine so plants flow left-right across adjacent cells
  if ((left || right) && !up && !down) {
    return [2, 2, 2, 0, 5, 11, 14, 15][seed % 8];
  }

  // Pure vertical run (above or below wall, nothing left/right)
  // → vertical/falling vine so plants flow top-to-bottom
  if (!left && !right && (up || down)) {
    return [15, 15, 15, 13, 0, 5, 16, 68][seed % 7];
  }

  // Corner / L-shape (both H and V neighbours) → curve vines + accents
  if ((left || right) && (up || down)) {
    return [13, 13, 9, 6, 17, 11, 4, 14][seed % 8];
  }

  // Isolated or single-neighbour → varied lighter stone
  return [0, 5, 10, 14, 9, 6, 11, 16, 0, 5][seed % 10];
}

/** Returns true if this wall cell is deep inside a wall block (≥3 wall neighbours) */
function isInteriorWall(r: number, c: number, maze: number[][]): boolean {
  if (r <= 0 || r >= 19 || c <= 0 || c >= 19) return false;
  const nbrs =
    (maze[r - 1]?.[c] === 1 ? 1 : 0) +
    (maze[r + 1]?.[c] === 1 ? 1 : 0) +
    (maze[r]?.[c - 1] === 1 ? 1 : 0) +
    (maze[r]?.[c + 1] === 1 ? 1 : 0);
  return nbrs >= 3;
}

/** Outer-section tomb cells — rendered at normal size */
const TOMB_CELLS = new Set<string>([
  // Top-left cluster (flower positions)
  "2-5","2-6","3-5","3-6",
  // Top inner barrier pair
  "5-7","5-8","5-11","5-12",
  // Bottom left column pair
  "13-2","13-3","14-2","14-3","15-2","15-3",
  // Bottom center-left pair
  "13-7","13-8","15-7","15-8",
  // Bottom center-right pair
  "13-11","13-12","15-11","15-12",
  // Bottom right column pair
  "13-16","13-17","14-16","14-17","15-16","15-17",
]);

/** Cells that must show flower sprites only */
const FLOWER_CELLS = new Set<string>([
  // Top-left cluster
  "2-5","2-6","3-5","3-6",
]);

/**
 * Central ghost-house interior cells — rendered smaller.
 * Only deep-interior cells (no walkable neighbours).
 */
const CENTRAL_TOMB_CELLS = new Set<string>([
  "8-8","8-9","8-10","8-11",
  "9-8","9-9","9-10","9-11",
  "10-8","10-9","10-10","10-11",
]);

// Flower sprites occupy the last 5 slots of WALL_DECO_SPRITES
const FLOWER_SPRITE_START = WALL_DECO_SPRITES.length - 5; // indices 6–10
const TOMB_SPRITE_END     = FLOWER_SPRITE_START;          // indices 0–5

/**
 * Pre-compute sprite index for every tomb cell so that:
 * - FLOWER_CELLS always get a flower sprite (indices 23–27)
 * - All other cells get a tomb/monument sprite (indices 0–22)
 * - No two cells within Chebyshev radius 4 share the same sprite index.
 */
function buildTombSpriteMap(): Map<string, number> {
  const allKeys = [...TOMB_CELLS, ...CENTRAL_TOMB_CELLS];
  const allCells: [number, number][] = allKeys.map(k => {
    const [r, c] = k.split("-").map(Number);
    return [r, c];
  });
  allCells.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const assigned = new Map<string, number>();

  for (const [r, c] of allCells) {
    const key   = `${r}-${c}`;
    const isFlower = FLOWER_CELLS.has(key);
    const lo    = isFlower ? FLOWER_SPRITE_START : 0;
    const hi    = isFlower ? WALL_DECO_SPRITES.length : TOMB_SPRITE_END;

    // Collect indices already used within radius-4 neighbours (same pool only)
    const used = new Set<number>();
    for (const [nr, nc] of allCells) {
      const nk = `${nr}-${nc}`;
      if (assigned.has(nk) && Math.max(Math.abs(r - nr), Math.abs(c - nc)) <= 4) {
        const idx = assigned.get(nk)!;
        if (idx >= lo && idx < hi) used.add(idx);
      }
    }

    const available: number[] = [];
    for (let i = lo; i < hi; i++) if (!used.has(i)) available.push(i);
    const pool = available.length > 0 ? available : Array.from({length: hi - lo}, (_, i) => lo + i);
    let h = (r * 0x517cc1b7 + c * 0x27220a95) | 0;
    h = (h ^ (h >>> 16)) | 0;
    assigned.set(key, pool[Math.abs(h) % pool.length]);
  }
  return assigned;
}

const TOMB_SPRITE_MAP = buildTombSpriteMap();

/** Look up pre-computed no-repeat sprite index for a tomb cell */
function tombType(r: number, c: number): number {
  return TOMB_SPRITE_MAP.get(`${r}-${c}`) ?? 0;
}

function isTombCell(r: number, c: number): boolean {
  return TOMB_CELLS.has(`${r}-${c}`);
}

function isCentralTombCell(r: number, c: number): boolean {
  return CENTRAL_TOMB_CELLS.has(`${r}-${c}`);
}

// (punkSprite helper removed — skin selection now uses SKIN_SETS + punkSlotIndex)

// ─── Canvas ──────────────────────────────────────────────────────────────────
export const GameCanvas = memo(function GameCanvas({ state, size }: Props) {
  const { maze, player, punks, phase, powered, powerTimer, tileSize, fruit, level } = state;

  // Skin set changes every level — cycles through all 10 sets, then repeats
  const skinSetIdx = (level - 1) % SKIN_SETS.length;
  const ts = tileSize;
  const actualSize = ts * 20;
  const ox = Math.floor((size - actualSize) / 2);
  const oy = Math.floor((size - actualSize) / 2);

  // Character sprite sizes
  const skullW      = ts * 1.65;
  const skullH      = ts * 1.65;
  const punkW       = ts * 1.728;   // normal punk: +20%
  const punkH       = ts * 2.376;
  const punkWScared = ts * 1.872;   // paralysed/scared punk: +30%
  const punkHScared = ts * 2.574;

  // Collectible display sizes, centered in tile (overflows okay)
  const brainSz = ts * 1.71;   // previous 1.425 × 1.2
  const canSz   = ts * 2.16;   // previous 1.44 × 1.5

  // Power-up pulse: oscillates 0→1→0 roughly once per second (30 ticks)
  const pulse = powered ? Math.abs(Math.sin((powerTimer / 30) * Math.PI)) : 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* Background */}
        <Rect width={size} height={size} fill={BG_COLOR} />

        <G x={ox} y={oy}>

          {/* ── MAZE TILES ── */}
          {maze.map((row, ry) =>
            row.map((cell, cx) => {
              const tx = cx * ts;
              const ty = ry * ts;

              // Angel statues — rows 2–5, cols 2–3 (left) and cols 16–17 (right)
              if (isAngelStatueCell(ry, cx)) {
                return (
                  <G key={`w-${ry}-${cx}`}>
                    <SvgImage
                      x={angelStatueOriginX(cx) * ts} y={2 * ts}
                      width={ts * 2} height={ts * 4}
                      href={ANGEL_STATUE}
                      preserveAspectRatio="xMidYMid meet" />
                  </G>
                );
              }

              if (cell === 1) {
                // Left large tomb (rows 13–15, cols 2–3) — single merged image, no seams
                if (ry >= 13 && ry <= 15 && cx >= 2 && cx <= 3) {
                  return (
                    <G key={`w-${ry}-${cx}`}>
                      <SvgImage x={2 * ts} y={13 * ts} width={ts * 2} height={ts * 3}
                        href={require("../../assets/sprites/tomb_full.png")}
                        preserveAspectRatio="xMidYMid slice" />
                    </G>
                  );
                }
                // Right large tomb (rows 13–15, cols 16–17) — single merged image, no seams
                if (ry >= 13 && ry <= 15 && cx >= 16 && cx <= 17) {
                  return (
                    <G key={`w-${ry}-${cx}`}>
                      <SvgImage x={16 * ts} y={13 * ts} width={ts * 2} height={ts * 3}
                        href={require("../../assets/sprites/tomb_full.png")}
                        preserveAspectRatio="xMidYMid slice" />
                    </G>
                  );
                }
                // Celtic cross statues — wall-only positions
                if (isCrossCell(ry, cx)) {
                  return (
                    <G key={`w-${ry}-${cx}`}>
                      <SvgImage x={tx} y={ty} width={ts} height={ts}
                        href={CROSS_TILES[crossTileIdx(ry, cx)]}
                        preserveAspectRatio="xMidYMid slice" />
                    </G>
                  );
                }
                // Ghost house fixed tilemap — fills each cell exactly
                if (isGhostHouseCell(ry, cx)) {
                  const ghIdx = (ry - 8) * 4 + (cx - 8);
                  return (
                    <G key={`w-${ry}-${cx}`}>
                      <SvgImage
                        x={tx} y={ty} width={ts} height={ts}
                        href={GHOST_HOUSE_TILES[ghIdx]}
                        preserveAspectRatio="xMidYMid slice"
                      />
                    </G>
                  );
                }
                // Other central interior tomb cells
                if (isCentralTombCell(ry, cx)) {
                  const tombIdx = tombType(ry, cx);
                  const tombSz  = ts * 1.084;
                  return (
                    <G key={`w-${ry}-${cx}`}>
                      <Rect x={tx} y={ty} width={ts} height={ts} fill="#020008" />
                      <SvgImage
                        x={tx + (ts - tombSz) / 2}
                        y={ty + (ts - tombSz) / 2}
                        width={tombSz}
                        height={tombSz}
                        href={WALL_DECO_SPRITES[tombIdx]}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </G>
                  );
                }
                // Outer maze tombstone cells
                if (isTombCell(ry, cx)) {
                  const tombIdx = tombType(ry, cx);
                  const tombSz  = ts * 1.4;
                  return (
                    <G key={`w-${ry}-${cx}`}>
                      <Rect x={tx} y={ty} width={ts} height={ts} fill="#050010" />
                      <SvgImage
                        x={tx + (ts - tombSz) / 2}
                        y={ty + (ts - tombSz) / 2}
                        width={tombSz}
                        height={tombSz}
                        href={WALL_DECO_SPRITES[tombIdx]}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </G>
                  );
                }
                // All other wall cells → consistent stone tile
                return (
                  <G key={`w-${ry}-${cx}`}>
                    <SvgImage
                      x={tx} y={ty} width={ts} height={ts}
                      href={WALL_TILES[wallVariant(ry, cx, maze)]}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  </G>
                );
              }

              // Walkable cell — solid black floor
              return (
                <G key={`f-${ry}-${cx}`}>
                  <Rect x={tx} y={ty} width={ts} height={ts} fill={PATH_COLOR} />
                  {cell === 0 && (
                    <SvgImage
                      x={tx + (ts - brainSz) / 2}
                      y={ty + (ts - brainSz) / 2}
                      width={brainSz}
                      height={brainSz}
                      href={SPR_BRAIN}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  )}
                  {cell === 2 && (
                    <SvgImage
                      x={tx + (ts - canSz) / 2}
                      y={ty + (ts - canSz) / 2}
                      width={canSz}
                      height={canSz}
                      href={SPR_TRIOXIN}
                      preserveAspectRatio="xMidYMid meet"
                    />
                  )}
                </G>
              );
            })
          )}

          {/* ── PUNK ENEMIES ── */}
          {punks.map((punk, i) => {
            if (punk.respawnTimer > 0) return null;

            // Maintain last horizontal direction so sprite doesn't snap on vertical moves
            const hDir = punk.dirX !== 0 ? punk.dirX : punk.lastDirX;

            // Active skin for this punk based on current level
            const skin = SKIN_SETS[skinSetIdx][punkSlotIndex(punk.color)];

            // ── "Going home" — eaten punk rushing to spawn: tiny faint sprite ──
            if (punk.goingHome) {
              const ghW = punkW * 0.55;
              const ghH = punkH * 0.55;
              let ghHref: any;
              let ghFlip: string | undefined;
              if (skin.useFlip) {
                ghHref = skin.leftSrc;
                ghFlip = hDir > 0 ? `translate(${punk.pixelX * 2}, 0) scale(-1, 1)` : undefined;
              } else {
                ghHref = hDir > 0 ? skin.rightSrc : skin.leftSrc;
                ghFlip = undefined;
              }
              return (
                <G key={`punk-${i}`} opacity={0.45} transform={ghFlip}>
                  {/* Speed-trail glow */}
                  <Circle
                    cx={punk.pixelX}
                    cy={punk.pixelY}
                    r={ts * 0.35}
                    fill="rgba(255,68,170,0.18)"
                    stroke="#ff44aa"
                    strokeWidth={0.8}
                  />
                  <SvgImage
                    x={punk.pixelX - ghW / 2}
                    y={punk.pixelY - ghH * 0.7}
                    width={ghW}
                    height={ghH}
                    href={ghHref}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </G>
              );
            }

            const pw = punkW;
            const ph = punkH;

            // Blink: alternate scared/normal every 6 ticks (~5 Hz)
            const flashFrame = powered ? Math.floor(powerTimer / 6) % 2 === 0 : false;
            const isScaredSprite = powered && !flashFrame;

            // ── Scared: always use the shared scared sprite with original flip logic ──
            if (isScaredSprite) {
              // SPR_PUNK_SCARED faces RIGHT by default → flip when going left
              const flipT = hDir < 0 ? `translate(${punk.pixelX * 2}, 0) scale(-1, 1)` : undefined;
              return (
                <G key={`punk-${i}`} transform={flipT}>
                  <Circle
                    cx={punk.pixelX}
                    cy={punk.pixelY}
                    r={ts * 0.75}
                    fill="rgba(80,120,255,0.15)"
                    stroke="#4466ff"
                    strokeWidth={1}
                    opacity={0.6}
                  />
                  <SvgImage
                    x={punk.pixelX - pw / 2}
                    y={punk.pixelY - ph * 0.7}
                    width={pw}
                    height={ph}
                    href={SPR_PUNK_SCARED}
                    preserveAspectRatio="xMidYMid meet"
                  />
                </G>
              );
            }

            // ── Normal / flash-back-to-normal ──
            let href: any;
            let flipT: string | undefined;
            if (skin.useFlip) {
              // Original sprites face LEFT — mirror for east-facing
              href  = skin.leftSrc;
              flipT = hDir > 0 ? `translate(${punk.pixelX * 2}, 0) scale(-1, 1)` : undefined;
            } else {
              // New directional sprites — pick left or right source directly, no transform
              href  = hDir > 0 ? skin.rightSrc : skin.leftSrc;
              flipT = undefined;
            }
            return (
              <G key={`punk-${i}`} transform={flipT}>
                <SvgImage
                  x={punk.pixelX - pw / 2}
                  y={punk.pixelY - ph * 0.7}
                  width={pw}
                  height={ph}
                  href={href}
                  preserveAspectRatio="xMidYMid meet"
                />
              </G>
            );
          })}

          {/* ── BONUS FRUIT ── */}
          {fruit && (() => {
            // Gentle pulsing glow that fades out in the last 3 seconds
            const fadeFactor = fruit.timer < 90 ? fruit.timer / 90 : 1;
            const glowPulse  = Math.abs(Math.sin((fruit.timer / 20) * Math.PI));
            const fruitFontSize = ts * 1.1;
            return (
              <G key="fruit">
                {/* Outer glow ring */}
                <Circle
                  cx={fruit.pixelX}
                  cy={fruit.pixelY}
                  r={ts * (0.7 + glowPulse * 0.15)}
                  fill={`rgba(255,215,0,${0.12 * fadeFactor})`}
                  stroke={`rgba(255,200,50,${0.55 * fadeFactor})`}
                  strokeWidth={1.5}
                />
                {/* Emoji label */}
                <SvgText
                  x={fruit.pixelX}
                  y={fruit.pixelY + fruitFontSize * 0.38}
                  fontSize={fruitFontSize}
                  textAnchor="middle"
                  opacity={fadeFactor}
                >
                  {fruit.label}
                </SvgText>
              </G>
            );
          })()}

          {/* ── TARMAN (player) ── */}
          {phase === "dead" ? (
            // Death explosion rings
            <G>
              <Circle cx={player.pixelX} cy={player.pixelY} r={ts * 0.85}
                fill="#ff2200" opacity={0.88} />
              <Circle cx={player.pixelX} cy={player.pixelY} r={ts * 0.58}
                fill="#ff8800" opacity={0.75} />
              <Circle cx={player.pixelX} cy={player.pixelY} r={ts * 0.32}
                fill="#ffff00" opacity={0.6} />
            </G>
          ) : (
            <G>
              {/* ── Powered: layered pulsing green shimmer ── */}
              {powered && (
                <>
                  {/* Outermost wide glow wash */}
                  <Ellipse
                    cx={player.pixelX} cy={player.pixelY}
                    rx={skullW * (0.9 + pulse * 0.22)}
                    ry={skullH * (0.72 + pulse * 0.18)}
                    fill={`rgba(0,255,100,${0.08 + pulse * 0.1})`}
                  />
                  {/* Mid pulse ring */}
                  <Circle
                    cx={player.pixelX} cy={player.pixelY}
                    r={skullW * (0.68 + pulse * 0.14)}
                    fill="none"
                    stroke="#00ff88"
                    strokeWidth={2.5 + pulse * 1.5}
                    opacity={0.55 + pulse * 0.35}
                  />
                  {/* Tight inner ring */}
                  <Circle
                    cx={player.pixelX} cy={player.pixelY}
                    r={skullW * (0.5 + pulse * 0.06)}
                    fill={`rgba(0,255,60,${0.12 + pulse * 0.14})`}
                    stroke="#44ffaa"
                    strokeWidth={1.2}
                    opacity={0.7 + pulse * 0.3}
                  />
                  {/* Corner sparkles — 4 small bright dots */}
                  {[0, 90, 180, 270].map((angle) => {
                    const rad = (angle + powerTimer * 3) * (Math.PI / 180);
                    const dist = skullW * (0.62 + pulse * 0.1);
                    return (
                      <Circle
                        key={`sp${angle}`}
                        cx={player.pixelX + Math.cos(rad) * dist}
                        cy={player.pixelY + Math.sin(rad) * dist}
                        r={2 + pulse * 2.5}
                        fill="#aaff66"
                        opacity={0.6 + pulse * 0.4}
                      />
                    );
                  })}
                </>
              )}
              <SvgImage
                x={player.pixelX - skullW / 2}
                y={player.pixelY - skullH / 2}
                width={skullW}
                height={skullH}
                href={SPR_TARMAN}
                preserveAspectRatio="xMidYMid meet"
              />
            </G>
          )}

        </G>

      </Svg>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
});
