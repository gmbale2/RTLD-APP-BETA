/**
 * spinwheel.tsx — Wheel of Fortune (Code-Drawn Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggered at SPIN_THRESHOLD (20,000 pts). Player swipes to spin.
 * Drawn entirely in code (react-native-svg + Animated). ~27MB lighter than
 * the previous video-based implementation.
 *
 * FONT NOTE: Using Boogaloo as placeholder for Gagalin (removed from Google
 * Fonts). To swap in Gagalin: add Gagalin-Regular.ttf to assets/fonts/,
 * load it in _layout.tsx useFonts, and replace "Boogaloo_400Regular" below.
 *
 * ── CMS CONFIG ────────────────────────────────────────────────────────────────
 * Edit WHEEL_CONFIG to change prizes, codes, and probabilities.
 * Phase 2: replace with a Supabase "wheel_config" table fetch.
 * probability values MUST sum to 1.0
 */

import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Circle, Path, G, Polygon, Text as SvgText } from "react-native-svg";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { setPendingPrize } from "@/utils/wheelState";

// ── Static assets ─────────────────────────────────────────────────────────────
const BG_IMAGE = require("../assets/images/spinwheel_bg.jpg");

// ── Segment constants (independent of screen size) ────────────────────────────
const SEG_COUNT   = 8;
const SEG_ANGLE_R = (2 * Math.PI) / SEG_COUNT;
const SEG_ANGLE_D = 360 / SEG_COUNT;

// ── Visual theme ──────────────────────────────────────────────────────────────
const DARK_GREEN  = "#1d5c1d";
const SAGE_GREEN  = "#7fb07f";
const TEXT_COL    = "#ffffff";
const RIM_FILL    = "#1c1a14";
const RIM_STROKE  = "#4e4a3e";
const RIVET_COL   = "#7a7060";
const RIVET_HIGH  = "#a09080";
const NEON_GREEN  = "#39ff14";

// Swap this to "Gagalin_400Regular" once the TTF is added to the project
const WHEEL_FONT  = "Boogaloo_400Regular";

// ── Types ─────────────────────────────────────────────────────────────────────
type SegmentType = "discount" | "double" | "merch" | "points" | "none";

interface WheelSegment {
  id: string;
  lines: string[];
  type: SegmentType;
  value: string | null;
  code: string | null;
  probability: number;
}

// ── CMS-READY WHEEL CONFIG ────────────────────────────────────────────────────
const STORE_URL = "https://returnofthelivingdead.com/collections/all-products-1";

const WHEEL_CONFIG: WheelSegment[] = [
  { id: "s0", lines: ["DOUBLE", "POINTS"],   type: "double",   value: null,   code: null,     probability: 0.10 },
  { id: "s1", lines: ["20%", "OFF CODE"],    type: "discount", value: "20",   code: "RTLD20", probability: 0.12 },
  { id: "s2", lines: ["MERCH", "GIFT"],      type: "merch",    value: null,   code: null,     probability: 0.08 },
  { id: "s3", lines: ["30%", "OFF CODE"],    type: "discount", value: "30",   code: "RTLD30", probability: 0.08 },
  { id: "s4", lines: ["15%", "OFF CODE"],    type: "discount", value: "15",   code: "RTLD15", probability: 0.16 },
  { id: "s5", lines: ["+1,000", "POINTS"],   type: "points",   value: "1000", code: null,     probability: 0.20 },
  { id: "s6", lines: ["OUT OF", "LUCK"],     type: "none",     value: null,   code: null,     probability: 0.16 },
  { id: "s7", lines: ["10%", "OFF CODE"],    type: "discount", value: "10",   code: "RTLD10", probability: 0.10 },
];

// ── SVG: pie-slice path (clockwise, origin at top) ────────────────────────────
function segPath(r: number, idx: number): string {
  const cx = r, cy = r;
  const start = idx * SEG_ANGLE_R - Math.PI / 2;
  const end   = start + SEG_ANGLE_R;
  const x1 = cx + r * Math.cos(start);
  const y1 = cy + r * Math.sin(start);
  const x2 = cx + r * Math.cos(end);
  const y2 = cy + r * Math.sin(end);
  return `M ${cx} ${cy} L ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`;
}

// ── Prize helpers ─────────────────────────────────────────────────────────────
function pickWinner(): { seg: WheelSegment; idx: number } {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < WHEEL_CONFIG.length; i++) {
    cum += WHEEL_CONFIG[i].probability;
    if (r <= cum) return { seg: WHEEL_CONFIG[i], idx: i };
  }
  return { seg: WHEEL_CONFIG[WHEEL_CONFIG.length - 1], idx: WHEEL_CONFIG.length - 1 };
}

