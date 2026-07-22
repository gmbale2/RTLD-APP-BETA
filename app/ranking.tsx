import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Platform,
  TextStyle,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { fetchLeaderboard, fetchPeriodLeaderboard, LeaderboardResult } from "@/utils/leaderboard";
import { fetchCmsConfig, fetchActivePrize, ActivePrize } from "@/utils/cmsConfig";
import { getUser } from "@/utils/userStorage";

type RankMode = "period" | "alltime";

function rankColor(rank: number): TextStyle {
  if (rank === 1) return { color: "#FFD700" };
  if (rank === 2) return { color: "#C0C0C0" };
  if (rank === 3) return { color: "#CD7F32" };
  return {};
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function formatPstDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone:  "America/Los_Angeles",
    month:     "short",
    day:       "numeric",
    hour:      "numeric",
    minute:    "2-digit",
    timeZoneName: "short",
  });
}

export default function RankingScreen() {
  const insets   = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [mode, setMode]         = useState<RankMode>("period");
  const [username, setUsername] = useState<string>("");
  const [userId, setUserId]     = useState<string>("");
  const [result, setResult]     = useState<LeaderboardResult | null>(null);
  const [loading, setLoading]   = useState(true);
  const [prize, setPrize]       = useState<ActivePrize | null>(null);

  // Load user identity, CMS config and active prize once on mount
  useEffect(() => {
    getUser().then((u) => {
      if (u) { setUsername(u.username); setUserId(u.id); }
    });
    fetchCmsConfig();
    fetchActivePrize().then(setPrize);
  }, []);

  // Reload leaderboard whenever mode changes
  useEffect(() => {
    setLoading(true);
    fadeAnim.setValue(0);
    const fetch = mode === "period" ? fetchPeriodLeaderboard : fetchLeaderboard;
    fetch(0).then((res) => {
      setResult(res);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    });
  }, [mode]);

  const entries = result?.entries ?? [];
  const isMock  = result?.isMock  ?? false;
  const myRank  = result?.playerRank
    ?? entries.find((e) => e.user_id === userId || e.username === username)?.rank
    ?? null;

  const periodDeadline = useMemo(() => {
    if (!prize?.period_end) return "";
    return `Ends ${formatPstDate(prize.period_end)}`;
  }, [prize?.period_end]);

  const periodStart = useMemo(() => formatPstDate(prize?.period_start ?? null), [prize?.period_start]);
  const periodNoBoardMsg = !loading && entries.length === 0 && mode === "period" && !isMock
    ? (prize ? "No scores submitted this period yet." : "No active prize period set.")
    : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      {/* Back */}
      <Pressable style={styles.backBtn} onPress={() => router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      {/* Title */}
      <Text style={[styles.pageTitle, titleGlow]}>🏆 RANKING</Text>

      {/* Mode toggle */}
      <View style={styles.toggle}>
        <Pressable
          style={[styles.toggleBtn, mode === "period" && styles.toggleBtnActive]}
          onPress={() => setMode("period")}
        >
          <FontAwesome5 name="calendar-alt" size={9} color={mode === "period" ? "#0a0012" : "#886699"} solid />
          <Text style={[styles.toggleBtnText, mode === "period" && styles.toggleBtnTextActive]}>
            CURRENT PERIOD
          </Text>
        </Pressable>
        <Pressable
          style={[styles.toggleBtn, mode === "alltime" && styles.toggleBtnActive]}
          onPress={() => setMode("alltime")}
        >
          <FontAwesome5 name="trophy" size={9} color={mode === "alltime" ? "#0a0012" : "#886699"} solid />
          <Text style={[styles.toggleBtnText, mode === "alltime" && styles.toggleBtnTextActive]}>
            ALL TIME
          </Text>
        </Pressable>
      </View>

      {/* Prize banner — only shown when a prize is active */}
      {mode === "period" && prize && (
        <View style={styles.prizeBanner}>
          <View style={styles.prizeLeft}>
            <Text style={styles.prizeBadge}>{prize.title}</Text>
            <Text style={styles.prizeName}>{prize.description}</Text>
            {periodStart ? <Text style={styles.prizeStart}>From {periodStart}</Text> : null}
          </View>
          <View style={styles.prizeRight}>
            <Text style={styles.prizeEmoji}>🏆</Text>
            <Text style={styles.prizeDeadline}>{periodDeadline}</Text>
          </View>
        </View>
      )}

      {/* All-time honour note */}
      {mode === "alltime" && (
        <View style={styles.honourBanner}>
          <FontAwesome5 name="star" size={11} color="#FFD700" solid />
          <Text style={styles.honourText}>
            The highest score ever achieved by each player — for the glory of the undead.
          </Text>
        </View>
      )}

      {/* My rank */}
      {myRank ? (
        <View style={styles.myRankRow}>
          <FontAwesome5 name="user" size={11} color="#cc00ff" solid />
          <Text style={styles.myRankText}>
            YOUR RANK: <Text style={styles.myRankNum}>{ordinal(myRank)} WORLDWIDE</Text>
            {isMock ? "  (DEMO)" : ""}
          </Text>
        </View>
      ) : null}

      {isMock && (
        <Text style={styles.mockNote}>⚡ Demo mode — connect Supabase for live rankings</Text>
      )}

      {/* Leaderboard */}
      <Animated.View style={[styles.boardWrap, { opacity: fadeAnim, flex: 1 }]}>
        <Text style={styles.boardLabel}>
          {mode === "period" ? "🌍 TOP 20 — CURRENT PERIOD" : "🌍 TOP 20 — ALL TIME"}
        </Text>

        {loading ? (
          <View style={styles.boardLoading}>
            <ActivityIndicator color="#cc00ff" size="large" />
            <Text style={styles.loadingText}>LOADING RANKINGS…</Text>
          </View>
        ) : periodNoBoardMsg ? (
          <View style={styles.boardLoading}>
            <FontAwesome5 name="calendar-times" size={28} color="#330044" />
            <Text style={styles.emptyText}>{periodNoBoardMsg}</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, { width: 38 }]}>#</Text>
              <Text style={[styles.headerCell, { flex: 1 }]}>PLAYER</Text>
              <Text style={[styles.headerCell, { width: 90, textAlign: "right" }]}>SCORE</Text>
              <Text style={[styles.headerCell, { width: 44, textAlign: "right" }]}>LVL</Text>
            </View>

            {entries.map((entry, idx) => {
              const isMe = entry.user_id === userId || entry.username === username;
              return (
                <View key={`${entry.username}-${idx}`} style={[styles.row, isMe && styles.rowMe]}>
                  <Text style={[styles.cellRank, isMe && styles.cellMe, rankColor(entry.rank)]}>
                    {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cellUser, isMe && styles.cellMe]} numberOfLines={1}>
                      {isMe ? "▶ " : ""}{entry.username}
                    </Text>
                    {entry.display_name ? (
                      <Text style={styles.cellDisplayName} numberOfLines={1}>{entry.display_name}</Text>
                    ) : null}
                  </View>
                  <Text style={[styles.cellScore, isMe && styles.cellMe]}>
                    {entry.best_score.toLocaleString()}
                  </Text>
                  <Text style={[styles.cellLevel, isMe && styles.cellMe]}>
                    {entry.best_level}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        )}
      </Animated.View>

      {/* Play button */}
      <Pressable
        style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.75 }]}
        onPress={() => router.canGoBack() ? router.dismissAll() : router.replace("/")}
      >
        <FontAwesome5 name="skull" size={13} color="#0a0012" solid />
        <Text style={styles.playBtnText}>PLAY TO CLIMB THE RANKS</Text>
      </Pressable>

    </View>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 16px #FFD700, 0 0 30px #aa8800" }
    : { textShadowColor: "#FFD700", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
    paddingHorizontal: 16,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    marginBottom: 8,
  },
  backText: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },

  pageTitle: {
    fontSize: 22,
    color: "#FFD700",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    marginBottom: 12,
  },

  toggle: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(30,0,50,0.8)",
    borderWidth: 1,
    borderColor: "#330044",
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
    gap: 3,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
  },
  toggleBtnActive:     { backgroundColor: "#cc00ff" },
  toggleBtnText:       { fontSize: 9, color: "#886699", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  toggleBtnTextActive: { color: "#0a0012" },

  prizeBanner: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(60,40,0,0.8)",
    borderWidth: 1.5,
    borderColor: "#886600",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  prizeLeft:    { flex: 1, gap: 3 },
  prizeBadge:   { fontSize: 8, color: "#FFD700", fontFamily: "Inter_700Bold", letterSpacing: 2 },
  prizeName:    { fontSize: 14, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  prizeValue:   { fontSize: 11, color: "#FFD700", fontFamily: "Inter_700Bold" },
  prizeStart:   { fontSize: 8, color: "#665500", fontFamily: "Inter_400Regular", marginTop: 2 },
  prizeRight:   { alignItems: "center", gap: 4, paddingLeft: 12 },
  prizeEmoji:   { fontSize: 32 },
  prizeDeadline: { fontSize: 8, color: "#886600", fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 90 },

  honourBanner: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "rgba(40,30,0,0.6)",
    borderWidth: 1,
    borderColor: "#554400",
    borderRadius: 10,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  honourText: {
    flex: 1,
    fontSize: 10,
    color: "#aa8833",
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },

  myRankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  myRankText: { fontSize: 10, color: "#886699", fontFamily: "Inter_400Regular", letterSpacing: 1 },
  myRankNum:  { color: "#cc00ff", fontFamily: "Inter_700Bold" },
  mockNote:   { fontSize: 9, color: "#442233", fontFamily: "Inter_400Regular", alignSelf: "flex-start", marginBottom: 6 },

  boardWrap:  { width: "100%", maxWidth: 440 },
  boardLabel: { fontSize: 10, color: "#cc00ff", fontFamily: "Inter_700Bold", letterSpacing: 2, textAlign: "center", marginBottom: 8 },
  boardLoading: { alignItems: "center", paddingVertical: 40, gap: 10 },
  loadingText:  { fontSize: 10, color: "#553366", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  emptyText:    { fontSize: 12, color: "#553366", fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8, lineHeight: 18 },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#330044",
    marginBottom: 2,
  },
  headerCell: { fontSize: 8, color: "#553366", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 5,
    marginVertical: 1,
  },
  rowMe: {
    backgroundColor: "rgba(100,0,150,0.35)",
    borderWidth: 1,
    borderColor: "#7700aa",
  },
  cellRank:        { width: 38, fontSize: 12, color: "#886699", fontFamily: "Inter_700Bold" },
  cellUser:        { fontSize: 12, color: "#ccaadd", fontFamily: "Inter_400Regular" },
  cellDisplayName: { fontSize: 9, color: "#553366", fontFamily: "Inter_400Regular", marginTop: 1 },
  cellScore:       { width: 90, fontSize: 12, color: "#ccaadd", fontFamily: "Inter_700Bold", textAlign: "right" },
  cellLevel:       { width: 44, fontSize: 11, color: "#886699", fontFamily: "Inter_400Regular", textAlign: "right" },
  cellMe:          { color: "#ffffff", fontFamily: "Inter_700Bold" },

  playBtn: {
    width: "100%",
    maxWidth: 440,
    marginTop: 10,
    paddingVertical: 13,
    backgroundColor: "#cc00ff",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  playBtnText: { color: "#0a0012", fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 2 },
});
