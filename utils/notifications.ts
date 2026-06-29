/**
 * notifications.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Push notification helpers:
 *   - requestPushPermission()  → asks OS for permission + returns Expo push token
 *   - savePushToken()          → stub; Phase 2 will POST token to Supabase
 *   - getNotificationStatus()  → returns current permission status without prompting
 */

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export type PushStatus = "granted" | "denied" | "undetermined" | "unsupported";

/** Returns current permission status without triggering a system prompt. */
export async function getNotificationStatus(): Promise<PushStatus> {
  if (!Device.isDevice && Platform.OS !== "web") return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status as PushStatus;
}

/**
 * Requests push notification permission from the OS.
 * On iOS this shows the system dialog (can only happen once).
 * Returns the Expo push token string if granted, or null.
 */
export async function requestPushPermission(): Promise<string | null> {
  // Physical device required for real push tokens.
  // On web we skip silently — web push is a separate flow.
  if (Platform.OS === "web") return null;

  if (!Device.isDevice) {
    console.warn("[Notifications] Push tokens only work on physical devices.");
    return null;
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;

  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") return null;

  // Android requires a notification channel
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "More Brains",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/**
 * Saves the push token for this user.
 * Phase 1: logs to console.
 * Phase 2: POST to Supabase `user_push_tokens` table.
 */
export async function savePushToken(token: string, userId?: string): Promise<void> {
  console.log("[Notifications] Push token registered:", token, "user:", userId ?? "anonymous");
  // TODO Phase 2:
  // await supabase.from("user_push_tokens").upsert({
  //   user_id: userId,
  //   token,
  //   platform: Platform.OS,
  //   updated_at: new Date().toISOString(),
  // });
}
