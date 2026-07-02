import {
  Inter_400Regular,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Boogaloo_400Regular } from "@expo-google-fonts/boogaloo";
import { FontAwesome5 } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Platform } from "react-native";

// Disable text/element selection globally on web — prevents accidental
// selection while playing the game or spinning the wheel.
// Input/textarea fields are re-enabled so typing still works normally.
if (Platform.OS === "web" && typeof document !== "undefined") {
  const s = document.createElement("style");
  s.textContent = `
    * { user-select: none !important; -webkit-user-select: none !important; }
    input, textarea { user-select: text !important; -webkit-user-select: text !important; }
  `;
  document.head.appendChild(s);
}

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index"    options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="gameover" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="hub"      options={{ headerShown: false, animation: "slide_from_bottom" }} />
      <Stack.Screen name="ranking"  options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="store"    options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="updates"  options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="article"  options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="exclusive" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="spinwheel"     options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="filmopps"      options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="settings"      options={{ headerShown: false, animation: "slide_from_right" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
    Boogaloo_400Regular,
    // Swap Boogaloo_400Regular for Gagalin_400Regular once you place
    // assets/fonts/Gagalin-Regular.ttf in the project and load it via
    // useFonts({ Gagalin_400Regular: require("../assets/fonts/Gagalin-Regular.ttf") })
    ...FontAwesome5.font,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <RootLayoutNav />
        </GestureHandlerRootView>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
