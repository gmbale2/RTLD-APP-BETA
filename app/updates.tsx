import React, { useEffect, useState } from "react";
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

import { fetchBlogArticles, ShopifyArticle } from "@/utils/shopify";

const BLOG_HANDLE = "tarman-today";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const [articles, setArticles] = useState<ShopifyArticle[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetchBlogArticles(BLOG_HANDLE).then((a) => {
      setArticles(a);
      setLoading(false);
    });
  }, []);

  const posts = articles.map((a) => {
    const hasVideo = a.tags.map((t) => t.toLowerCase()).some((t) => t === "video" || t === "trailer");
    return {
      id:        a.id,
      date:      formatDate(a.publishedAt),
      title:     a.title,
      excerpt:   a.excerpt,
      heroImage: a.imageUrl ?? "",
      hasVideo,
      url:       a.url,
    };
  });

  const openLink = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      {/* Back */}
      <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      {/* Header */}
      <Text style={[styles.pageTitle, titleGlow]}>TARMAN TODAY</Text>
      <Text style={styles.pageSubtitle}>NEWS, TRAILERS & EXCLUSIVES</Text>

      {/* Posts */}
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.postsList}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#39ff14" size="large" />
            <Text style={styles.stateText}>LOADING…</Text>
          </View>
        ) : posts.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyEmoji}>📭</Text>
            <Text style={styles.stateText}>NO POSTS YET</Text>
          </View>
        ) : (
          posts.map((post) => (
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
                />
                <View style={styles.heroGradient} />

                {post.hasVideo && (
                  <View style={styles.playOverlay}>
                    <FontAwesome5 name="play-circle" size={40} color="rgba(255,255,255,0.9)" solid />
                  </View>
                )}
              </View>

              {/* Card body */}
              <View style={styles.cardBody}>
                <Text style={styles.postDate}>{post.date}</Text>
                <Text style={styles.postTitle}>{post.title}</Text>
                <Text style={styles.postExcerpt} numberOfLines={3}>{post.excerpt}</Text>
                <View style={styles.readMoreRow}>
                  <Text style={styles.readMoreText}>{post.hasVideo ? "WATCH NOW" : "READ MORE"}</Text>
                  <FontAwesome5 name={post.hasVideo ? "play" : "arrow-right"} size={9} color="#39ff14" />
                </View>
              </View>
            </Pressable>
          ))
        )}

        <View style={{ height: 8 }} />
      </ScrollView>

    </View>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 16px #39ff14, 0 0 30px #0a2200" }
    : { textShadowColor: "#39ff14", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 };

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

  scroll:    { flex: 1, width: "100%" },
  postsList: { gap: 14, maxWidth: 440, alignSelf: "center", width: "100%", paddingBottom: 8 },

  centerState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyEmoji:  { fontSize: 36 },
  stateText:   { fontSize: 10, color: "#1a2200", fontFamily: "Inter_700Bold", letterSpacing: 1 },

  card:        { width: "100%", backgroundColor: "rgba(5,20,0,0.9)", borderWidth: 1.5, borderColor: "#1a2200", borderRadius: 12, overflow: "hidden" },
  cardPressed: { opacity: 0.75 },

  heroArea:     { width: "100%", height: 170, backgroundColor: "#020a00", overflow: "hidden" },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  playOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },

  cardBody:     { padding: 14, gap: 5 },
  postDate:     { fontSize: 9, color: "#2a4422", fontFamily: "Inter_400Regular", letterSpacing: 1 },
  postTitle:    { fontSize: 14, color: "#ccffcc", fontFamily: "Inter_700Bold", lineHeight: 20 },
  postExcerpt:  { fontSize: 11, color: "#446633", fontFamily: "Inter_400Regular", lineHeight: 17 },

  readMoreRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  readMoreText: { fontSize: 9, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});
