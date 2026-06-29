import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TextStyle,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

export default function ExclusiveScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16, paddingBottom: insets.bottom || 16 }]}>

      <Pressable style={styles.backBtn} onPress={() => router.canGoBack() ? router.back() : router.replace("/hub")}>
        <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
        <Text style={styles.backText}>BACK</Text>
      </Pressable>

      <Text style={[styles.pageTitle, titleGlow]}>🔴 EXCLUSIVE UPDATES</Text>
      <Text style={styles.pageSubtitle}>APP-ONLY CONTENT</Text>

      <View style={styles.comingSoon}>
        <FontAwesome5 name="lock" size={36} color="#ff2222" solid />
        <Text style={styles.comingSoonTitle}>COMING SOON</Text>
        <Text style={styles.comingSoonBody}>
          Exclusive content — trailers, behind-the-scenes footage, and announcements only available to More Brains members — will appear here.
        </Text>
      </View>

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
  backText: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  pageTitle: {
    fontSize: 20,
    color: "#ff2222",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: 2,
  },
  pageSubtitle: {
    fontSize: 9,
    color: "#550000",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    marginBottom: 40,
  },
  comingSoon: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 18,
    paddingHorizontal: 24,
  },
  comingSoonTitle: {
    fontSize: 22,
    color: "#ff2222",
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  comingSoonBody: {
    fontSize: 13,
    color: "#886688",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    textAlign: "center",
  },
});
