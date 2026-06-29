import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextStyle,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

// ── Types ─────────────────────────────────────────────────────────────────────

type PostCategory = "NEWS" | "TRAILER" | "BEHIND THE SCENES" | "EXCLUSIVE";

interface Post {
  id: string;
  category: PostCategory;
  categoryColor: string;
  date: string;
  title: string;
  excerpt: string;
  heroImage: string;
  hasVideo: boolean;
  url: string;
}

// ── Posts ─────────────────────────────────────────────────────────────────────

const POSTS: Post[] = [
  {
    id: "1",
    category: "NEWS",
    categoryColor: "#39ff14",
    date: "May 28, 2026",
    title: "GODMACHINE Returns with Epic Tarman Art for Monsterpalooza",
    excerpt:
      "Artist GODMACHINE has created a limited-edition Tarman poster for Monsterpalooza 2026, released exclusively through Supercool Collective at Booth #541. The holographic piece is extremely limited — don't miss it.",
    heroImage:
      "https://returnofthelivingdead.com/cdn/shop/articles/GM_MP26_Blog.jpg?v=1780015342&width=800",
    hasVideo: false,
    url: "https://returnofthelivingdead.com/blogs/tarman-today/godmachine-returns-with-epic-tarman-art-for-monserpalooza",
  },
  {
    id: "2",
    category: "NEWS",
    categoryColor: "#39ff14",
    date: "Feb 23, 2026",
    title: "New Movie 'Cold Storage' Echoes Return of the Living Dead in the Best Ways",
    excerpt:
      "StudioCanal and MGM's new horror-comedy starring Liam Neeson draws major comparisons to the 1985 classic — a deadly fungal virus, zombified victims, and the same irreverent tone that made RTLD legendary.",
    heroImage:
      "https://returnofthelivingdead.com/cdn/shop/articles/Cold_Storage_Blog_Cover.jpg?v=1771891432&width=800",
    hasVideo: false,
    url: "https://returnofthelivingdead.com/blogs/tarman-today/new-movie-cold-storage-echoes-return-of-the-living-dead-in-best-ways",
  },
  {
    id: "3",
    category: "NEWS",
    categoryColor: "#39ff14",
    date: "Feb 3, 2026",
    title: "Hasttel Toy Releases OG and Part II Tarman 4.5\" Figures",
    excerpt:
      "Hasttel Toy and Collectibles expands into officially licensed movie figures with two new Tarman releases — one from the original 1985 film and one from Part II. Both feature articulated arms, detailed prosthetics, and the OG version clutches a brain.",
    heroImage:
      "https://returnofthelivingdead.com/cdn/shop/articles/hasttel_blog_cover.jpg?v=1770143411&width=800",
    hasVideo: false,
    url: "https://returnofthelivingdead.com/blogs/tarman-today/hasttel-toys-and-collectibles-releases-og-and-part-ii-tarman-5-figures",
  },
  {
    id: "4",
    category: "EXCLUSIVE",
    categoryColor: "#ff2222",
    date: "Jan 28, 2026",
    title: "Custom Painted Special Release Tarman from Supercool Collective",
    excerpt:
      "Supercool Collective and Fettup Toys drop hand-numbered, autographed custom Tarman figures in three designs: Skeletor, Toxic, and Blood Moon. Only a handful made of each — nearly sold out at time of posting.",
    heroImage:
      "https://returnofthelivingdead.com/cdn/shop/articles/big_headz_26_blog.jpg?v=1769652164&width=800",
    hasVideo: false,
    url: "https://returnofthelivingdead.com/blogs/tarman-today/custom-painted-special-release-tarman-from-supercool",
  },
  {
    id: "5",
    category: "NEWS",
    categoryColor: "#39ff14",
    date: "Jan 27, 2026",
    title: "Pallbearer Press Releases Special Edition Tarman Skate Deck",
    excerpt:
      "An officially licensed Tarman skateboard built from 7-ply Hard Rock Durolite maple with hand-screened art by BARLOW. The deck features a black-light reactive design — built to skate or display.",
    heroImage:
      "https://returnofthelivingdead.com/cdn/shop/articles/Skate_Deck_2026_Blog_Cover.jpg?v=1769559457&width=800",
    hasVideo: false,
    url: "https://returnofthelivingdead.com/blogs/tarman-today/pallbearer-press-releases-special-edition-tarman-skate-deck",
  },
  {
    id: "6",
    category: "NEWS",
    categoryColor: "#39ff14",
    date: "Jan 5, 2026",
    title: "Tarman Origins Spotted in Stranger Things: Season 5",
    excerpt:
      "Eagle-eyed fans noticed Agent Orange barrels in Episode 8 of Stranger Things' final season — a nod to the real 2,4,5-T herbicide that inspired RTLD's fictional Trioxin. The connection between both franchises runs deeper than you think.",
    heroImage:
      "https://returnofthelivingdead.com/cdn/shop/articles/Stranger_Things_Trioxin.jpg?v=1767663390&width=800",
    hasVideo: false,
    url: "https://returnofthelivingdead.com/blogs/tarman-today/tarman-origins-spotted-in-strangers-things-season-5",
  },
];

