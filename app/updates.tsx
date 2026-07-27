import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextStyle,
  ActivityIndicator,
  Linking,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { supabase } from "@/utils/supabase";

interface ContentPost {
  id: string;
  title: string;
  body: string | null;
  vimeo_url: string | null;
  published_at: string;
}

function extractVimeoId(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day:   "numeric",
    year:  "numeric",
  });
}

export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts]   = useState<ContentPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase
      .from("content_posts")
      .select("id, title, body, vimeo_url, published_at")
      .eq("section", "movie_updates")
      .eq("status", "published")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        if (data) setPosts(data as ContentPost[]);
        setLoading(false);
      });
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      <Pressable style={styles.backBtn} onPress={() => router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      <Text style={[styles.pageTitle, titleGlow]}>TARMAN TODAY</Text>
      <Text style={styles.pageSubtitle}>NEWS, TRAILERS & EXCLUSIVES</Text>

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
          posts.map((post) => {
            const vimeoId  = extractVimeoId(post.vimeo_url);
            const thumbUri = vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null;

            return (
              <Pressable
                key={post.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => {
                  if (post.vimeo_url) Linking.openURL(post.vimeo_url);
                }}
              >
                {/* Hero */}
                <View style={styles.heroArea}>
                  {thumbUri ? (
                    <>
                      <ExpoImage
                        source={{ uri: thumbUri }}
                        contentFit="cover"
                        style={StyleSheet.absoluteFillObject}
                      />
                      <View style={styles.heroGradient} />
                    </>
                  ) : (
                    <View style={styles.heroFallback}>
                      <Text style={styles.heroEmoji}>🎬</Text>
                    </View>
                  )}
                  {post.vimeo_url && (
                    <View style={styles.playOverlay}>
                      <FontAwesome5 name="play-circle" size={40} color="rgba(255,255,255,0.9)" solid />
                    </View>
                  )}
                </View>

                {/* Body */}
                <View style={styles.cardBody}>
                  <Text style={styles.postDate}>{formatDate(post.published_at)}</Text>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  {!!post.body && (
                    <Text style={styles.postExcerpt} numberOfLines={3}>{post.body}</Text>
                  )}
                  {post.vimeo_url && (
                    <View style={styles.readMoreRow}>
                      <Text style={styles.readMoreText}>WATCH NOW</Text>
                      <FontAwesome5 name="play" size={9} color="#39ff14" />
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })
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
  backText:     { fontSize: 10, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 2 },
  pageTitle:    { fontSize: 22, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 3, marginBottom: 2 },
  pageSubtitle: { fontSize: 9, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 2, marginBottom: 12, opacity: 0.6 },
  scroll:       { flex: 1, width: "100%" },
  postsList:    { gap: 14, maxWidth: 440, alignSelf: "center", width: "100%", paddingBottom: 8 },
  centerState:  { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyEmoji:   { fontSize: 36 },
  stateText:    { fontSize: 10, color: "#99cc66", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  card:         { width: "100%", backgroundColor: "rgba(5,20,0,0.9)", borderWidth: 1.5, borderColor: "#1a2200", borderRadius: 12, overflow: "hidden" },
  cardPressed:  { opacity: 0.75 },
  heroArea:     { width: "100%", height: 170, backgroundColor: "#020a00", overflow: "hidden" },
  heroGradient: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.25)" },
  heroFallback: { flex: 1, alignItems: "center", justifyContent: "center" },
  heroEmoji:    { fontSize: 48 },
  playOverlay:  { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  cardBody:     { padding: 14, gap: 5 },
  postDate:     { fontSize: 9, color: "#39ff14", fontFamily: "Inter_400Regular", letterSpacing: 1 },
  postTitle:    { fontSize: 14, color: "#ccffcc", fontFamily: "Inter_700Bold", lineHeight: 20 },
  postExcerpt:  { fontSize: 11, color: "#99cc88", fontFamily: "Inter_400Regular", lineHeight: 17 },
  readMoreRow:  { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  readMoreText: { fontSize: 9, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});
