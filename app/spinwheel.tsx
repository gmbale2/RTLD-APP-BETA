/**
 * spinwheel.tsx — Wheel of Fortune (Video Edition)
 * ─────────────────────────────────────────────────────────────────────────────
 * Triggered at SPIN_THRESHOLD (20,000 pts). Player swipes to spin.
 * Uses 8 pre-generated video variants so the wheel stops at different
 * positions for each outcome.
 *
 * ── CMS CONFIG ────────────────────────────────────────────────────────────────
 * Edit WHEEL_CONFIG to change prizes, codes, and probabilities.
 * Phase 2: replace with a Supabase "wheel_config" table fetch.
 * probability values MUST sum to 1.0
 */

import React, { useCallback, useRef, useState, useEffect } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Linking,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import type { AVPlaybackStatus } from "expo-av";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";

import { setPendingPrize } from "@/utils/wheelState";

// ── Screen & video dimensions ─────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Source video is 720×1280 (portrait 9:16)
const VIDEO_W = 720;
const VIDEO_H = 1280;

// In ResizeMode.CONTAIN the video is letterboxed to fit within the screen.
// Compute the actual displayed rect so overlays can be positioned inside it.
const VID_ASPECT = VIDEO_W / VIDEO_H;
const SCR_ASPECT = SCREEN_W / SCREEN_H;

// If the video is wider (rel. to height) than the screen → constrained by width
// If the video is taller (rel. to height) → constrained by height
const DISP_W = VID_ASPECT > SCR_ASPECT ? SCREEN_W : SCREEN_H * VID_ASPECT;
const DISP_H = VID_ASPECT > SCR_ASPECT ? SCREEN_W / VID_ASPECT : SCREEN_H;
const DISP_X = (SCREEN_W - DISP_W) / 2;   // left edge of displayed video
const DISP_Y = (SCREEN_H - DISP_H) / 2;   // top edge of displayed video

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
// ◄ Edit these to customize prizes, odds, and codes ►
// Segments appear clockwise starting from the 12-o'clock position.

const STORE_URL =
  "https://returnofthelivingdead.com/collections/all-products-1";

const WHEEL_CONFIG: WheelSegment[] = [
  {
    id: "s0",
    lines: ["DOUBLE", "POINTS"],
    type: "double",
    value: null,
    code: null,
    probability: 0.10,
  },
  {
    id: "s1",
    lines: ["20%", "OFF CODE"],
    type: "discount",
    value: "20",
    code: "RTLD20",
    probability: 0.12,
  },
  {
    id: "s2",
    lines: ["MERCH", "GIFT"],
    type: "merch",
    value: null,
    code: null,
    probability: 0.08,
  },
  {
    id: "s3",
    lines: ["30%", "OFF CODE"],
    type: "discount",
    value: "30",
    code: "RTLD30",
    probability: 0.08,
  },
  {
    id: "s4",
    lines: ["15%", "OFF CODE"],
    type: "discount",
    value: "15",
    code: "RTLD15",
    probability: 0.16,
  },
  {
    id: "s5",
    lines: ["+1,000", "POINTS"],
    type: "points",
    value: "1000",
    code: null,
    probability: 0.20,
  },
  {
    id: "s6",
    lines: ["OUT OF", "LUCK"],
    type: "none",
    value: null,
    code: null,
    probability: 0.16,
  },
  {
    id: "s7",
    lines: ["10%", "OFF CODE"],
    type: "discount",
    value: "10",
    code: "RTLD10",
    probability: 0.10,
  },
];

// ── Video sources (one per wheel segment, each trimmed to a different stop) ───
// spin_0 = longest (10.04s), spin_7 = shortest (7.50s)
// Each variant ends with the wheel at a different rotational position.

const SPIN_VIDEOS = [
  require("../assets/videos/spin_0.mp4"),
  require("../assets/videos/spin_1.mp4"),
  require("../assets/videos/spin_2.mp4"),
  require("../assets/videos/spin_3.mp4"),
  require("../assets/videos/spin_4.mp4"),
  require("../assets/videos/spin_5.mp4"),
  require("../assets/videos/spin_6.mp4"),
  require("../assets/videos/spin_7.mp4"),
] as const;

