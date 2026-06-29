import React, { memo } from "react";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Ellipse,
  Image as SvgImage,
} from "react-native-svg";

interface Props {
  size: number;
  borderSize: number;
}

// ── Sprite sheet crops ────────────────────────────────────────────────────────
const SPR_GATE_ARCH      = require("../../assets/sprites/gate_arch.png");
const SPR_GRAFFITI_LEFT  = require("../../assets/sprites/graffiti_left.png");
const SPR_GRAFFITI_RIGHT = require("../../assets/sprites/graffiti_right.png");

// ── Source pixel widths for the three gate-row sections ───────────────────────
// Proportional widths: [460 NO-FUTURE] [856 GATE] [459 TRASH] = 1775 total
const GATE_ROW_LEFT_W  = 460;
const GATE_ROW_ARCH_W  = 856;
const GATE_ROW_RIGHT_W = 459;
const GATE_ROW_TOTAL_W = GATE_ROW_LEFT_W + GATE_ROW_ARCH_W + GATE_ROW_RIGHT_W; // 1775

const GATE_ARCH_ASPECT   = 856 / 381;   // ≈ 2.247 — drives row height

// ── SVG-drawn elements (trees, crosses, skull, orbs) ─────────────────────────
const TREE_COLOR  = "#1c1c22";
const CROSS_COLOR = "#ffffff";
const CROSS_GLOW  = "#ffffff";
const NEON_PURPLE = "#ffffff";

function GnarledTree({ x, y, flip = false }: { x: number; y: number; flip?: boolean }) {
  const f = flip ? -1 : 1;
  return (
    <G>
      <Line x1={x} y1={y} x2={x + f * 2} y2={y - 52} stroke={TREE_COLOR} strokeWidth={5} strokeLinecap="round" />
      <Line x1={x + f * 1} y1={y - 20} x2={x + f * 26} y2={y - 40} stroke={TREE_COLOR} strokeWidth={3} strokeLinecap="round" />
      <Line x1={x + f * 22} y1={y - 36} x2={x + f * 36} y2={y - 30} stroke={TREE_COLOR} strokeWidth={2} strokeLinecap="round" />
      <Line x1={x + f * 30} y1={y - 32} x2={x + f * 38} y2={y - 38} stroke={TREE_COLOR} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={x + f * 1} y1={y - 34} x2={x + f * 20} y2={y - 50} stroke={TREE_COLOR} strokeWidth={2} strokeLinecap="round" />
      <Line x1={x + f * 16} y1={y - 46} x2={x + f * 24} y2={y - 44} stroke={TREE_COLOR} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={x + f * 18} y1={y - 50} x2={x + f * 26} y2={y - 58} stroke={TREE_COLOR} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={x} y1={y - 24} x2={x - f * 18} y2={y - 38} stroke={TREE_COLOR} strokeWidth={2.5} strokeLinecap="round" />
      <Line x1={x - f * 14} y1={y - 36} x2={x - f * 22} y2={y - 32} stroke={TREE_COLOR} strokeWidth={1.5} strokeLinecap="round" />
      <Line x1={x - f * 18} y1={y - 38} x2={x - f * 26} y2={y - 44} stroke={TREE_COLOR} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={x + f * 2} y1={y - 50} x2={x + f * 8} y2={y - 60} stroke={TREE_COLOR} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={x + f * 2} y1={y - 50} x2={x - f * 4} y2={y - 58} stroke={TREE_COLOR} strokeWidth={1} strokeLinecap="round" />
      <Line x1={x + f * 6} y1={y - 58} x2={x + f * 12} y2={y - 64} stroke={TREE_COLOR} strokeWidth={0.8} strokeLinecap="round" />
    </G>
  );
}

function NeonCross({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Line x1={cx} y1={cy - 20} x2={cx} y2={cy + 4} stroke={NEON_PURPLE} strokeWidth={6} strokeLinecap="round" opacity={0.2} />
      <Line x1={cx - 9} y1={cy - 13} x2={cx + 9} y2={cy - 13} stroke={NEON_PURPLE} strokeWidth={6} strokeLinecap="round" opacity={0.2} />
      <Line x1={cx} y1={cy - 20} x2={cx} y2={cy + 4} stroke={CROSS_COLOR} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <Line x1={cx - 9} y1={cy - 13} x2={cx + 9} y2={cy - 13} stroke={CROSS_COLOR} strokeWidth={3} strokeLinecap="round" opacity={0.7} />
      <Line x1={cx} y1={cy - 20} x2={cx} y2={cy + 4} stroke={CROSS_GLOW} strokeWidth={1.2} strokeLinecap="round" />
      <Line x1={cx - 9} y1={cy - 13} x2={cx + 9} y2={cy - 13} stroke={CROSS_GLOW} strokeWidth={1.2} strokeLinecap="round" />
    </G>
  );
}

