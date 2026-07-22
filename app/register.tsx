/**
 * register.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * First-launch registration screen.
 * Collects: Display Name · Username · Email
 *
 * Saves to AsyncStorage via userStorage.ts.
 * Phase 2: userStorage.saveUser() will POST to Supabase instead.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  TextStyle,
  Linking,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { saveUser } from "@/utils/userStorage";
import { supabase } from "@/utils/supabase";

// ── Validation ────────────────────────────────────────────────────────────────

function validateName(v: string) {
  if (!v.trim()) return "Name is required.";
  if (v.trim().length < 2) return "Name must be at least 2 characters.";
  return null;
}

function validateUsername(v: string) {
  if (!v.trim()) return "Username is required.";
  if (v.length < 3) return "Must be at least 3 characters.";
  if (v.length > 20) return "Must be 20 characters or less.";
  if (!/^[a-zA-Z0-9_!@$?]+$/.test(v))
    return "Letters, numbers, _ ! @ $ ? allowed.";
  return null;
}

function validateEmail(v: string) {
  if (!v.trim()) return "Email is required.";
  if (!/^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(v)) return "Enter a valid email.";
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();

  const [name, setName]         = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail]       = useState("");

  const [nameErr, setNameErr]         = useState<string | null>(null);
  const [usernameErr, setUsernameErr] = useState<string | null>(null);
  const [emailErr, setEmailErr]       = useState<string | null>(null);

  const [emailConsent, setEmailConsent] = useState(false);
  const [consentErr, setConsentErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [globalErr, setGlobalErr] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate all fields
    const ne = validateName(name);
    const ue = validateUsername(username);
    const ee = validateEmail(email);
    const ce = emailConsent ? null : "You must agree to continue.";

    setNameErr(ne);
    setUsernameErr(ue);
    setEmailErr(ee);
    setConsentErr(ce);

    if (ne || ue || ee || ce) return;

    setLoading(true);
    setGlobalErr(null);

    try {
      if (typeof supabase !== "undefined" && supabase) {
        // Check username uniqueness
        const { data: existingUser } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username.trim().toLowerCase())
          .maybeSingle();
        if (existingUser) {
          setUsernameErr("That username is already taken.");
          setLoading(false);
          return;
        }

        // Check email uniqueness
        const { data: existingEmail } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", email.trim().toLowerCase())
          .maybeSingle();
        if (existingEmail) {
          setEmailErr("An account with this email already exists.");
          setLoading(false);
          return;
        }
      }
      await saveUser({ name, username, email, emailConsent });
      router.replace("/notifications");
    } catch (err) {
      setGlobalErr("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text style={[styles.title, titleGlow]}>BRAIN BITE</Text>
        <Text style={styles.subtitle}>RETURN OF THE LIVING DEAD</Text>

        <View style={styles.divider} />

        <Text style={styles.heading}>JOIN THE DEAD</Text>
        <Text style={styles.body}>
          Create your profile to track your score on the leaderboard.
        </Text>

        {/* Form */}
        <View style={styles.form}>

          {/* Name */}
          <View style={styles.field}>
            <Text style={styles.label}>NAME</Text>
            <Text style={styles.hint}>Your information is private and will not be visible to other users.</Text>
            <TextInput
              style={[styles.input, nameErr ? styles.inputError : null]}
              value={name}
              onChangeText={(t) => { setName(t); setNameErr(null); }}
              placeholder="e.g. Tarman"
              placeholderTextColor="#553366"
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
            />
            {nameErr ? <Text style={styles.errText}>{nameErr}</Text> : null}
          </View>

          {/* Username */}
          <View style={styles.field}>
            <Text style={styles.label}>DISPLAY NAME</Text>
            <Text style={styles.hint}>
              Public · shown on the leaderboard · letters, numbers, _ ! @ $ ?
            </Text>
            <TextInput
              style={[styles.input, usernameErr ? styles.inputError : null]}
              value={username}
              onChangeText={(t) => { setUsername(t); setUsernameErr(null); }}
              placeholder="e.g. tarman_666"
              placeholderTextColor="#553366"
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              returnKeyType="next"
            />
            {usernameErr ? <Text style={styles.errText}>{usernameErr}</Text> : null}
          </View>

          {/* Email */}
          <View style={styles.field}>
            <Text style={styles.label}>EMAIL</Text>
            <Text style={styles.hint}>
              Used for draw notifications. Never shared.
            </Text>
            <TextInput
              style={[styles.input, emailErr ? styles.inputError : null]}
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailErr(null); }}
              placeholder="e.g. tarman@livingdead.com"
              placeholderTextColor="#553366"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
            {emailErr ? <Text style={styles.errText}>{emailErr}</Text> : null}
          </View>

          {/* Email marketing consent */}
          <Pressable
            style={styles.consentRow}
            onPress={() => { setEmailConsent((v) => !v); setConsentErr(null); }}
          >
            <View style={[styles.checkbox, emailConsent && styles.checkboxChecked, !!consentErr && styles.checkboxError]}>
              {emailConsent && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I agree to receive emails about prizes, merch drops and movie updates.{" "}
              <Text
                style={styles.consentLink}
                onPress={() => Linking.openURL("https://returnofthelivingdead.com/policies/privacy-policy")}
              >
                Terms & Privacy
              </Text>
            </Text>
          </Pressable>
          {consentErr ? <Text style={[styles.errText, { marginTop: -10, marginBottom: 8 }]}>{consentErr}</Text> : null}

          {/* Global error */}
          {globalErr ? (
            <Text style={[styles.errText, { textAlign: "center", marginBottom: 8 }]}>
              {globalErr}
            </Text>
          ) : null}

          {/* Submit */}
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.btnText}>START PLAYING →</Text>
            )}
          </Pressable>

          <Text style={styles.legal}>
            By joining you agree to our Privacy Policy.{"\n"}
            No purchase necessary to participate in any draw.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Glow effect ───────────────────────────────────────────────────────────────

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error — valid CSS on web
      { textShadow: "0 0 12px rgba(255,0,255,0.6), 0 0 24px rgba(180,0,220,0.4)" }
    : {
        textShadowColor: "#ff00ff",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 12,
      };

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#0a0012" },

  container: {
    alignItems: "center",
    paddingHorizontal: 28,
  },

  skull: {
    fontSize: 48,
    marginBottom: 8,
  },

  title: {
    fontSize: 22,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
  },

  subtitle: {
    fontSize: 11,
    color: "#cc00ff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
    marginTop: 4,
  },

  divider: {
    width: "80%",
    height: 1,
    backgroundColor: "#330044",
    marginVertical: 20,
  },

  heading: {
    fontSize: 18,
    color: "#00ff88",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
    textAlign: "center",
    marginBottom: 8,
  },

  body: {
    fontSize: 12,
    color: "#9977bb",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 24,
  },

  form: {
    width: "100%",
    maxWidth: 380,
    gap: 4,
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontSize: 10,
    color: "#cc00ff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginBottom: 4,
  },

  hint: {
    fontSize: 10,
    color: "#aa88cc",
    fontFamily: "Inter_400Regular",
    marginBottom: 6,
  },

  input: {
    backgroundColor: "rgba(40, 0, 60, 0.8)",
    borderWidth: 1,
    borderColor: "#440066",
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    marginTop: 4,
    letterSpacing: 0.5,
  },

  btn: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 4,
    backgroundColor: "rgba(80, 0, 100, 0.6)",
    alignItems: "center",
  },

  btnPressed: {
    backgroundColor: "rgba(150, 0, 200, 0.8)",
  },

  btnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },

  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginTop: 4,
    marginBottom: 16,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: "#664477",
    borderRadius: 3,
    backgroundColor: "rgba(40,0,60,0.8)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  checkboxChecked: {
    borderColor: "#cc00ff",
    backgroundColor: "rgba(100,0,150,0.6)",
  },
  checkboxError: {
    borderColor: "#ff4422",
  },
  checkmark: {
    color: "#cc00ff",
    fontSize: 11,
    lineHeight: 14,
    fontFamily: "Inter_700Bold",
  },
  consentText: {
    flex: 1,
    fontSize: 10,
    color: "#aa88cc",
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  consentLink: {
    color: "#cc00ff",
    textDecorationLine: "underline",
  },

  legal: {
    marginTop: 20,
    fontSize: 9,
    color: "#9977bb",
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 14,
  },
});
