import React from "react";
import { View, Text, StyleSheet, Platform, TextStyle, Pressable } from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface Props {
  score: number;
  lives: number;
  powered: boolean;
  powerTimer: number;
  width: number;
  level: number;
  levelTimerTicks: number;
  phase: string;
  onPause: () => void;
}

function formatTime(ticks: number): string {
  const totalSecs = Math.floor(ticks / 30);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function SkullDot({ empty = false }: { empty?: boolean }) {
  return (
    <View style={[styles.skullDot, empty && styles.skullDotEmpty]}>
      <View style={styles.skullEyes}>
        <View style={[styles.skullEye, empty && styles.skullEyeEmpty]} />
        <View style={[styles.skullEye, empty && styles.skullEyeEmpty]} />
      </View>
    </View>
  );
}

const timeGlowWeb: TextStyle =
  Platform.OS === "web"
    ? ({ textShadow: "0 0 8px #ffff00" } as TextStyle)
    : {};

export function GameHUD({ score, lives, powered, powerTimer, width, level, levelTimerTicks, phase, onPause }: Props) {
  const canPause = phase === "playing";
  return (
    <View style={[styles.hud, { width }]}>
      <View style={styles.section}>
        <Text style={styles.label}>SCORE</Text>
        <Text style={styles.scoreValue}>{score}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={[styles.label, powered && styles.labelPowered]}>
          {powered ? "POWERED" : `LEVEL`}
        </Text>
        <View style={styles.levelRow}>
          <View style={[styles.canister, powered && styles.canisterActive]}>
            <View style={[styles.canisterLabel, powered && styles.canisterLabelActive]} />
          </View>
          {powered ? (
            <Text style={styles.powerSecs}>{Math.ceil(powerTimer / 30)}s</Text>
          ) : (
            <Text style={styles.levelNum}>{level}</Text>
          )}
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>TIME</Text>
        <Text style={[styles.timeValue, timeGlowWeb]}>
          {formatTime(levelTimerTicks)}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <Text style={styles.label}>LIVES</Text>
        <View style={styles.livesRow}>
          {[0, 1, 2].map((i) => (
            <SkullDot key={i} empty={i >= lives} />
          ))}
        </View>
      </View>

      <View style={styles.divider} />

      <Pressable
        style={({ pressed }) => [styles.pauseBtn, !canPause && styles.pauseBtnDisabled, pressed && canPause && { opacity: 0.6 }]}
        onPress={canPause ? onPause : undefined}
        hitSlop={10}
      >
        <FontAwesome5 name={canPause ? "pause" : "stop"} size={14} color={canPause ? "#cc00ff" : "#330044"} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  hud: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 6,
    paddingVertical: 5,
    backgroundColor: "#080018",
    borderTopWidth: 2,
    borderTopColor: "#cc00ff",
    marginTop: 2,
    minHeight: 58,
  },
  section: {
    alignItems: "center",
    flex: 1,
    gap: 2,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: "#330055",
  },
  label: {
    color: "#00ff88",
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  labelPowered: {
    color: "#00ff88",
  },
  scoreValue: {
    color: "#00ff88",
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  levelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  canister: {
    width: 10,
    height: 20,
    borderRadius: 2,
    backgroundColor: "#333",
    borderWidth: 1,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
  },
  canisterActive: {
    backgroundColor: "#00cc44",
    borderColor: "#00ff88",
  },
  canisterLabel: {
    width: 6,
    height: 5,
    backgroundColor: "#222",
    borderRadius: 1,
  },
  canisterLabelActive: {
    backgroundColor: "#009933",
  },
  levelNum: {
    color: "#cc00ff",
    fontSize: 19,
    fontFamily: "Inter_700Bold",
  },
  powerSecs: {
    color: "#00ff88",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  timeValue: {
    color: "#ffff00",
    fontSize: 19,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  livesRow: {
    flexDirection: "row",
    gap: 3,
    alignItems: "center",
  },
  skullDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#ff00cc",
    borderWidth: 1.5,
    borderColor: "#ff66ee",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 2,
  },
  skullDotEmpty: {
    backgroundColor: "#330033",
    borderColor: "#550055",
  },
  skullEyes: {
    flexDirection: "row",
    gap: 3,
  },
  skullEye: {
    width: 3,
    height: 3,
    borderRadius: 1,
    backgroundColor: "#0a0012",
  },
  skullEyeEmpty: {
    backgroundColor: "#220022",
  },
  pauseBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  pauseBtnDisabled: {
    opacity: 0.3,
  },
});