function SkullFigure({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy + 10} rx={8} ry={3} fill="#000000" opacity={0.4} />
      <Path d={`M ${cx - 6} ${cy + 12} L ${cx - 4} ${cy - 2} L ${cx + 4} ${cy - 2} L ${cx + 6} ${cy + 12} Z`}
        fill="#1a1a22" stroke="#444455" strokeWidth={0.8} />
      <Line x1={cx - 4} y1={cy + 2} x2={cx - 14} y2={cy - 4} stroke="#1a1a22" strokeWidth={2} strokeLinecap="round" />
      <Line x1={cx + 4} y1={cy + 2} x2={cx + 14} y2={cy - 6} stroke="#1a1a22" strokeWidth={2} strokeLinecap="round" />
      <Circle cx={cx} cy={cy - 6} r={7} fill="#1a1a22" stroke="#444455" strokeWidth={1} />
      <Ellipse cx={cx - 2.5} cy={cy - 7} rx={1.8} ry={2} fill="#cc44ff" opacity={0.8} />
      <Ellipse cx={cx + 2.5} cy={cy - 7} rx={1.8} ry={2} fill="#cc44ff" opacity={0.8} />
      <Line x1={cx - 3} y1={cy - 2} x2={cx - 3} y2={cy} stroke="#555566" strokeWidth={1} />
      <Line x1={cx - 1} y1={cy - 2} x2={cx - 1} y2={cy + 1} stroke="#555566" strokeWidth={1} />
      <Line x1={cx + 1} y1={cy - 2} x2={cx + 1} y2={cy + 1} stroke="#555566" strokeWidth={1} />
      <Line x1={cx + 3} y1={cy - 2} x2={cx + 3} y2={cy} stroke="#555566" strokeWidth={1} />
    </G>
  );
}

function SpiritOrb({ cx, cy, r = 4 }: { cx: number; cy: number; r?: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r * 1.5} fill="rgba(140,60,220,0.06)" />
      <Circle cx={cx} cy={cy} r={r} fill="rgba(180,80,255,0.16)" />
      <Circle cx={cx} cy={cy} r={r * 0.5} fill="rgba(210,120,255,0.38)" />
      <Circle cx={cx} cy={cy} r={r * 0.18} fill="rgba(240,200,255,0.72)" />
    </G>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export const CemeteryBorder = memo(function CemeteryBorder({ size, borderSize: bs }: Props) {
  const mid = size / 2;
  const innerW = size - 2 * bs;

  // ── Gate row: [NO FUTURE graffiti] [gate arch] [TRASH graffiti] ─────────────
  // All three sections share the same Y and the same rendered height (rowH).
  // Widths are proportional to source pixel widths out of 1775 total.
  const MAX_ROW_H = 90;   // cap so the row fits within GATE_RESERVE_H in app/index

  const gateRowLeftW  = innerW * (GATE_ROW_LEFT_W  / GATE_ROW_TOTAL_W);
  const gateRowArchW  = innerW * (GATE_ROW_ARCH_W  / GATE_ROW_TOTAL_W);
  const gateRowRightW = innerW * (GATE_ROW_RIGHT_W / GATE_ROW_TOTAL_W);

  // Row height driven by the gate arch aspect ratio, capped
  const rowH = Math.min(gateRowArchW / GATE_ARCH_ASPECT, MAX_ROW_H);
  const gateY = size - bs; // top of the gate row aligns with the bottom border edge

  // Extra SVG height: the row extends below the maze boundary (size),
  // minus the border strip that is already inside the maze rect
  const svgExtraH = Math.max(0, Math.round(rowH - bs + 8));

  return (
    <Svg
      width={size}
      height={size + svgExtraH}
      style={{ position: "absolute", top: 0, left: 0 }}
      pointerEvents="none"
    >
      {/* ── BOTTOM — gate row: [NO FUTURE] [gate arch] [TRASH] ─────────────────
          All three sections share the same Y (gateY) and same height (rowH).
          The graffiti walls flank the gate arch left and right in one row.
          overflow:"visible" on the mazeWrapper lets this render below the maze. */}
      <SvgImage
        x={bs}
        y={gateY}
        width={gateRowLeftW}
        height={rowH}
        href={SPR_GRAFFITI_LEFT}
        preserveAspectRatio="xMidYMid meet"
      />
      <SvgImage
        x={bs + gateRowLeftW}
        y={gateY}
        width={gateRowArchW}
        height={rowH}
        href={SPR_GATE_ARCH}
        preserveAspectRatio="xMidYMid meet"
      />
      <SvgImage
        x={bs + gateRowLeftW + gateRowArchW}
        y={gateY}
        width={gateRowRightW}
        height={rowH}
        href={SPR_GRAFFITI_RIGHT}
        preserveAspectRatio="xMidYMid meet"
      />
    </Svg>
  );
});
