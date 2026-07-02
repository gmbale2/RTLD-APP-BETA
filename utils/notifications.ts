import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { supabase } from "./supabase";

export type PushStatus = "granted" | "denied" | "undetermined" | "unsupported";

export interface NotificationPrefs {
  movie_news:           boolean;
  merch_drops:          boolean;
  prize_announcements:  boolean;
  leaderboard_alerts:   boolean;
  team_announcements:   boolean;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  movie_news:           true,
  merch_drops:          true,
  prize_announcements:  true,
  leaderboard_alerts:   true,
  team_announcements:   true,
};

export async function getNotificationStatus(): Promise<PushStatus> {
  if (!Device.isDevice && Platform.OS !== "web") return "unsupported";
  const { status } = await Notifications.getPermissionsAsync();
  return status as PushStatus;
}

export async function requestPushPermission(): Promise<string | null> {
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

export async function savePushToken(token: string, userId?: string): Promise<void> {
  if (!supabase || !userId) {
    console.log("[Notifications] Push token (no Supabase or userId):", token);
    return;
  }
  const { error } = await supabase.from("user_push_tokens").upsert(
    { user_id: userId, token, platform: Platform.OS, updated_at: new Date().toISOString() },
    { onConflict: "user_id,token" }
  );
  if (error) console.warn("[Notifications] savePushToken:", error.message);
}

// Saves per-type notification preferences and opted-in status to profiles table.
// Called on both "Turn on" (optedIn=true) and "Maybe later" (optedIn=false) so we
// always know which types the user would want even if they haven't granted push yet.
export async function saveNotificationPrefs(
  userId: string,
  prefs: NotificationPrefs,
  optedIn: boolean
): Promise<void> {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from("profiles")
    .update({ notifications_opted_in: optedIn, notification_prefs: prefs })
    .eq("id", userId);
  if (error) console.warn("[Notifications] saveNotificationPrefs:", error.message);
}

// Fetches current notification preferences for a user from Supabase.
// Returns defaults if no prefs are set yet.
export async function getNotificationPrefs(
  userId: string
): Promise<NotificationPrefs> {
  if (!supabase || !userId) return { ...DEFAULT_NOTIFICATION_PREFS };
  const { data } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", userId)
    .single();
  if (data?.notification_prefs && typeof data.notification_prefs === "object") {
    return { ...DEFAULT_NOTIFICATION_PREFS, ...(data.notification_prefs as Partial<NotificationPrefs>) };
  }
  return { ...DEFAULT_NOTIFICATION_PREFS };
}
