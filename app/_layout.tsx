import {
  Inter_400Regular,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

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
      <Stack.Screen name="updates"   options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="exclusive" options={{ headerShown: false, animation: "slide_from_right" }} />
      <Stack.Screen name="spinwheel"     options={{ headerShown: false, animation: "fade" }} />
      <Stack.Screen name="notifications" options={{ headerShown: false, animation: "fade" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_700Bold,
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
