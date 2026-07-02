import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Modal,
  Platform,
  TextStyle,
  useWindowDimensions,
  ActivityIndicator,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

interface VimeoVideo {
  id: string;
  title: string;
}

interface VimeoMeta {
  title: string;
  thumbnailUrl: string;
  duration: number;
}

const VIDEOS: VimeoVideo[] = [
  { id: "1206484012", title: "RETURN OF THE LIVING DEAD" },
];

async function fetchVimeoMeta(id: string): Promise<VimeoMeta | null> {
  try {
    const res = await fetch(
      `https://vimeo.com/api/oembed.json?url=https://vimeo.com/${id}&width=640`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      title: data.title ?? "",
      thumbnailUrl: data.thumbnail_url ?? "",
      duration: data.duration ?? 0,
    };
  } catch {
    return null;
  }
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface VimeoModalProps {
  videoId: string | null;
  onClose: () => void;
}

function VimeoModal({ videoId, onClose }: VimeoModalProps) {
  const { width, height } = useWindowDimensions();
  const isPortrait = height > width;

  if (!videoId) return null;

  const src = `https://player.vimeo.com/video/${videoId}?autoplay=1&muted=0&playsinline=0`;

  return (
    <Modal
      visible={!!videoId}
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={modalStyles.root}>
        <Pressable style={modalStyles.closeBtn} onPress={onClose} hitSlop={12}>
          <FontAwesome5 name="times" size={20} color="#ffffff" />
        </Pressable>

        {isPortrait && (
          <View style={modalStyles.rotateHint}>
            <FontAwesome5 name="mobile-alt" size={14} color="#ff2222" />
            <Text style={modalStyles.rotateText}>ROTATE FOR FULL SCREEN</Text>
          </View>
        )}

        <View style={[modalStyles.playerWrap, { width, height }]}>
          {Platform.OS === "web" ? (
            <iframe
              src={src}
              allow="autoplay; fullscreen; picture-in-picture"
              style={{ width: "100%", height: "100%", border: "none" }}
              title="Vimeo Player"
            />
          ) : (
            // React Native WebView — the host app must have react-native-webview installed
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            (() => {
              const { WebView } = require("react-native-webview");
              return (
                <WebView
                  source={{ uri: src }}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback={false}
                  mediaPlaybackRequiresUserAction={false}
                  style={StyleSheet.absoluteFillObject}
                />
              );
            })()
          )}
        </View>
      </View>
    </Modal>
  );
}

export default function ExclusiveScreen() {
  const insets = useSafeAreaInsets();
  const [metas, setMetas] = useState<Record<string, VimeoMeta | null>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    Promise.all(
      VIDEOS.map(async (v) => {
        const meta = await fetchVimeoMeta(v.id);
        setMetas((prev) => ({ ...prev, [v.id]: meta }));
      })
    );
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      <Text style={[styles.pageTitle, titleGlow]}>🔴 MOVIE UPDATES</Text>
      <Text style={styles.pageSubtitle}>EXCLUSIVE APP-ONLY CONTENT</Text>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.videoList}
      >
        {VIDEOS.map((video) => {
          const meta = metas[video.id];
          const loaded = video.id in metas;

          return (
            <Pressable
              key={video.id}
              style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
              onPress={() => setActiveId(video.id)}
            >
              <View style={styles.thumbArea}>
                {!loaded ? (
                  <View style={styles.thumbPlaceholder}>
                    <ActivityIndicator color="#ff2222" />
                  </View>
                ) : meta?.thumbnailUrl ? (
                  <>
                    <ExpoImage
                      source={{ uri: meta.thumbnailUrl }}
                      contentFit="cover"
                      style={StyleSheet.absoluteFillObject}
                    />
                    <View style={styles.thumbOverlay} />
                  </>
                ) : (
                  <View style={styles.thumbPlaceholder} />
                )}

                <View style={styles.playBtn}>
                  <FontAwesome5 name="play-circle" size={48} color="rgba(255,255,255,0.92)" solid />
                </View>

                {meta && meta.duration > 0 && (
                  <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{formatDuration(meta.duration)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardBody}>
                <Text style={styles.videoTitle}>{meta?.title || video.title}</Text>
                <View style={styles.watchRow}>
                  <Text style={styles.watchText}>WATCH NOW</Text>
                  <FontAwesome5 name="play" size={8} color="#ff2222" />
                </View>
              </View>
            </Pressable>
          );
        })}

        <View style={{ height: 8 }} />
      </ScrollView>

      <VimeoModal videoId={activeId} onClose={() => setActiveId(null)} />
    </View>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 16px #ff2222, 0 0 30px #880000" }
    : { textShadowColor: "#ff2222", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 };

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
  backText:    { fontSize: 10, color: "#ffffff", fontFamily: "Inter_700Bold", letterSpacing: 2 },
  pageTitle:   { fontSize: 20, color: "#ff2222", fontFamily: "Inter_700Bold", letterSpacing: 2, textAlign: "center", marginBottom: 2 },
  pageSubtitle:{ fontSize: 9, color: "#550000", fontFamily: "Inter_700Bold", letterSpacing: 3, marginBottom: 16 },
  scroll:      { flex: 1, width: "100%" },
  videoList:   { gap: 16, maxWidth: 440, alignSelf: "center", width: "100%", paddingBottom: 8 },
  card:        { width: "100%", backgroundColor: "rgba(20,0,30,0.9)", borderWidth: 1.5, borderColor: "#2a0022", borderRadius: 12, overflow: "hidden" },
  cardPressed: { opacity: 0.75 },
  thumbArea:   { width: "100%", aspectRatio: 16 / 9, backgroundColor: "#120012", overflow: "hidden" },
  thumbPlaceholder: { flex: 1, backgroundColor: "#180018", alignItems: "center", justifyContent: "center" },
  thumbOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
  playBtn:     { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  durationBadge: { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.75)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  durationText:{ fontSize: 10, color: "#ffffff", fontFamily: "Inter_700Bold" },
  cardBody:    { padding: 12, gap: 6 },
  videoTitle:  { fontSize: 14, color: "#ffcccc", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  watchRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  watchText:   { fontSize: 9, color: "#ff2222", fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
});

const modalStyles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: "#000000" },
  closeBtn:   { position: "absolute", top: 48, right: 20, zIndex: 10, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, padding: 8 },
  rotateHint: { position: "absolute", bottom: 32, alignSelf: "center", zIndex: 10, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  rotateText: { fontSize: 10, color: "#ff4444", fontFamily: "Inter_700Bold", letterSpacing: 1 },
  playerWrap: { flex: 1 },
});
