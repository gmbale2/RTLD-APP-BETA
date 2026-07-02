import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import {
  requestPushPermission,
  savePushToken,
  saveNotificationPrefs,
  getNotificationPrefs,
  NotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
} from "@/utils/notifications";
import { getUser } from "@/utils/userStorage";

const PREF_ITEMS: {
  key: keyof NotificationPrefs;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
}[] = [
  {
    key:      "movie_news",
    icon:     "film",
    color:    "#cc00ff",
    title:    "Movie news & content",
    subtitle: "Trailers, behind-the-scenes, exclusive clips",
  },
  {
    key:      "merch_drops",
    icon:     "tshirt",
    color:    "#00ff88",
    title:    "Merch drops & offers",
    subtitle: "New products, limited runs, discount codes",
  },
  {
    key:      "prize_announcements",
    icon:     "trophy",
    color:    "#FFD700",
    title:    "Weekly prize announcements",
    subtitle: "Know when a new prize goes live",
  },
  {
    key:      "leaderboard_alerts",
    icon:     "crown",
    color:    "#ff6600",
    title:    "Leaderboard alerts",
    subtitle: "Someone just knocked you off #1",
  },
  {
    key:      "team_announcements",
    icon:     "bullhorn",
    color:    "#39ff14",
    title:    "RTLD team announcements",
    subtitle: "Direct messages from the crew",
  },
];

function Toggle({ value, onToggle, color }: { value: boolean; onToggle: () => void; color: string }) {
  return (
    <Pressable
      onPress={onToggle}
      style={[styles.toggle, value && { backgroundColor: color, borderColor: color }]}
      hitSlop={8}
    >
      <View style={[styles.thumb, value && styles.thumbOn]} />
    </Pressable>
  );
}

