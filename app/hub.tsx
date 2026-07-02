/**
 * hub.tsx  —  Central RTLD Directory
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  TextStyle,
  ScrollView,
  Image,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { fetchCollectionProducts } from "@/utils/shopify";

const RTLD_LOGO = require("../assets/images/rtld_logo_cropped.png");

// ── Section data ──────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key: "game",
    image: require("../assets/images/hub_game.png"),
    contentPosition: { top: "15%", left: "50%" },
    label: "PLAY THE GAME",
    sub: "MORE BRAINS",
    desc: "Eat brains. Avoid punks. Beat your high score.",
    accentColor: "#cc00ff",
    route: "/" as const,
  },
  {
    key: "ranking",
    image: require("../assets/images/hub_ranking.jpg"),
    contentPosition: { top: "20%", left: "35%" },
    label: "LEADERBOARD",
    sub: "WORLDWIDE LEADERBOARD",
    desc: "Top 20 players worldwide. Weekly prize for #1.",
    accentColor: "#FFD700",
    route: "/ranking" as const,
  },
  {
    key: "store",
    image: require("../assets/images/hub_store.jpg"),
    contentPosition: { top: "5%", left: "80%" },
    label: "OFFICIAL RTLD STORE",
    sub: "RTLD MERCH",
    desc: "Official tees, posters & collectibles.",
    accentColor: "#00ff88",
    route: "/store" as const,
  },
  {
    key: "exclusive",
    image: require("../assets/images/hub_updates.avif"),
    contentPosition: { top: "50%", left: "50%" },
    label: "EXCLUSIVE UPDATES",
    sub: "APP-ONLY CONTENT",
    desc: "Content only available to More Brains members.",
    accentColor: "#ff2222",
    route: "/exclusive" as const,
  },
  {
    key: "updates",
    image: { uri: "https://returnofthelivingdead.com/cdn/shop/articles/GM_MP26_Blog.jpg?v=1780015342&width=800" },
    contentPosition: { top: "50%", left: "50%" },
    label: "TARMAN TODAY",
    sub: "NEWS & TRAILERS",
    desc: "Latest RTLD news, trailers & behind-the-scenes.",
    accentColor: "#39ff14",
    route: "/updates" as const,
  },
  {
    key: "filmopps",
    image: require("../assets/images/hub_updates.jpg"),
    contentPosition: { top: "50%", left: "50%" },
    label: "NEW FILM EXCLUSIVES",
    sub: "NEW MOVIE OPPORTUNITIES",
    desc: "Exclusive film opportunities for More Brains members.",
    accentColor: "#FFD700",
    route: "/filmopps" as const,
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HubScreen() {
  const insets = useSafeAreaInsets();
  const [filmThumb, setFilmThumb] = useState<string | null>(null);

  useEffect(() => {
    fetchCollectionProducts("new-movie-opportunities", 1).then((products) => {
      if (products[0]?.imageUrl) setFilmThumb(products[0].imageUrl);
    });
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      {/* Top bar: back left, settings right */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/")}>
          <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>
        <Pressable style={styles.settingsBtn} onPress={() => router.push("/settings")}>
          <FontAwesome5 name="cog" size={20} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>

      {/* Header */}
      <Image source={RTLD_LOGO} style={styles.logo} resizeMode="contain" />
      <Text style={[styles.title, titleGlow]}>RETURN OF THE LIVING DEAD</Text>
      <Text style={styles.subtitle}>OFFICIAL FAN APP</Text>

      <View style={styles.divider} />

      {/* Section cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.cardList}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((s) => (
          <Pressable
            key={s.key}
            style={({ pressed }) => [styles.cardWrap, pressed && styles.cardPressed]}
            onPress={() => router.replace(s.route)}
          >
            <ExpoImage
              source={s.key === "filmopps" && filmThumb ? { uri: filmThumb } : s.image}
              contentFit="cover"
              contentPosition={s.contentPosition}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Dark overlay */}
            <View style={styles.cardOverlay} />

            {/* Accent bar at top */}
            <View style={[styles.cardAccentBar, { backgroundColor: s.accentColor }]} />

            {/* Text content pinned to bottom */}
            <View style={[styles.cardContent, { borderTopColor: s.accentColor + "55" }]}>
              <View style={styles.cardTextBlock}>
                <Text style={[styles.cardLabel, { color: s.accentColor }]}>{s.label}</Text>
              </View>
              <View style={[styles.cardArrow, { borderColor: s.accentColor }]}>
                <FontAwesome5 name="chevron-right" size={11} color={s.accentColor} />
              </View>
            </View>
          </Pressable>
        ))}

        {/* Scroll hint — tells user the list continues */}
        <View style={styles.scrollHint}>
          <FontAwesome5 name="chevron-down" size={9} color="rgba(255,255,255,0.18)" />
          <FontAwesome5 name="chevron-down" size={9} color="rgba(255,255,255,0.10)" />
        </View>
      </ScrollView>

    </View>
  );
}

// ── Glow ──────────────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 12px rgba(255,0,255,0.5)" }
    : { textShadowColor: "#ff00ff", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 };

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  settingsBtn: {
    padding: 4,
  },
  backText: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  logo: {
    width: 200,
    height: 60,
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 9,
    color: "#664477",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 2,
  },
  divider: {
    width: "80%",
    height: 1,
    backgroundColor: "#220033",
    marginVertical: 14,
  },
  scroll: { flex: 1, width: "100%" },
  cardList: {
    gap: 14,
    paddingBottom: 16,
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },

  // ── Card ──────────────────────────────────────────────────────────────────
  cardWrap: {
    width: "100%",
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  cardPressed: { opacity: 0.8 },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,0,15,0.22)",
  },
  cardAccentBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 11,
    paddingTop: 11,
    backgroundColor: "rgba(0,0,0,0.72)",
    borderTopWidth: 1,
  },
  cardTextBlock: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  cardSub: {
    fontSize: 8,
    color: "#cccccc",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  cardDesc: {
    fontSize: 10,
    color: "#bbbbbb",
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
    marginTop: 2,
  },
  cardArrow: {
    width: 28,
    height: 28,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
    flexShrink: 0,
  },
  scrollHint: {
    alignItems: "center",
    paddingVertical: 6,
    gap: 2,
  },
});
