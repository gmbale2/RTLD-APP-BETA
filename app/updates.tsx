import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextStyle,
  Modal,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

// ── Video catalogue — add new Vimeo IDs here as content grows ────────────────
const VIDEOS = [
  { id: "1206484012", title: "RETURN OF THE LIVING DEAD" },
];

interface VideoMeta {
  id:           string;
  title:        string;
  thumbnailUrl: string | null;
  duration:     number | null;
}

async function fetchVimeoMeta(id: string): Promise<VideoMeta> {
  try {
    const res  = await fetch(`https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}`);
    const json = await res.json();
    return {
      id,
      title:        json.title        ?? "UNTITLED",
      thumbnailUrl: json.thumbnail_url ?? null,
      duration:     json.duration      ?? null,
    };
  } catch {
    return { id, title: "UNTITLED", thumbnailUrl: null, duration: null };
  }
}

function formatDuration(secs: number | null): string {
  if (!secs) return "";
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Fullscreen Vimeo player ───────────────────────────────────────────────────
function VimeoModal({ videoId, onClose }: { videoId: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = Dimensions.get("window");
  const playerUrl = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&playsinline=0`;

  return (
    <Modal
      visible
      animationType="fade"
      supportedOrientations={["portrait", "landscape"]}
      onRequestClose={onClose}
    >
      <View style={player.root}>
        <Pressable
          style={[player.closeBtn, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={16}
        >
          <FontAwesome5 name="times" size={18} color="#ffffff" />
        </Pressable>

        {Platform.OS !== "web" && width < height && (
          <View style={player.rotateBadge}>
            <FontAwesome5 name="mobile-alt" size={12} color="#39ff14" />
            <Text style={player.rotateText}>ROTATE FOR FULL SCREEN</Text>
          </View>
        )}

        {Platform.OS === "web" ? (
          // @ts-expect-error iframe is valid on web
          <iframe
            src={playerUrl}
            style={{
              position: "absolute",
              top: 0, left: 0,
              width: "100%", height: "100%",
              border: "none",
            }}
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <View style={player.nativePlaceholder}>
            <Text style={player.nativePlaceholderText}>
              Open in browser to watch:{"\n"}vimeo.com/{videoId}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function UpdatesScreen() {
  const insets = useSafeAreaInsets();
  const [metas, setMetas]       = useState<VideoMeta[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    Promise.all(VIDEOS.map(v => fetchVimeoMeta(v.id))).then(results => {
      setMetas(results.map((m, i) => ({ ...m, title: VIDEOS[i].title || m.title })));
      setLoading(false);
    });
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      <Text style={[styles.pageTitle, titleGlow]}>TARMAN TODAY</Text>
      <Text style={styles.pageSubtitle}>TRAILERS & EXCLUSIVES</Text>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator color="#39ff14" size="large" />
            <Text style={styles.stateText}>LOADING…</Text>
          </View>
        ) : metas.length === 0 ? (
          <View style={styles.centerState}>
            <Text style={styles.emptyEmoji}>📽️</Text>
            <Text style={styles.stateText}>NO VIDEOS YET</Text>
          </View>
        ) : (
          metas.map(meta => (
            <Pressable
              key={meta.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => setActiveId(meta.id)}
            >
              <View style={styles.thumbArea}>
                {meta.thumbnailUrl ? (
                  <ExpoImage
                    source={{ uri: meta.thumbnailUrl }}
                    contentFit="cover"
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : (
                  <View style={styles.thumbFallback} />
                )}
                <View style={styles.thumbOverlay} />
                <View style={styles.playOverlay}>
                  <View style={styles.playCircle}>
                    <FontAwesome5 name="play" size={22} color="#ffffff" solid />
                  </View>
                </View>
                {meta.duration != null && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{formatDuration(meta.duration)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.videoTitle}>{meta.title}</Text>
                <View style={styles.watchRow}>
                  <FontAwesome5 name="play" size={8} color="#39ff14" />
                  <Text style={styles.watchText}>WATCH NOW</Text>
                </View>
              </View>
            </Pressable>
          ))
        )}
        <View style={{ height: 8 }} />
      </ScrollView>

      {activeId && (
        <VimeoModal videoId={activeId} onClose={() => setActiveId(null)} />
      )}
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
  backText:    { fontSize: 10, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 2 },
  pageTitle:   { fontSize: 22, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 3, marginBottom: 2 },
  pageSubtitle:{ fontSize: 9, color: "#1a4400", fontFamily: "Inter_700Bold", letterSpacing: 2, marginBottom: 12 },
  scroll:      { flex: 1, width: "100%" },
  list:        { gap: 14, maxWidth: 440, alignSelf: "center", width: "100%", paddingBottom: 8 },
  centerState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyEmoji:  { fontSize: 36 },
  stateText:   { fontSize: 10, color: "#1a4400", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  card:        { width: "100%", backgroundColor: "rgba(5,20,0,0.9)", borderWidth: 1.5, borderColor: "#1a2200", borderRadius: 12, overflow: "hidden" },
  cardPressed: { opacity: 0.75 },
  thumbArea:   { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#020a00", overflow: "hidden" },
  thumbFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0a1a0a" },
  thumbOverlay:  { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.30)" },
  playOverlay:   { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  playCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderWidth: 2, borderColor: "rgba(255,255,255,0.7)",
    alignItems: "center", justifyContent: "center",
    paddingLeft: 4,
  },
  durationBadge: {
    position: "absolute", bottom: 8, right: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  durationText: { fontSize: 10, color: "#ffffff", fontFamily: "Inter_700Bold" },
  cardBody:    { padding: 14, gap: 6 },
  videoTitle:  { fontSize: 15, color: "#ccffcc", fontFamily: "Inter_700Bold", lineHeight: 21 },
  watchRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  watchText:   { fontSize: 9, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});

const player = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000", justifyContent: "center", alignItems: "center" },
  closeBtn: {
    position: "absolute", right: 16, zIndex: 10,
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 10,
  },
  rotateBadge: {
    position: "absolute", bottom: 40,
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, borderColor: "#39ff14", zIndex: 10,
  },
  rotateText: { fontSize: 10, color: "#39ff14", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  nativePlaceholder: { alignItems: "center", justifyContent: "center", padding: 24 },
  nativePlaceholderText: { color: "#ffffff", fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 22 },
});
