/**
 * gameover.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Post-game screen: share card, social buttons, rank, and top-20 leaderboard.
 *
 * URL params:  /gameover?score=1234&level=5
 */

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  TextStyle,
  Animated,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { FontAwesome5, FontAwesome6 } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { submitScore, fetchLeaderboard, LeaderboardResult } from "@/utils/leaderboard";
import { getUser } from "@/utils/userStorage";

// ── Helpers ───────────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const start = performance.now();
    let raf: number;
    const step = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3); // ease-out cubic
      setValue(Math.floor(ease * target));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function rankColor(rank: number): TextStyle {
  if (rank === 1) return { color: "#FFD700" };
  if (rank === 2) return { color: "#C0C0C0" };
  if (rank === 3) return { color: "#CD7F32" };
  return {};
}

// ── Share logic ───────────────────────────────────────────────────────────────

function buildShareText(score: number, level: number, username: string, rank: number | null) {
  const rankLine = rank ? `🌍 Ranked ${ordinal(rank)} WORLDWIDE` : `🌍 Level ${level} reached`;
  return (
    `💀 I ate ${score.toLocaleString()} BRAINS as @${username} in MORE BRAINS!\n` +
    `${rankLine}\n` +
    `Can you beat me? 👊\n` +
    `#ReturnOfTheLivingDead #TheBrainHunter #RTLD`
  );
}

// Captures the card and saves it to the camera roll (native) or triggers a
// file download (web). Returns true on success.
async function captureAndSaveImage(
  viewRef: React.RefObject<View>,
  onSaved: () => void,
): Promise<void> {
  try {
    const uri = await captureRef(viewRef, { format: "png", quality: 1 });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const a = document.createElement("a");
      a.href = uri;
      a.download = "more-brains-score.png";
      a.click();
      onSaved();
    } else {
      // Lazy require keeps the native module out of the web bundle evaluation path
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ML = require("expo-media-library");
      const { status } = await ML.requestPermissionsAsync();
      if (status === "granted") {
        await ML.saveToLibraryAsync(uri);
        onSaved();
      }
    }
  } catch (e) {
    console.warn("[Save] Image save failed:", e);
  }
}

// Captures the card view and opens the native share sheet with the image.
// On web, falls back to Web Share API (mobile browsers) or image download.
async function captureAndShareImage(viewRef: React.RefObject<View>): Promise<void> {
  try {
    const uri = await captureRef(viewRef, { format: "png", quality: 1 });

    if (Platform.OS === "web" && typeof window !== "undefined") {
      // Try Web Share API with file (works on mobile Chrome/Safari)
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          const res = await fetch(uri);
          const blob = await res.blob();
          const file = new File([blob], "more-brains-score.png", { type: "image/png" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title: "More Brains — My Score" });
            return;
          }
        } catch { /* fall through to download */ }
      }
      // Fallback: trigger image download
      const a = document.createElement("a");
      a.href = uri;
      a.download = "more-brains-score.png";
      a.click();
    } else {
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          mimeType: "image/png",
          dialogTitle: "Share your More Brains score",
        });
      }
    }
  } catch (e) {
    console.warn("[Share] Image capture failed:", e);
  }
}

// ── Share Card ────────────────────────────────────────────────────────────────

const SHARE_CARD_BG = require("../assets/images/share_card_bg.png");

interface ShareCardProps {
  score: number;
  level: number;
  username: string;
  rank: number | null;
  isMock: boolean;
  cardRef: React.RefObject<View>;
}

