import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  Switch,
  Linking,
  Platform,
  ActivityIndicator,
  TextStyle,
  Alert,
} from "react-native";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import HowToPlayModal from "@/components/game/HowToPlayModal";

const PROFILE_KEY = "@more_brains:user_profile";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";

import { getUser, updateUsername, UserProfile } from "@/utils/userStorage";
import { loadSoundSettings, saveSoundSettings, SoundSettings } from "@/utils/soundSettings";
import { supabase, isSupabaseConfigured } from "@/utils/supabase";

// ── Validation ────────────────────────────────────────────────────────────────

function validateUsername(v: string) {
  if (!v.trim()) return "Username is required.";
  if (v.length < 3) return "Must be at least 3 characters.";
  if (v.length > 20) return "Must be 20 characters or less.";
  if (!/^[a-zA-Z0-9_!@$?]+$/.test(v))
    return "Letters, numbers, _ ! @ $ ? allowed.";
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [sound, setSound] = useState<SoundSettings>({
    musicEnabled: true,
    sfxEnabled: true,
  });

  // Username change state
  const [newUsername, setNewUsername] = useState("");
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [usernameSaving, setUsernameSaving] = useState(false);
  const [usernameSuccess, setUsernameSuccess] = useState(false);

  // Email change state
  const [newEmail, setNewEmail] = useState("");
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // How to Play modal
  const [showHowToPlay, setShowHowToPlay] = useState(false);

  // Delete account
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getUser().then((u) => {
      if (u) {
        setUser(u);
        setNewUsername(u.username);
        setNewEmail(u.email ?? "");
      }
    });
    loadSoundSettings().then(setSound);
  }, []);

  // ── Sound toggles ──────────────────────────────────────────────────────────

  const handleMusicToggle = async (val: boolean) => {
    const next = { ...sound, musicEnabled: val };
    setSound(next);
    await saveSoundSettings(next);
  };

  const handleSfxToggle = async (val: boolean) => {
    const next = { ...sound, sfxEnabled: val };
    setSound(next);
    await saveSoundSettings(next);
  };

  // ── Username change ────────────────────────────────────────────────────────

  const handleUsernameChange = async () => {
    setUsernameSuccess(false);
    const cleaned = newUsername.trim();
    const err = validateUsername(cleaned);
    if (err) { setUsernameErr(err); return; }
    if (cleaned === user?.username) {
      setUsernameErr("That's already your username.");
      return;
    }

    setUsernameSaving(true);
    setUsernameErr(null);

    try {
      if (isSupabaseConfigured && supabase) {
        const { data: existing } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", cleaned)
          .maybeSingle();
        if (existing) {
          setUsernameErr("That username is already taken.");
          return;
        }
      }

      const updated = await updateUsername(cleaned);
      setUser(updated);
      setUsernameSuccess(true);
    } catch {
      setUsernameErr("Something went wrong. Try again.");
    } finally {
      setUsernameSaving(false);
    }
  };

  // ── Email change ───────────────────────────────────────────────────────────

  const handleEmailChange = async () => {
    setEmailSuccess(false);
    const cleaned = newEmail.trim().toLowerCase();
    if (!cleaned) { setEmailErr("Email is required."); return; }
    if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(cleaned)) {
      setEmailErr("Enter a valid email address.");
      return;
    }
    if (cleaned === user?.email?.toLowerCase()) {
      setEmailErr("That's already your email.");
      return;
    }
    setEmailSaving(true);
    setEmailErr(null);
    try {
      if (isSupabaseConfigured && supabase) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("profiles")
          .update({ email: cleaned })
          .eq("id", user?.id ?? "");
        if (error) throw error;
      }
      if (user) {
        const updated = { ...user, email: cleaned };
        await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(updated));
        setUser(updated);
      }
      setEmailSuccess(true);
    } catch {
      setEmailErr("Something went wrong. Try again.");
    } finally {
      setEmailSaving(false);
    }
  };

  // ── Delete account ─────────────────────────────────────────────────────────

  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your profile and all scores. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              if (isSupabaseConfigured && supabase && user?.id) {
                await supabase.from("scores").delete().eq("user_id", user.id);
                await supabase.from("profiles").delete().eq("id", user.id);
                await supabase.auth.signOut();
              }
              await AsyncStorage.clear();
              router.replace("/register");
            } catch {
              Alert.alert("Error", "Could not delete account. Try again.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.root, { paddingTop: insets.top || 16 }]}>

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <FontAwesome5 name="arrow-left" size={12} color="#ffffff" />
          <Text style={styles.backText}>BACK</Text>
        </Pressable>
        <FontAwesome5 name="cog" size={18} color="#cc00ff" />
      </View>

      <Text style={[styles.title, titleGlow]}>CONTROL CENTRAL</Text>
      <View style={styles.divider} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── NOTIFICATIONS ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>NOTIFICATIONS</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.cardRow}
            onPress={() => router.push("/notifications?from=settings")}
          >
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="bell" size={16} color="#cc00ff" />
              <View>
                <Text style={styles.cardRowTitle}>Notification Center</Text>
                <Text style={styles.cardRowSub}>Manage what you hear from us</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={12} color="#664477" />
          </Pressable>
        </View>

        {/* ── SOUND ─────────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>SOUND</Text>
        <View style={styles.card}>
          <View style={styles.cardRow}>
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="music" size={15} color="#cc00ff" />
              <Text style={styles.cardRowTitle}>Music</Text>
            </View>
            <Switch
              value={sound.musicEnabled}
              onValueChange={handleMusicToggle}
              trackColor={{ false: "#220033", true: "#660099" }}
              thumbColor={sound.musicEnabled ? "#cc00ff" : "#442255"}
            />
          </View>
          <View style={styles.cardSep} />
          <View style={[styles.cardRow, styles.cardRowLast]}>
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="volume-up" size={15} color="#00ff88" />
              <Text style={styles.cardRowTitle}>Sound Effects</Text>
            </View>
            <Switch
              value={sound.sfxEnabled}
              onValueChange={handleSfxToggle}
              trackColor={{ false: "#220033", true: "#005533" }}
              thumbColor={sound.sfxEnabled ? "#00ff88" : "#334433"}
            />
          </View>
        </View>

        {/* ── USERNAME ──────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>ACCOUNT</Text>
        <View style={[styles.card, styles.cardPadded]}>
          <Text style={styles.fieldLabel}>CHANGE DISPLAY NAME</Text>
          {user ? (
            <Text style={styles.currentVal}>Current: @{user.username}</Text>
          ) : null}
          <TextInput
            style={[styles.input, usernameErr ? styles.inputError : null]}
            value={newUsername}
            onChangeText={(t) => {
              setNewUsername(t);
              setUsernameErr(null);
              setUsernameSuccess(false);
            }}
            placeholder="new_username"
            placeholderTextColor="#553366"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={20}
            returnKeyType="done"
            onSubmitEditing={handleUsernameChange}
          />
          {usernameErr ? (
            <Text style={styles.errText}>{usernameErr}</Text>
          ) : null}
          {usernameSuccess ? (
            <Text style={styles.successText}>✓ Username updated!</Text>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}
            onPress={handleUsernameChange}
            disabled={usernameSaving}
          >
            {usernameSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.btnText}>SAVE USERNAME</Text>
            )}
          </Pressable>
          {user?.previousUsernames?.length ? (
            <Text style={styles.prevNote}>
              Previous: {user.previousUsernames.slice(-3).join(", ")}
            </Text>
          ) : null}
        </View>

        {/* ── EMAIL ─────────────────────────────────────────────────────────── */}
        <View style={[styles.card, styles.cardPadded, { marginTop: 14 }]}>
          <Text style={styles.fieldLabel}>CHANGE EMAIL</Text>
          {user?.email ? (
            <Text style={styles.currentVal}>Current: {user.email}</Text>
          ) : null}
          <TextInput
            style={[styles.input, emailErr ? styles.inputError : null]}
            value={newEmail}
            onChangeText={(t) => { setNewEmail(t); setEmailErr(null); setEmailSuccess(false); }}
            placeholder="new@email.com"
            placeholderTextColor="#553366"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            returnKeyType="done"
            onSubmitEditing={handleEmailChange}
          />
          {emailErr ? <Text style={styles.errText}>{emailErr}</Text> : null}
          {emailSuccess ? <Text style={styles.successText}>✓ Email updated!</Text> : null}
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.75 }]}
            onPress={handleEmailChange}
            disabled={emailSaving}
          >
            {emailSaving ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.btnText}>SAVE EMAIL</Text>
            )}
          </Pressable>
        </View>

        {/* ── HOW TO PLAY ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>GAME HELP</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.cardRow, styles.cardRowLast]}
            onPress={() => setShowHowToPlay(true)}
          >
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="question-circle" size={15} color="#cc00ff" />
              <View>
                <Text style={styles.cardRowTitle}>How to Play</Text>
                <Text style={styles.cardRowSub}>Review the game tutorial</Text>
              </View>
            </View>
            <FontAwesome5 name="chevron-right" size={12} color="#664477" />
          </Pressable>
        </View>

        {/* ── DANGER ZONE ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>DANGER ZONE</Text>
        <View style={styles.card}>
          <Pressable
            style={[styles.cardRow, styles.cardRowLast]}
            onPress={handleDeleteAccount}
            disabled={deleting}
          >
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="trash" size={14} color="#ff3333" />
              <View>
                <Text style={[styles.cardRowTitle, { color: "#ff3333" }]}>Delete Account</Text>
                <Text style={styles.cardRowSub}>Remove your profile and all scores</Text>
              </View>
            </View>
            {deleting ? (
              <ActivityIndicator size="small" color="#ff3333" />
            ) : (
              <FontAwesome5 name="chevron-right" size={12} color="#664477" />
            )}
          </Pressable>
        </View>

        {/* ── LEGAL ─────────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>LEGAL</Text>
        <View style={styles.card}>
          <Pressable
            style={styles.cardRow}
            onPress={() => Linking.openURL("https://rtld-app.com/privacy")}
          >
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="shield-alt" size={14} color="#664477" />
              <Text style={styles.cardRowTitle}>Privacy Policy</Text>
            </View>
            <FontAwesome5 name="external-link-alt" size={11} color="#664477" />
          </Pressable>
          <View style={styles.cardSep} />
          <Pressable
            style={[styles.cardRow, styles.cardRowLast]}
            onPress={() => Linking.openURL("https://rtld-app.com/terms")}
          >
            <View style={styles.cardRowLeft}>
              <FontAwesome5 name="file-alt" size={14} color="#664477" />
              <Text style={styles.cardRowTitle}>Terms of Service</Text>
            </View>
            <FontAwesome5 name="external-link-alt" size={11} color="#664477" />
          </Pressable>
        </View>

        <Text style={styles.version}>BRAIN BITE · RTLD FAN APP · EARLY ACCESS</Text>

      </ScrollView>

      <HowToPlayModal visible={showHowToPlay} onClose={() => setShowHowToPlay(false)} />
    </View>
  );
}

// ── Glow ──────────────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 12px rgba(255,0,255,0.5)" }
    : {
        textShadowColor: "#ff00ff",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      };

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    paddingHorizontal: 20,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backText: {
    fontSize: 10,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 20,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 4,
  },
  divider: {
    width: "80%",
    height: 1,
    backgroundColor: "#220033",
    alignSelf: "center",
    marginVertical: 14,
  },
  scroll: { flex: 1 },
  content: {
    maxWidth: 480,
    alignSelf: "center",
    width: "100%",
  },

  sectionLabel: {
    fontSize: 9,
    color: "#664477",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    marginBottom: 8,
  },

  card: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "#220033",
    borderRadius: 12,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  cardPadded: {
    paddingVertical: 14,
    gap: 10,
  },
  cardSep: {
    height: 1,
    backgroundColor: "#1a0028",
    marginHorizontal: -16,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  cardRowLast: {
    paddingBottom: 14,
  },
  cardRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  cardRowTitle: {
    fontSize: 13,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  cardRowSub: {
    fontSize: 10,
    color: "#664477",
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },

  fieldLabel: {
    fontSize: 9,
    color: "#cc00ff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  currentVal: {
    fontSize: 11,
    color: "#664477",
    fontFamily: "Inter_400Regular",
  },
  input: {
    backgroundColor: "rgba(40, 0, 60, 0.8)",
    borderWidth: 1,
    borderColor: "#440066",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: "#ffffff",
    fontFamily: "Inter_400Regular",
    fontSize: 14,
  },
  inputError: {
    borderColor: "#ff3300",
  },
  errText: {
    color: "#ff4422",
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  successText: {
    color: "#00ff88",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  btn: {
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: "#cc00ff",
    borderRadius: 4,
    alignItems: "center",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  prevNote: {
    fontSize: 9,
    color: "#443355",
    fontFamily: "Inter_400Regular",
  },

  version: {
    marginTop: 32,
    fontSize: 9,
    color: "#2a0040",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
});