const CATEGORY_FILTERS: (PostCategory | "ALL")[] = [
  "ALL",
  "NEWS",
  "EXCLUSIVE",
  "TRAILER",
  "BEHIND THE SCENES",
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<PostCategory | "ALL">("ALL");

  const filtered =
    activeFilter === "ALL"
      ? POSTS
      : POSTS.filter((p) => p.category === activeFilter);

  const openLink = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 },
      ]}
    >
      {/* Back */}
      <Pressable
        style={styles.backBtn}
        onPress={() =>
          router.canGoBack() ? router.back() : router.replace("/hub")
        }
      >
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      {/* Header */}
      <Text style={[styles.pageTitle, titleGlow]}>TARMAN TODAY</Text>
      <Text style={styles.pageSubtitle}>NEWS, TRAILERS & EXCLUSIVES</Text>

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {CATEGORY_FILTERS.map((cat) => {
          const isActive = cat === activeFilter;
          return (
            <Pressable
              key={cat}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setActiveFilter(cat)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  isActive && styles.filterPillTextActive,
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Posts */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.postsList}
      >
        {filtered.map((post) => (
          <Pressable
            key={post.id}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => openLink(post.url)}
          >
            {/* Hero image */}
            <View style={styles.heroArea}>
              <ExpoImage
                source={{ uri: post.heroImage }}
                contentFit="cover"
                style={StyleSheet.absoluteFillObject}
                placeholder={require("../assets/images/hub_updates.jpg")}
              />

              {/* Dark gradient overlay */}
              <View style={styles.heroGradient} />

              {/* Play button for video posts */}
              {post.hasVideo && (
                <View style={styles.playOverlay}>
                  <FontAwesome5
                    name="play-circle"
                    size={40}
                    color="rgba(255,255,255,0.9)"
                    solid
                  />
                </View>
              )}

              {/* Category chip */}
              <View
                style={[
                  styles.categoryChip,
                  {
                    borderColor: post.categoryColor,
                    backgroundColor: post.categoryColor + "22",
                  },
                ]}
              >
                <Text
                  style={[styles.categoryChipText, { color: post.categoryColor }]}
                >
                  {post.category}
                </Text>
              </View>
            </View>

            {/* Card body */}
            <View style={styles.cardBody}>
              <Text style={styles.postDate}>{post.date}</Text>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postExcerpt} numberOfLines={3}>
                {post.excerpt}
              </Text>

              <View style={styles.readMoreRow}>
                <Text style={styles.readMoreText}>
                  {post.hasVideo ? "WATCH NOW" : "READ MORE"}
                </Text>
                <FontAwesome5
                  name={post.hasVideo ? "play" : "arrow-right"}
                  size={9}
                  color="#39ff14"
                />
              </View>
            </View>
          </Pressable>
        ))}

        {filtered.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.emptyText}>NO POSTS IN THIS CATEGORY YET</Text>
          </View>
        )}

        <View style={{ height: 8 }} />
      </ScrollView>
    </View>
  );
}

// ── Glow ──────────────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 16px #39ff14, 0 0 30px #0a2200" }
    : {
        textShadowColor: "#39ff14",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 16,
      };

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#050005",
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
    color: "#39ff14",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 9,
    color: "#1a4400",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 12,
  },

  filterScroll: {
    width: "100%",
    maxHeight: 38,
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 2,
    alignItems: "center",
  },
  filterPill: {
    borderWidth: 1,
    borderColor: "#1a2200",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  filterPillActive: {
    borderColor: "#39ff14",
    backgroundColor: "rgba(57,255,20,0.12)",
  },
  filterPillText: {
    fontSize: 8,
    color: "#2a4422",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  filterPillTextActive: {
    color: "#39ff14",
  },

  scroll: {
    flex: 1,
    width: "100%",
  },
  postsList: {
    gap: 14,
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
    paddingBottom: 8,
  },

  card: {
    width: "100%",
    backgroundColor: "rgba(5,20,0,0.9)",
    borderWidth: 1.5,
    borderColor: "#1a2200",
    borderRadius: 12,
    overflow: "hidden",
  },
  cardPressed: {
    opacity: 0.75,
  },

  heroArea: {
    width: "100%",
    height: 170,
    backgroundColor: "#020a00",
    overflow: "hidden",
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryChip: {
    position: "absolute",
    bottom: 10,
    left: 10,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  categoryChipText: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  cardBody: {
    padding: 14,
    gap: 5,
  },
  postDate: {
    fontSize: 9,
    color: "#2a4422",
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
  },
  postTitle: {
    fontSize: 14,
    color: "#ccffcc",
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
  },
  postExcerpt: {
    fontSize: 11,
    color: "#446633",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },

  readMoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  readMoreText: {
    fontSize: 9,
    color: "#39ff14",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 36,
  },
  emptyText: {
    fontSize: 10,
    color: "#1a2200",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
});