function ShareCard({ score, level, username, cardRef }: ShareCardProps) {
  const { width } = useWindowDimensions();
  // Full screen width; negate the parent's 16px horizontal padding on each side
  const cardSize = width;

  return (
    <View
      ref={cardRef}
      style={[card.wrapper, { width: cardSize, height: cardSize, marginHorizontal: -16 }]}
      collapsable={false}
    >
      <ExpoImage source={SHARE_CARD_BG} style={StyleSheet.absoluteFillObject} contentFit="cover" />
      <View style={card.infoPanel}>
        <View style={card.infoRow}>
          <Text style={card.infoLabel}>PLAYER NAME:</Text>
          <View style={card.infoValueBox}>
            <Text style={card.infoValue} numberOfLines={1}>{username}</Text>
          </View>
        </View>
        <View style={card.infoRow}>
          <Text style={card.infoLabel}>SCORE:</Text>
          <View style={card.infoValueBox}>
            <Text style={card.infoValue} numberOfLines={1}>{score.toLocaleString()} pts · Level {level}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

// ── Share Buttons ─────────────────────────────────────────────────────────────

interface ShareButtonsProps {
  shareText: string;
  cardRef: React.RefObject<View>;
}

function ShareButtons({ shareText, cardRef }: ShareButtonsProps) {
  const [saved, setSaved]     = useState(false);
  const [sharing, setSharing] = useState(false);
  const [saving, setSaving]   = useState(false);

  const handleShareImage = async () => {
    if (sharing) return;
    setSharing(true);
    await captureAndShareImage(cardRef);
    setSharing(false);
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    await captureAndSaveImage(cardRef, () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
    setSaving(false);
  };

  return (
    <View style={sb.row}>

      {/* X / Twitter */}
      <Pressable
        style={({ pressed }) => [sb.btn, { backgroundColor: "#000", borderColor: "#333" }, pressed && sb.btnPressed]}
        onPress={handleShareImage}
        disabled={sharing}
      >
        <FontAwesome6 name="x-twitter" size={18} color="#ffffff" brand />
        <Text style={[sb.label, { color: "#ffffff" }]}>X</Text>
      </Pressable>

      {/* Instagram */}
      <Pressable
        style={({ pressed }) => [sb.btn, { backgroundColor: "#1a0a2e", borderColor: "#c13584" }, pressed && sb.btnPressed]}
        onPress={handleShareImage}
        disabled={sharing}
      >
        <FontAwesome5 name="instagram" size={18} color="#e1306c" brand />
        <Text style={[sb.label, { color: "#e1306c" }]}>IG</Text>
      </Pressable>

      {/* TikTok */}
      <Pressable
        style={({ pressed }) => [sb.btn, { backgroundColor: "#010101", borderColor: "#69C9D0" }, pressed && sb.btnPressed]}
        onPress={handleShareImage}
        disabled={sharing}
      >
        <FontAwesome5 name="tiktok" size={18} color="#ffffff" brand />
        <Text style={[sb.label, { color: "#69C9D0" }]}>TIKTOK</Text>
      </Pressable>

      {/* Save to camera roll / download */}
      <Pressable
        style={({ pressed }) => [
          sb.btn,
          { backgroundColor: "rgba(0,40,20,0.7)", borderColor: saved ? "#00ff88" : "#005533" },
          pressed && sb.btnPressed,
        ]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator size="small" color="#00ff88" />
        ) : (
          <FontAwesome5 name={saved ? "check" : "download"} size={18} color={saved ? "#00ff88" : "#00cc66"} />
        )}
        <Text style={[sb.label, { color: saved ? "#00ff88" : "#00cc66" }]}>
          {saved ? "SAVED!" : "SAVE"}
        </Text>
      </Pressable>

    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function GameOverScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ score: string; level: string; doubled?: string; wheelPrize?: string; offlineWheel?: string }>();

  const score         = parseInt(params.score ?? "0", 10);
  const level         = parseInt(params.level ?? "1", 10);
  const doubled       = params.doubled === "true";
  const wheelPrize    = params.wheelPrize ?? "";
  const offlineWheel  = params.offlineWheel === "true";

  const [username, setUsername] = useState<string>("player");
  const [result, setResult]     = useState<LeaderboardResult | null>(null);
  const [loading, setLoading]   = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const cardRef  = useRef<View>(null);

  useEffect(() => {
    async function init() {
      const user = await getUser();
      if (user) setUsername(user.username);
      await submitScore(score, level);
      await new Promise((r) => setTimeout(r, 800));
      const res = await fetchLeaderboard(score);
      setResult(res);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    }
    init();
  }, []);

  const playerRank = result?.playerRank ?? null;
  const entries    = result?.entries ?? [];
  const isMock     = result?.isMock ?? false;
  const shareText  = buildShareText(score, level, username, playerRank);

  return (
    <View style={[styles.root, { paddingTop: insets.top || 12, paddingBottom: insets.bottom || 12 }]}>

      {/* ── Title ──────────────────────────────────────────────────────── */}
      <Text style={[styles.gameOverTitle, titleGlow]}>GAME OVER</Text>
      {doubled && (
        <View style={styles.doubledBadge}>
          <Text style={styles.doubledBadgeText}>⚡ 2× WHEEL OF FORTUNE BONUS APPLIED!</Text>
        </View>
      )}
      {!doubled && wheelPrize ? (
        <View style={styles.wheelPrizeBadge}>
          <Text style={styles.wheelPrizeBadgeText}>🎰 WHEEL PRIZE: {wheelPrize}</Text>
        </View>
      ) : null}
      {offlineWheel && (
        <View style={styles.offlineWheelBadge}>
          <Text style={styles.offlineWheelText}>📵 YOU EARNED THE WHEEL — RECONNECT TO SPIN</Text>
        </View>
      )}

      {/* ── Share Card ─────────────────────────────────────────────────── */}
      <ShareCard
        score={score}
        level={level}
        username={username}
        rank={playerRank}
        isMock={isMock}
        cardRef={cardRef}
      />

      {/* ── Share Buttons ──────────────────────────────────────────────── */}
      <ShareButtons shareText={shareText} cardRef={cardRef} />

      {/* ── Divider ────────────────────────────────────────────────────── */}
      <View style={styles.divider} />

      {/* ── Leaderboard ────────────────────────────────────────────────── */}
      <Animated.View style={[styles.boardWrap, { opacity: fadeAnim, flex: 1 }]}>

        {/* Rank + board heading */}
        <View style={styles.boardHeaderBlock}>
          {loading ? (
            <ActivityIndicator color="#cc00ff" size="small" />
          ) : playerRank ? (
            <Text style={styles.rankLine}>
              <Text style={styles.rankNum}>{ordinal(playerRank)}</Text>
              <Text style={styles.rankSuffix}> WORLDWIDE</Text>
            </Text>
          ) : null}
          <Text style={styles.boardTitle}>🌍 TOP 20 LEADERBOARD</Text>
        </View>

        {loading ? (
          <View style={styles.boardLoading}>
            <ActivityIndicator color="#cc00ff" size="large" />
          </View>
        ) : (
          <ScrollView
            style={styles.boardScroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
          >
            <View style={styles.boardHeaderRow}>
              <Text style={[styles.boardHeaderCell, { width: 34 }]}>#</Text>
              <Text style={[styles.boardHeaderCell, { flex: 1 }]}>PLAYER</Text>
              <Text style={[styles.boardHeaderCell, { width: 80, textAlign: "right" }]}>SCORE</Text>
              <Text style={[styles.boardHeaderCell, { width: 36, textAlign: "right" }]}>LVL</Text>
            </View>

            {entries.map((entry, idx) => {
              const isMe = entry.username === username;
              return (
                <View key={`${entry.username}-${idx}`} style={[styles.boardRow, isMe && styles.boardRowMe]}>
                  <Text style={[styles.boardRank, isMe && styles.boardCellMe, rankColor(entry.rank)]}>
                    {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.boardUsername, isMe && styles.boardCellMe]} numberOfLines={1}>
                      {isMe ? "▶ " : ""}{entry.username}
                    </Text>
                  </View>
                  <Text style={[styles.boardScore, isMe && styles.boardCellMe]}>
                    {entry.best_score.toLocaleString()}
                  </Text>
                  <Text style={[styles.boardLevel, isMe && styles.boardCellMe]}>
                    {entry.best_level}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>

      {/* ── Play Again ─────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.playBtn, pressed && styles.playBtnPressed]}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.playBtnText}>▶  PLAY AGAIN</Text>
      </Pressable>

      {/* ── Hub CTA ────────────────────────────────────────────────────── */}
      <Pressable
        style={({ pressed }) => [styles.hubBtn, pressed && { opacity: 0.75 }]}
        onPress={() => router.push("/hub")}
      >
        <FontAwesome5 name="th-large" size={11} color="#0a0012" solid />
        <Text style={styles.hubBtnText}>SEE MORE FROM RTLD</Text>
        <FontAwesome5 name="chevron-right" size={10} color="#0a0012" />
      </Pressable>

    </View>
  );
}

// ── Glow helpers ──────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 20px #ff2200, 0 0 40px #cc0000" }
    : { textShadowColor: "#ff2200", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 };

// ── Share Card styles ─────────────────────────────────────────────────────────

const cardGlow: ViewStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { boxShadow: "0 0 18px #39ff14, 0 0 36px rgba(0,180,0,0.4)" }
    : {};

const card = StyleSheet.create({
  wrapper: {
    alignSelf: "center",
    borderRadius: 0,
    overflow: "hidden",
    marginBottom: 10,
    justifyContent: "flex-end",
    ...cardGlow,
  } as ViewStyle,
  infoPanel: {
    backgroundColor: "rgba(80, 30, 160, 0.92)",
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: "#FFD700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    width: 88,
  },
  infoValueBox: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoValue: {
    fontSize: 11,
    color: "#1a0030",
    fontFamily: "Inter_700Bold",
  },
});

// ── Share Buttons styles ──────────────────────────────────────────────────────

const sb = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    justifyContent: "center",
    width: "100%",
    maxWidth: 420,
  },
  btn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderWidth: 1.5,
    borderRadius: 8,
    gap: 3,
  },
  btnPressed: {
    opacity: 0.7,
  },
  icon: {
    fontSize: 16,
  },
  label: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});

// ── Main styles ───────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  gameOverTitle: {
    fontSize: 24,
    color: "#ff2200",
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    marginBottom: 10,
    textAlign: "center",
  },
  divider: {
    width: "100%",
    maxWidth: 420,
    height: 1,
    backgroundColor: "#220033",
    marginBottom: 10,
  },

  // Rank + board header
  boardHeaderBlock: {
    alignItems: "center",
    marginBottom: 8,
    gap: 2,
  },
  rankLine: {
    textAlign: "center",
  },
  rankNum: {
    fontSize: 28,
    color: "#00ff88",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  rankSuffix: {
    fontSize: 11,
    color: "#00aa55",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  boardTitle: {
    fontSize: 10,
    color: "#cc00ff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },

  // Leaderboard
  boardWrap: {
    width: "100%",
    maxWidth: 420,
  },
  boardLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 30,
  },
  boardScroll: {
    flex: 1,
  },
  boardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#330044",
    marginBottom: 2,
  },
  boardHeaderCell: {
    fontSize: 8,
    color: "#553366",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  boardRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
    marginVertical: 1,
  },
  boardRowMe: {
    backgroundColor: "rgba(100, 0, 150, 0.35)",
    borderWidth: 1,
    borderColor: "#7700aa",
  },
  boardRank: {
    width: 34,
    fontSize: 11,
    color: "#886699",
    fontFamily: "Inter_700Bold",
  },
  boardUsername: {
    fontSize: 11,
    color: "#ccaadd",
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
  },
  boardScore: {
    width: 80,
    fontSize: 11,
    color: "#ccaadd",
    fontFamily: "Inter_700Bold",
    textAlign: "right",
  },
  boardLevel: {
    width: 36,
    fontSize: 10,
    color: "#886699",
    fontFamily: "Inter_400Regular",
    textAlign: "right",
  },
  boardCellMe: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
  },

  // 2× wheel bonus badge
  doubledBadge: {
    backgroundColor: "rgba(0,50,20,0.9)",
    borderWidth: 1,
    borderColor: "#39ff14",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  doubledBadgeText: {
    fontSize: 10,
    color: "#39ff14",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  wheelPrizeBadge: {
    backgroundColor: "rgba(80,0,40,0.9)",
    borderWidth: 1,
    borderColor: "#ff6600",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  wheelPrizeBadgeText: {
    fontSize: 10,
    color: "#ff9944",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  offlineWheelBadge: {
    backgroundColor: "rgba(30,0,0,0.9)",
    borderWidth: 1,
    borderColor: "#ff4444",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
    marginBottom: 8,
  },
  offlineWheelText: {
    fontSize: 9,
    color: "#ff6666",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  // Play again
  playBtn: {
    width: 260,
    alignSelf: "center",
    paddingVertical: 11,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#00ff88",
    marginTop: 10,
  },
  playBtnPressed: {
    opacity: 0.75,
  },
  playBtnText: {
    color: "#0a0012",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },

  // Hub button
  hubBtn: {
    width: 260,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 8,
    paddingVertical: 11,
    marginTop: 6,
    backgroundColor: "#cc00ff",
    borderRadius: 6,
  },
  hubBtnText: {
    fontSize: 11,
    color: "#0a0012",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