export default function NotificationsScreen() {
  const insets   = useSafeAreaInsets();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const fromSettings = from === "settings";

  const [prefs, setPrefs]       = useState<NotificationPrefs>({ ...DEFAULT_NOTIFICATION_PREFS });
  const [loading, setLoading]   = useState(false);
  const [loadingPrefs, setLoadingPrefs] = useState(fromSettings);
  const [saved, setSaved]       = useState(false);

  // When opened from settings, load the user's current saved prefs
  useEffect(() => {
    if (!fromSettings) return;
    getUser().then(async (user) => {
      if (user?.id) {
        const stored = await getNotificationPrefs(user.id);
        setPrefs(stored);
      }
      setLoadingPrefs(false);
    });
  }, [fromSettings]);

  const togglePref = (key: keyof NotificationPrefs) => {
    setSaved(false);
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
  };

  const anyEnabled = Object.values(prefs).some(Boolean);

  // ── First-registration flow ────────────────────────────────────────────────
  const proceed = () => router.replace("/");

  const handleEnable = async () => {
    setLoading(true);
    try {
      const user  = await getUser();
      const token = await requestPushPermission();
      if (token && user?.id) await savePushToken(token, user.id);
      if (user?.id) await saveNotificationPrefs(user.id, prefs, true);
    } catch (e) {
      console.warn("[Notifications] Enable failed:", e);
    } finally {
      setLoading(false);
      proceed();
    }
  };

  const handleSkip = async () => {
    try {
      const user = await getUser();
      if (user?.id) saveNotificationPrefs(user.id, prefs, false); // fire-and-forget
    } catch {}
    proceed();
  };

  // ── Settings flow ──────────────────────────────────────────────────────────
  const handleSaveFromSettings = async () => {
    setLoading(true);
    try {
      const user = await getUser();
      if (user?.id) {
        await saveNotificationPrefs(user.id, prefs, anyEnabled);
      }
      setSaved(true);
    } catch (e) {
      console.warn("[Notifications] Save failed:", e);
    } finally {
      setLoading(false);
    }
  };

  if (loadingPrefs) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color="#cc00ff" />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 }]}>

      {/* Back button (settings mode only) */}
      {fromSettings ? (
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={12} color="#664477" />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>
      ) : null}

      {/* Bell */}
      <View style={styles.iconRing}>
        <FontAwesome5 name="bell" size={32} color="#cc00ff" solid />
      </View>

      <Text style={[styles.title, titleGlow]}>
        {fromSettings ? "NOTIFICATION CENTER" : "STAY IN THE LOOP"}
      </Text>
      <Text style={styles.subtitle}>RETURN OF THE LIVING DEAD</Text>

      <View style={styles.divider} />

      <Text style={styles.body}>
        Choose what you want to hear about. Toggle off anything you don't need.
      </Text>

      {/* Pref toggles */}
      <ScrollView
        style={styles.listWrap}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {PREF_ITEMS.map((item) => (
          <Pressable
            key={item.key}
            style={styles.prefRow}
            onPress={() => togglePref(item.key)}
          >
            <View style={[styles.prefIcon, { borderColor: item.color }]}>
              <FontAwesome5 name={item.icon} size={13} color={item.color} solid />
            </View>
            <View style={styles.prefText}>
              <Text style={styles.prefTitle}>{item.title}</Text>
              <Text style={styles.prefSub}>{item.subtitle}</Text>
            </View>
            <Toggle
              value={prefs[item.key]}
              onToggle={() => togglePref(item.key)}
              color={item.color}
            />
          </Pressable>
        ))}
      </ScrollView>

      {fromSettings ? (
        /* Settings mode: save-only button */
        <Pressable
          style={({ pressed }) => [
            styles.enableBtn,
            saved && styles.enableBtnSaved,
            pressed && { opacity: 0.8 },
          ]}
          onPress={handleSaveFromSettings}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#0a0012" />
          ) : (
            <>
              <FontAwesome5 name={saved ? "check" : "save"} size={14} color="#0a0012" solid />
              <Text style={styles.enableBtnText}>
                {saved ? "PREFERENCES SAVED" : "SAVE PREFERENCES"}
              </Text>
            </>
          )}
        </Pressable>
      ) : (
        /* First-registration mode: enable + skip */
        <>
          <Pressable
            style={({ pressed }) => [
              styles.enableBtn,
              !anyEnabled && styles.enableBtnDim,
              pressed && { opacity: 0.8 },
            ]}
            onPress={handleEnable}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0a0012" />
            ) : (
              <>
                <FontAwesome5 name="bell" size={14} color="#0a0012" solid />
                <Text style={styles.enableBtnText}>
                  {anyEnabled ? "TURN ON NOTIFICATIONS" : "CONTINUE WITHOUT NOTIFICATIONS"}
                </Text>
              </>
            )}
          </Pressable>

          <Pressable style={styles.skipBtn} onPress={handleSkip} disabled={loading}>
            <Text style={styles.skipText}>Maybe later</Text>
          </Pressable>
        </>
      )}

      <Text style={styles.legal}>
        You can change these anytime in your device Settings.{"\n"}
        We never sell your data.
      </Text>

    </View>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 12px rgba(255,0,255,0.6), 0 0 24px rgba(180,0,220,0.4)" }
    : { textShadowColor: "#ff00ff", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
    paddingHorizontal: 24,
  },

  iconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: "#440066",
    backgroundColor: "rgba(60,0,90,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },

  title: {
    fontSize: 20,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 10,
    color: "#cc00ff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 4,
  },

  divider: {
    width: "60%",
    height: 1,
    backgroundColor: "#220033",
    marginVertical: 16,
  },

  body: {
    fontSize: 12,
    color: "#9977bb",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 16,
    maxWidth: 320,
  },

  listWrap: { width: "100%", maxWidth: 400 },
  list:     { gap: 6, paddingBottom: 8 },

  prefRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(30,0,50,0.7)",
    borderWidth: 1,
    borderColor: "#220033",
    borderRadius: 10,
    padding: 12,
  },

  prefIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    backgroundColor: "rgba(20,0,35,0.8)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  prefText: { flex: 1 },
  prefTitle: {
    fontSize: 12,
    color: "#ddbbee",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  prefSub: {
    fontSize: 9,
    color: "#553366",
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 13,
  },

  // Toggle switch
  toggle: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#1a0028",
    borderWidth: 1.5,
    borderColor: "#440066",
    justifyContent: "center",
    paddingHorizontal: 3,
    flexShrink: 0,
  },
  thumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#553366",
    alignSelf: "flex-start",
  },
  thumbOn: {
    backgroundColor: "#ffffff",
    alignSelf: "flex-end",
  },

  enableBtn: {
    width: "100%",
    maxWidth: 400,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    borderRadius: 6,
    backgroundColor: "#cc00ff",
    marginTop: 12,
    marginBottom: 10,
  },
  enableBtnDim: {
    backgroundColor: "#440066",
  },
  enableBtnText: {
    fontSize: 12,
    color: "#0a0012",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },

  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  backText: {
    fontSize: 10,
    color: "#664477",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  enableBtnSaved: {
    backgroundColor: "#00cc66",
  },
  skipBtn:  { paddingVertical: 8, marginBottom: 12 },
  skipText: {
    fontSize: 12,
    color: "#553366",
    fontFamily: "Inter_400Regular",
    textDecorationLine: "underline",
  },

  legal: {
    fontSize: 9,
    color: "#332244",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
});