// Poster: first frame of spin_0 (zombie + wheel in static pose)
const POSTER_IMAGE = require("../assets/images/spin_poster.jpg");

// ── Prize selection ───────────────────────────────────────────────────────────

function pickWinner(): { seg: WheelSegment; idx: number } {
  const r = Math.random();
  let cum = 0;
  for (let i = 0; i < WHEEL_CONFIG.length; i++) {
    cum += WHEEL_CONFIG[i].probability;
    if (r <= cum) return { seg: WHEEL_CONFIG[i], idx: i };
  }
  return {
    seg: WHEEL_CONFIG[WHEEL_CONFIG.length - 1],
    idx: WHEEL_CONFIG.length - 1,
  };
}

// ── Result helpers ────────────────────────────────────────────────────────────

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

// ── Glow style ────────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error web-only
      { textShadow: "0 0 18px #39ff14, 0 0 36px #0a2200" }
    : {
        textShadowColor: "#39ff14",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 18,
      };

// ── Component ─────────────────────────────────────────────────────────────────

type Phase = "idle" | "spinning" | "result";

export default function SpinWheelScreen() {
  const insets = useSafeAreaInsets();
  const { score, level } = useLocalSearchParams<{ score?: string; level?: string }>();
  const displayScore = score ? Number(score).toLocaleString() : "20,000";

  // ── State ──────────────────────────────────────────────────────────────
  const phaseRef = useRef<Phase>("idle");
  const [phase, setPhase] = useState<Phase>("idle");
  const [winner, setWinner] = useState<{ seg: WheelSegment; idx: number } | null>(null);
  const winnerRef = useRef<{ seg: WheelSegment; idx: number } | null>(null);
  const [videoIdx, setVideoIdx] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Measured container size so the Video gets explicit pixel dimensions
  // (expo-av on web overrides them with the video's intrinsic 720×1280
  //  unless we re-supply the actual rendered rect here).
  const [videoDims, setVideoDims] = useState({ w: SCREEN_W, h: SCREEN_H });

  // ── Web-only: force <video> to fill its container ────────────────────
  // expo-av sets the video element's CSS width/height to its intrinsic
  // resolution (720×1280) via internal Tailwind classes. We override that
  // with a one-time <style> injection so the video stays within the wrapper.
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const STYLE_ID = "spinwheel-video-contain-fix";
    if (!document.getElementById(STYLE_ID)) {
      const s = document.createElement("style");
      s.id = STYLE_ID;
      s.textContent = [
        "/* expo-av Video contain fix — spinwheel.tsx */",
        "video { width: 100% !important; height: 100% !important;",
        "        object-fit: contain !important; }",
      ].join("\n");
      document.head.appendChild(s);
    }
  }, []);

  // Result card slide-up animation
  const cardAnim = useRef(new Animated.Value(SCREEN_H)).current;

  const setPhaseSync = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };

  // ── Spin ───────────────────────────────────────────────────────────────
  const spinWheel = useCallback(() => {
    if (phaseRef.current !== "idle") return;
    const result = pickWinner();
    winnerRef.current = result;
    setWinner(result);
    setVideoIdx(result.idx);
    setPhaseSync("spinning");
  }, []);

  // Stable ref for PanResponder
  const spinRef = useRef(spinWheel);
  spinRef.current = spinWheel;

  // ── PanResponder: horizontal swipe triggers spin ─────────────────────
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => phaseRef.current === "idle",
      onMoveShouldSetPanResponder: () => phaseRef.current === "idle",
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 20 && phaseRef.current === "idle") {
          spinRef.current();
        }
      },
    })
  ).current;

  // ── Video playback status ─────────────────────────────────────────────
  // Uses winnerRef (not state) to avoid stale closure across async callbacks
  const handlePlaybackStatus = useCallback(
    (status: AVPlaybackStatus) => {
      if (!status.isLoaded) return;
      if (status.didJustFinish && phaseRef.current === "spinning") {
        const w = winnerRef.current;
        if (!w) return;
        // Store result for index.tsx to pick up on focus return
        setPendingPrize({
          type: w.seg.type,
          label: w.seg.lines.join(" "),
          code: w.seg.code ?? undefined,
          value: w.seg.value ?? undefined,
          storeUrl: STORE_URL,
        });
        setPhaseSync("result");
        // Slide card up
        Animated.spring(cardAnim, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 6,
          speed: 14,
        }).start();
      }
    },
    [cardAnim]   // winner comes from winnerRef, no dep needed
  );

  // ── Copy code ─────────────────────────────────────────────────────────
  const handleCopy = async (code: string) => {
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  // ── Continue → gameover with final score ─────────────────────────────
  const handleContinue = () => {
    const baseScore = Number(score ?? 0);
    const seg = winner?.seg;
    let finalScore = baseScore;
    let doubled = false;
    let wheelPrize = "";

    if (seg) {
      if (seg.type === "double") {
        finalScore = baseScore * 2;
        doubled = true;
        wheelPrize = "DOUBLE POINTS";
      } else if (seg.type === "points") {
        finalScore = baseScore + 1000;
        wheelPrize = "+1,000 POINTS";
      } else if (seg.type === "discount") {
        wheelPrize = `${seg.value}% OFF CODE: ${seg.code}`;
      } else if (seg.type === "merch") {
        wheelPrize = "MERCH GIFT";
      }
    }

    router.replace({
      pathname: "/gameover",
      params: {
        score: String(finalScore),
        level: level ?? "1",
        doubled: doubled ? "true" : "false",
        wheelPrize,
      },
    });
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── Background: always the poster (zombie + wheel static) ── */}
      <Image
        source={POSTER_IMAGE}
        style={styles.media}
        resizeMode="contain"
      />

      {/* Dark overlay to deepen atmosphere */}
      <View style={styles.darkOverlay} pointerEvents="none" />

      {/* ── Video: plays over poster when spinning ────────────────── */}
      {/* Wrap in an absoluteFill container so the Video's flex:1 sizing   */}
      {/* mirrors the Image exactly — ResizeMode.CONTAIN then letterboxes  */}
      {/* the 720×1280 source to fit the screen without zoom or crop.      */}
      {phase !== "idle" && (
        <View
          style={styles.videoWrap}
          pointerEvents="none"
          onLayout={e => {
            const { width, height } = e.nativeEvent.layout;
            setVideoDims({ w: width, h: height });
          }}
        >
          <Video
            key={videoIdx}                       // remount = new source
            source={SPIN_VIDEOS[videoIdx]}
            // Explicit pixel dimensions stop expo-av from using the video's
            // intrinsic 720×1280 size. ResizeMode.CONTAIN then letter-boxes
            // the content inside these bounds — no zoom, no crop.
            style={{ width: videoDims.w, height: videoDims.h }}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            isLooping={false}
            isMuted
            onPlaybackStatusUpdate={handlePlaybackStatus}
          />
        </View>
      )}

      {/* ── Score badge — positioned inside the video's displayed rect ─── */}
      {phase !== "result" && (
        <View
          style={[styles.scoreBadge, { top: DISP_Y + 14 }]}
          pointerEvents="none"
        >
          <Text style={styles.scoreBadgeText}>🎰 YOU HIT {displayScore} PTS!</Text>
        </View>
      )}

      {/* ── Swipe-to-spin gesture layer (idle only) ───────────────── */}
      {phase === "idle" && (
        <View style={StyleSheet.absoluteFill} {...pan.panHandlers}>
          {/* Swipe hint sits inside the video area, near its bottom */}
          <View
            style={[
              styles.swipeHintWrap,
              { bottom: SCREEN_H - (DISP_Y + DISP_H) + 20 },
            ]}
            pointerEvents="none"
          >
            <Text style={styles.swipeHintText}>← SWIPE THE WHEEL →</Text>
          </View>
        </View>
      )}

      {/* ── Spinning label (video playing) ────────────────────────── */}
      {phase === "spinning" && (
        <View
          style={[
            styles.swipeHintWrap,
            { bottom: SCREEN_H - (DISP_Y + DISP_H) + 20 },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.swipeHintText}>SPINNING…</Text>
        </View>
      )}

      {/* ── Result card (slides up from bottom) ──────────────────── */}
      {phase === "result" && winner && (
        <Animated.View
          style={[
            styles.resultSheet,
            { paddingBottom: insets.bottom + 16 },
            { transform: [{ translateY: cardAnim }] },
          ]}
        >
          {/* Prize icon + title */}
          <Text style={styles.resultEmoji}>{prizeEmoji(winner.seg.type)}</Text>
          <Text
            style={[
              styles.resultTitle,
              winner.seg.type === "none"
                ? styles.resultTitleNone
                : styles.resultTitleWin,
              titleGlow,
            ]}
          >
            {prizeTitle(winner.seg)}
          </Text>
          <Text style={styles.resultDesc}>{prizeDesc(winner.seg)}</Text>

          {/* Discount code block */}
          {winner.seg.type === "discount" && winner.seg.code && (
            <>
              <View style={styles.codeBox}>
                <Text style={styles.codeText}>{winner.seg.code}</Text>
              </View>
              <View style={styles.codeActions}>
                <Pressable
                  style={({ pressed }) => [
                    styles.copyBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => handleCopy(winner.seg.code!)}
                >
                  <FontAwesome5
                    name={copied ? "check" : "copy"}
                    size={11}
                    color="#0a0012"
                  />
                  <Text style={styles.copyBtnText}>
                    {copied ? "COPIED!" : "COPY CODE"}
                  </Text>
                </Pressable>
                <Pressable
                  style={({ pressed }) => [
                    styles.storeBtn,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => Linking.openURL(STORE_URL)}
                >
                  <FontAwesome5
                    name="external-link-alt"
                    size={11}
                    color="#0a0012"
                  />
                  <Text style={styles.storeBtnText}>GO TO STORE</Text>
                </Pressable>
              </View>
            </>
          )}

          {/* Continue */}
          <Pressable
            style={({ pressed }) => [
              styles.continueBtn,
              pressed && { opacity: 0.75 },
            ]}
            onPress={handleContinue}
          >
            <Text style={styles.continueBtnText}>
              {winner.seg.type === "none"
                ? "CONTINUE PLAYING"
                : "CONTINUE →"}
            </Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
  },

  // The poster image fills the full screen; ResizeMode.CONTAIN centers the
  // 720×1280 content inside without cropping — no zoom-in, no distortion.
  media: {
    position: "absolute",
    top: 0,
    left: 0,
    width: SCREEN_W,
    height: SCREEN_H,
  },

  // Video wrapper: absoluteFill so it matches the poster Image exactly.
  // The black background fills any letterbox bars shown by CONTAIN mode.
  videoWrap: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)",
  },

  scoreBadge: {
    position: "absolute",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#39ff14",
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  scoreBadgeText: {
    fontSize: 11,
    color: "#39ff14",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  swipeHintWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  swipeHintText: {
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

  // Result sheet slides up from bottom
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
    // subtle green top glow
    shadowColor: "#39ff14",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },

  resultEmoji: {
    fontSize: 48,
  },
  resultTitle: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  resultTitleWin: {
    color: "#39ff14",
  },
  resultTitleNone: {
    color: "#554455",
  },
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
    borderColor: "#39ff14",
    borderRadius: 8,
    borderStyle: "dashed",
    paddingHorizontal: 28,
    paddingVertical: 10,
    alignSelf: "stretch",
    alignItems: "center",
  },
  codeText: {
    fontSize: 26,
    color: "#39ff14",
    fontFamily: "Inter_700Bold",
    letterSpacing: 6,
    textAlign: "center",
  },
  codeActions: {
    flexDirection: "row",
    gap: 10,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#39ff14",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  copyBtnText: {
    fontSize: 10,
    color: "#0a0012",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  storeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#00ccff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 6,
  },
  storeBtnText: {
    fontSize: 10,
    color: "#0a0012",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  continueBtn: {
    alignSelf: "stretch",
    backgroundColor: "#cc00ff",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 4,
  },
  continueBtnText: {
    fontSize: 14,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