function prizeEmoji(type: SegmentType) {
  if (type === "discount") return "🎟️";
  if (type === "double")   return "⚡";
  if (type === "merch")    return "🎁";
  if (type === "points")   return "💀";
  return "💀";
}

function prizeTitle(seg: WheelSegment) {
  if (seg.type === "discount") return `${seg.value}% OFF!`;
  if (seg.type === "double")   return "DOUBLE POINTS!";
  if (seg.type === "merch")    return "MERCH GIFT!";
  if (seg.type === "points")   return "+1,000 POINTS!";
  return "OUT OF LUCK…";
}

function prizeDesc(seg: WheelSegment) {
  if (seg.type === "discount")
    return `Use the code below at checkout for ${seg.value}% off your RTLD order.`;
  if (seg.type === "double")
    return "Your score this game will be registered ×2 on the worldwide leaderboard!";
  if (seg.type === "merch")
    return "You won exclusive RTLD merch!\nDM @rtldofficial on Instagram with your game username to claim.";
  if (seg.type === "points")
    return "1,000 bonus points have been added to your score!";
  return "The undead gods weren't smiling today. Better luck next time!";
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error web-only
      { textShadow: "0 0 18px #39ff14, 0 0 36px #0a2200" }
    : {
        textShadowColor: NEON_GREEN,
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 18,
      };

type Phase = "idle" | "spinning" | "result";

// ── Component ─────────────────────────────────────────────────────────────────
export default function SpinWheelScreen() {
  const insets = useSafeAreaInsets();
  // useWindowDimensions re-renders on resize — fixes responsiveness
  const { width: SW, height: SH } = useWindowDimensions();
  const { score, level } = useLocalSearchParams<{ score?: string; level?: string }>();
  const displayScore = score ? Number(score).toLocaleString() : "20,000";

  // ── Geometry derived from live window size ─────────────────────────────────
  const WHEEL_D  = Math.min(SW * 0.88, 340);
  const R        = WHEEL_D / 2;
  const RIM_W    = Math.max(13, Math.round(R * 0.09));
  const IR       = R - RIM_W;
  const WHEEL_CX = SW / 2;
  const WHEEL_CY = SH * 0.50;
  const WHEEL_TOP = WHEEL_CY - R;
  const HINT_Y    = WHEEL_CY + R + 16;
  const FS        = Math.max(8, Math.round(IR * 0.082));

  // Rivet positions — recomputed when dimensions change
  const rivets = Array.from({ length: 16 }, (_, i) => {
    const a  = (i / 16) * 2 * Math.PI - Math.PI / 2;
    const rv = R - RIM_W / 2;
    return { x: R + rv * Math.cos(a), y: R + rv * Math.sin(a) };
  });

  // ── Phase & winner ─────────────────────────────────────────────────────────
  const phaseRef  = useRef<Phase>("idle");
  const [phase, setPhase]   = useState<Phase>("idle");
  const [winner, setWinner] = useState<{ seg: WheelSegment; idx: number } | null>(null);
  const winnerRef = useRef<{ seg: WheelSegment; idx: number } | null>(null);
  const [copied, setCopied] = useState(false);

  const angleRef  = useRef(0);
  const spinAngle = useRef(new Animated.Value(0)).current;
  const cardAnim  = useRef(new Animated.Value(SH)).current;

  const spinInterp = spinAngle.interpolate({
    inputRange:  [0, 360],
    outputRange: ["0deg", "360deg"],
    extrapolate: "extend",
  });

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ── Spin ───────────────────────────────────────────────────────────────────
  const spinWheel = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const result = pickWinner();
    winnerRef.current = result;
    setWinner(result);
    setPhaseSync("spinning");

    const segCenter = result.idx * SEG_ANGLE_D + SEG_ANGLE_D / 2;
    const current   = angleRef.current % 360;
    let   delta     = (360 - segCenter - current + 360) % 360;
    if (delta < SEG_ANGLE_D) delta += 360;
    const total  = angleRef.current + 4 * 360 + delta;

    Animated.timing(spinAngle, {
      toValue:         total,
      duration:        4600,
      easing:          Easing.out(Easing.bezier(0.15, 0.85, 0.35, 1)),
      useNativeDriver: true,
    }).start(() => {
      angleRef.current = total;
      const w = winnerRef.current;
      if (!w) return;
      setPendingPrize({
        type:     w.seg.type,
        label:    w.seg.lines.join(" "),
        code:     w.seg.code  ?? undefined,
        value:    w.seg.value ?? undefined,
        storeUrl: STORE_URL,
      });
      setPhaseSync("result");
      Animated.spring(cardAnim, {
        toValue:         0,
        useNativeDriver: true,
        bounciness:      6,
        speed:           14,
      }).start();
    });
  }, [spinAngle, cardAnim]);

  const spinRef = useRef(spinWheel);
  spinRef.current = spinWheel;

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === "idle",
      onMoveShouldSetPanResponder:  () => phaseRef.current === "idle",
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 20 && phaseRef.current === "idle") {
          spinRef.current();
        }
      },
    })
  ).current;

  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleContinue = () => {
    const baseScore = Number(score ?? 0);
    const seg = winner?.seg;
    let finalScore = baseScore;
    let doubled = false;
    let wheelPrize = "";
    if (seg) {
      if (seg.type === "double") {
        finalScore = baseScore * 2; doubled = true; wheelPrize = "DOUBLE POINTS";
      } else if (seg.type === "points") {
        finalScore = baseScore + 1000; wheelPrize = "+1,000 POINTS";
      } else if (seg.type === "discount") {
        wheelPrize = `${seg.value}% OFF CODE: ${seg.code}`;
      } else if (seg.type === "merch") {
        wheelPrize = "MERCH GIFT";
      }
    }
    router.replace({
      pathname: "/gameover",
      params: { score: String(finalScore), level: level ?? "1", doubled: doubled ? "true" : "false", wheelPrize },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>

      {/* ── Background ──────────────────────────────────────────────── */}
      <Image source={BG_IMAGE} style={styles.bgImage} resizeMode="cover" />
      <View style={styles.bgOverlay} pointerEvents="none" />

      {/* ── Score badge ─────────────────────────────────────────────── */}
      {phase !== "result" && (
        <View style={[styles.scoreBadge, { top: insets.top + 14 }]} pointerEvents="none">
          <Text style={styles.scoreBadgeText}>🎰 YOU HIT {displayScore} PTS!</Text>
        </View>
      )}

      {/* ── Static outer rim ──────────────────────────────────────────── */}
      <View
        style={[styles.absLayer, { left: WHEEL_CX - R, top: WHEEL_TOP, width: WHEEL_D, height: WHEEL_D }]}
        pointerEvents="none"
      >
        <Svg width={WHEEL_D} height={WHEEL_D}>
          <Circle cx={R} cy={R} r={R - 1}    fill={RIM_FILL} />
          <Circle cx={R} cy={R} r={R - 1}    fill="none" stroke={RIM_STROKE} strokeWidth={2.5} />
          <Circle cx={R} cy={R} r={IR + 1}   fill="none" stroke="#2a2820" strokeWidth={1} />
          {rivets.map((rv, i) => (
            <React.Fragment key={i}>
              <Circle cx={rv.x} cy={rv.y} r={5}   fill="#111" />
              <Circle cx={rv.x} cy={rv.y} r={3.5} fill={RIVET_COL} />
              <Circle cx={rv.x - 1} cy={rv.y - 1} r={1.2} fill={RIVET_HIGH} />
            </React.Fragment>
          ))}
          {/* Diamond pointer */}
          <Polygon
            points={`${R},0 ${R + 9},10 ${R},22 ${R - 9},10`}
            fill="#111800"
            stroke={NEON_GREEN}
            strokeWidth={1.5}
          />
          <Circle cx={R} cy={9} r={4} fill={NEON_GREEN} />
          <Circle cx={R - 1.2} cy={7.5} r={1.5} fill="#aaffaa" />
        </Svg>
      </View>

      {/* ── Spinning disc ─────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.absLayer,
          {
            left:   WHEEL_CX - IR,
            top:    WHEEL_CY - IR,
            width:  IR * 2,
            height: IR * 2,
            transform: [{ rotate: spinInterp }],
          },
        ]}
        pointerEvents="none"
      >
        <Svg width={IR * 2} height={IR * 2}>
          {WHEEL_CONFIG.map((seg, i) => {
            const centerA = i * SEG_ANGLE_R - Math.PI / 2 + SEG_ANGLE_R / 2;
            const tr = IR * 0.60;
            const tx = IR + tr * Math.cos(centerA);
            const ty = IR + tr * Math.sin(centerA);
            const rot = i * SEG_ANGLE_D + SEG_ANGLE_D / 2;
            const lineH = FS + 3;
            return (
              <G key={seg.id}>
                <Path d={segPath(IR, i)} fill={i % 2 === 0 ? DARK_GREEN : SAGE_GREEN} />
                <G transform={`translate(${tx.toFixed(1)},${ty.toFixed(1)}) rotate(${rot})`}>
                  {seg.lines.map((line, li) => (
                    <SvgText
                      key={li}
                      textAnchor="middle"
                      y={((li - (seg.lines.length - 1) / 2) * lineH).toFixed(1)}
                      fill={TEXT_COL}
                      fontSize={FS}
                      fontWeight="bold"
                      fontFamily={WHEEL_FONT}
                    >
                      {line}
                    </SvgText>
                  ))}
                </G>
              </G>
            );
          })}
          <Circle cx={IR} cy={IR} r={IR - 0.5} fill="none" stroke="#0a0a0a" strokeWidth={1.5} />
        </Svg>
      </Animated.View>

      {/* ── Swipe gesture layer ───────────────────────────────────────── */}
      {phase === "idle" && (
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          <View style={[styles.hintWrap, { top: HINT_Y }]} pointerEvents="none">
            <Text style={styles.hintText}>← SWIPE THE WHEEL →</Text>
          </View>
        </View>
      )}

      {/* ── Spinning label ────────────────────────────────────────────── */}
      {phase === "spinning" && (
        <View style={[styles.hintWrap, { top: HINT_Y }]} pointerEvents="none">
          <Text style={styles.hintText}>SPINNING…</Text>
        </View>
      )}

      {/* ── Result card ───────────────────────────────────────────────── */}
      {phase === "result" && winner && (
        <Animated.View
          style={[
            styles.resultSheet,
            { paddingBottom: insets.bottom + 16 },
            { transform: [{ translateY: cardAnim }] },
          ]}
        >
          <Text style={styles.resultEmoji}>{prizeEmoji(winner.seg.type)}</Text>
          <Text
            style={[
              styles.resultTitle,
              winner.seg.type === "none" ? styles.resultTitleNone : styles.resultTitleWin,
              titleGlow,
            ]}
          >
            {prizeTitle(winner.seg)}
          </Text>
          <Text style={styles.resultDesc}>{prizeDesc(winner.seg)}</Text>

          {winner.seg.type === "discount" && winner.seg.code && (
            <>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{winner.seg.code}</Text>
              </View>
              <View style={styles.codeActions}>
                <Pressable
                  style={({ pressed }) => [styles.copyBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => handleCopy(winner.seg.code!)}
                >
                  <FontAwesome5 name={copied ? "check" : "copy"} size={11} color="#0a0012" />
                  <Text style={styles.copyBtnText}>{copied ? "COPIED!" : "COPY CODE"}</Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [styles.storeBtn, pressed && { opacity: 0.75 }]}
                  onPress={() => Linking.openURL(STORE_URL)}
                >
                  <FontAwesome5 name="external-link-alt" size={11} color="#0a0012" />
                  <Text style={styles.storeBtnText}>GO TO STORE</Text>
                </Pressable>
              </View>
            </>
          )}

          <Pressable
            style={({ pressed }) => [styles.continueBtn, pressed && { opacity: 0.75 }]}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>
              {winner.seg.type === "none" ? "CONTINUE PLAYING" : "CONTINUE →"}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:     { flex: 1, backgroundColor: "#050c05" },
  bgImage:  { ...StyleSheet.absoluteFillObject, width: "100%", height: "100%" },
  bgOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.35)" },
  absLayer: { position: "absolute" },
  scoreBadge: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: NEON_GREEN,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  scoreBadgeText: {
    fontSize: 11,
    color: NEON_GREEN,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  hintWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  hintText: {
    fontSize: 11,
    color: "#ccffcc",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2.5,
    textAlign: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    overflow: "hidden",
  },
  resultSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(3,10,3,0.97)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1.5,
    borderColor: "#1a4400",
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    alignItems: "center",
    gap: 12,
    shadowColor: NEON_GREEN,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  resultEmoji:     { fontSize: 48 },
  resultTitle:     { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: 2, textAlign: "center" },
  resultTitleWin:  { color: NEON_GREEN },
  resultTitleNone: { color: "#554455" },
  resultDesc: {
    fontSize: 13,
    color: "#99bb99",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
  codeBox: {
    backgroundColor: "#040e04",
    borderWidth: 1.5,
    borderColor: NEON_GREEN,
    borderRadius: 8,
    borderStyle: "dashed",
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  codeText: {
    fontSize: 26,
    color: NEON_GREEN,
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
    textAlign: "center",
  },
  codeActions:  { flexDirection: "row", gap: 10 },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: NEON_GREEN, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6,
  },
  copyBtnText:  { fontSize: 10, color: "#0a0012", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  storeBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#00ccff", paddingHorizontal: 14, paddingVertical: 10, borderRadius: 6,
  },
  storeBtnText: { fontSize: 10, color: "#0a0012", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  continueBtn: {
    alignSelf: "stretch", backgroundColor: "#cc00ff",
    paddingVertical: 14, borderRadius: 8, alignItems: "center", marginTop: 4,
  },
  continueBtnText: { fontSize: 14, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 2 },
});
