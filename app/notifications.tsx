/**
 * notifications.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Push notification opt-in screen.
 * Shown once after registration. User can skip; they can re-enable later
 * from device Settings.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  TextStyle,
  ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { requestPushPermission, savePushToken, getNotificationStatus } from "@/utils/notifications";
import { getUser } from "@/utils/userStorage";

// ── Benefit rows ──────────────────────────────────────────────────────────────

const BENEFITS = [
  { icon: "film",          color: "#cc00ff", text: "Movie news & content updates" },
  { icon: "tshirt",        color: "#00ff88", text: "Merch drops & exclusive offers" },
  { icon: "trophy",        color: "#FFD700", text: "New weekly prize announcements" },
  { icon: "crown",         color: "#ff6600", text: "Alert when someone steals #1 on the leaderboard" },
  { icon: "bullhorn",      color: "#39ff14", text: "Custom announcements from the RTLD team" },
] as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const proceed = () => router.replace("/");

  const handleEnable = async () => {
    setLoading(true);
    try {
      const token = await requestPushPermission();
      if (token) {
        const user = await getUser();
        await savePushToken(token, user?.username);
      }
    } catch (e) {
      console.warn("[Notifications] Permission request failed:", e);
    } finally {
      setLoading(false);
      proceed();
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>

      {/* Bell icon */}
      <View style={styles.iconRing}>
        <FontAwesome5 name="bell" size={36} color="#cc00ff" solid />
      </View>

      {/* Heading */}
      <Text style={[styles.title, titleGlow]}>STAY IN THE LOOP</Text>
      <Text style={styles.subtitle}>RETURN OF THE LIVING DEAD</Text>

      <View style={styles.divider} />

      <Text style={styles.body}>
        Turn on notifications and be the first dead to know when something big drops.
      </Text>

      {/* Benefit list */}
      <View style={styles.benefits}>
        {BENEFITS.map((b) => (
          <View key={b.icon} style={styles.benefitRow}>
            <View style={[styles.benefitIcon, { borderColor: b.color }]}>
              <FontAwesome5 name={b.icon} size={14} color={b.color} solid />
            </View>
            <Text style={styles.benefitText}>{b.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.spacer} />

      {/* Enable button */}
      <Pressable
        style={({ pressed }) => [styles.enableBtn, pressed && styles.enableBtnPressed]}
        onPress={handleEnable}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0a0012" />
        ) : (
          <>
            <FontAwesome5 name="bell" size={14} color="#0a0012" solid />
            <Text style={styles.enableBtnText}>TURN ON NOTIFICATIONS</Text>
          </>
        )}
      </Pressable>

      {/* Skip */}
      <Pressable style={styles.skipBtn} onPress={proceed} disabled={loading}>
        <Text style={styles.skipText}>Maybe later</Text>
      </Pressable>

      <Text style={styles.legal}>
        You can change this anytime in your device Settings.{"\n"}
        We never sell your data.
      </Text>

    </View>
  );
}

// ── Glow ──────────────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 12px rgba(255,0,255,0.6), 0 0 24px rgba(180,0,220,0.4)" }
    : { textShadowColor: "#ff00ff", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 };

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
    paddingHorizontal: 28,
  },

  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "#440066",
    backgroundColor: "rgba(60,0,90,0.5)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 22,
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
    marginVertical: 20,
  },

  body: {
    fontSize: 13,
    color: "#9977bb",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 320,
  },

  benefits: {
    width: "100%",
    maxWidth: 360,
    gap: 12,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: "rgba(30,0,50,0.8)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  benefitText: {
    flex: 1,
    fontSize: 12,
    color: "#ccaadd",
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },

  spacer: { flex: 1 },

  enableBtn: {
    width: "100%",
    maxWidth: 340,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 15,
    borderRadius: 6,
    backgroundColor: "#cc00ff",
    marginBottom: 12,
  },
  enableBtnPressed: {
    opacity: 0.8,
  },
  enableBtnText: {
    fontSize: 13,
    color: "#0a0012",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },

  skipBtn: {
    paddingVertical: 10,
    marginBottom: 16,
  },
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
