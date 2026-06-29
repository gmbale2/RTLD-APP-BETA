import React from "react";
import { View, Text, Pressable, StyleSheet, Platform } from "react-native";
import { Phase } from "./GameEngine";

interface Props {
  phase: Phase;
  onRestart: () => void;
  level?: number;
  lastLevelTimeBonus?: number;
  lastLevelTimeBonusRank?: string;
}

const titleShadow =
  Platform.OS === "web"
    ? { textShadow: "0 0 15px #ff00ff, 0 0 30px #cc00aa" }
    : {
        textShadowColor: "#ff00ff",
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 15,
      };

export function GameOverlay({ phase, onRestart, level, lastLevelTimeBonus, lastLevelTimeBonusRank }: Props) {
  if (phase === "levelup") {
    const bonus = lastLevelTimeBonus ?? 0;
    const rank = lastLevelTimeBonusRank ?? "";
    return (
      <View style={styles.overlay}>
        <Text style={[styles.mainText, { color: "#00ff88" }]}>LEVEL COMPLETE!</Text>
        {rank ? (
          <>
            <Text style={[styles.rankText]}>{rank}</Text>
            <Text style={[styles.bonusText]}>+{bonus.toLocaleString()} pts</Text>
          </>
        ) : null}
        <Text style={[styles.subText, { color: "#ffff00", marginTop: 6 }]}>
          {level != null ? `ENTERING LEVEL ${level + 1}...` : "NEXT LEVEL..."}
        </Text>
      </View>
    );
  }

  if (phase === "dead") {
    return (
      <View style={styles.overlay}>
        <Text style={[styles.mainText, { color: "#ff3300" }]}>PUNK'D!</Text>
        <Text style={styles.subText}>RESPAWNING...</Text>
      </View>
    );
  }

  if (phase === "start") {
    const isNewLevel = level != null && level > 1;
    if (isNewLevel) {
      return (
        <View style={styles.overlay}>
          <Text style={[styles.mainText, { color: "#ff00ff" }, titleShadow]}>
            LEVEL {level}
          </Text>
          <Text style={[styles.subText, { color: "#00ff88", marginTop: 4 }]}>
            GET READY!
          </Text>
          <Text style={[styles.subText, { color: "#888", marginTop: 4, fontSize: 10 }]}>
            SWIPE OR PRESS A KEY TO START
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.overlay}>
        <Text style={styles.subText}>EAT ALL THE BRAINS</Text>
        <Text style={[styles.subText, { color: "#888", marginTop: 2 }]}>
          AVOID THE PUNKS!
        </Text>
        <View style={styles.instructionBox}>
          <Text style={styles.instructionText}>Swipe in any direction to move</Text>
          <Text style={styles.instructionText}>Desktop: Arrow keys / WASD</Text>
          <Text style={[styles.instructionText, { color: "#33ff66", marginTop: 4 }]}>
            Green cans = Power Up!
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={onRestart}
        >
          <Text style={styles.btnText}>TAP TO START</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "gameover") {
    return (
      <View style={styles.overlay}>
        <Text style={[styles.mainText, { color: "#ff2200" }]}>PUNK'D!</Text>
        <Text style={[styles.subText, { color: "#ff6600" }]}>THE PUNKS GOT YOU!</Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={onRestart}
        >
          <Text style={styles.btnText}>TRY AGAIN</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === "win") {
    return (
      <View style={styles.overlay}>
        <Text style={[styles.mainText, { color: "#00ff88" }]}>ALL BRAINS EATEN!</Text>
        <Text style={[styles.subText, { color: "#ffff00" }]}>TARMAN IS SATISFIED!</Text>
        <Pressable
          style={({ pressed }) => [
            styles.btn,
            { borderColor: "#00ff88" },
            pressed && styles.btnPressed,
          ]}
          onPress={onRestart}
        >
          <Text style={[styles.btnText, { color: "#00ff88" }]}>PLAY AGAIN</Text>
        </Pressable>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(5, 0, 20, 0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    gap: 6,
  },
  mainText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  rankText: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#ffff00",
    letterSpacing: 1,
    textAlign: "center",
  },
  bonusText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#ffff00",
    letterSpacing: 1,
    textAlign: "center",
  },
  subText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#cc00ff",
    letterSpacing: 2,
    textAlign: "center",
  },
  instructionBox: {
    marginTop: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#440066",
    borderRadius: 8,
    backgroundColor: "rgba(40, 0, 60, 0.8)",
    alignItems: "center",
    gap: 3,
  },
  instructionText: {
    color: "#9977bb",
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  btn: {
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 4,
    backgroundColor: "rgba(80, 0, 100, 0.6)",
  },
  btnPressed: {
    backgroundColor: "rgba(150, 0, 200, 0.7)",
  },
  btnText: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
});
