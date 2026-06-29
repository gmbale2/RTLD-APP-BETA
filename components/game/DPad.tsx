import React, { useCallback } from "react";
import { View, Pressable, StyleSheet, Text, Platform } from "react-native";

interface Props {
  onDirection: (dx: number, dy: number) => void;
  onRelease: () => void;
}

function DButton({
  label,
  onPressIn,
  onPressOut,
  style,
}: {
  label: string;
  onPressIn: () => void;
  onPressOut: () => void;
  style?: object;
}) {
  return (
    <Pressable
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={({ pressed }) => [
        styles.dBtn,
        style,
        pressed && styles.dBtnPressed,
      ]}
    >
      <Text style={styles.dBtnText}>{label}</Text>
    </Pressable>
  );
}

export function DPad({ onDirection, onRelease }: Props) {
  if (Platform.OS === "web") return null;

  const up    = useCallback(() => onDirection(0, -1),  [onDirection]);
  const down  = useCallback(() => onDirection(0,  1),  [onDirection]);
  const left  = useCallback(() => onDirection(-1, 0),  [onDirection]);
  const right = useCallback(() => onDirection(1,  0),  [onDirection]);

  return (
    <View style={styles.container}>
      <View style={styles.dpad}>
        <View style={styles.row}>
          <View style={styles.spacer} />
          <DButton label="▲" onPressIn={up} onPressOut={onRelease} />
          <View style={styles.spacer} />
        </View>
        <View style={styles.row}>
          <DButton label="◀" onPressIn={left} onPressOut={onRelease} />
          <View style={styles.center} />
          <DButton label="▶" onPressIn={right} onPressOut={onRelease} />
        </View>
        <View style={styles.row}>
          <View style={styles.spacer} />
          <DButton label="▼" onPressIn={down} onPressOut={onRelease} />
          <View style={styles.spacer} />
        </View>
      </View>
    </View>
  );
}

const BTN_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 8,
    paddingBottom: 4,
  },
  dpad: {
    gap: 2,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  spacer: {
    width: BTN_SIZE,
    height: BTN_SIZE,
  },
  center: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    backgroundColor: "rgba(100, 0, 140, 0.3)",
    borderRadius: 4,
  },
  dBtn: {
    width: BTN_SIZE,
    height: BTN_SIZE,
    borderRadius: 8,
    backgroundColor: "rgba(140, 0, 200, 0.5)",
    borderWidth: 2,
    borderColor: "#880099",
    alignItems: "center",
    justifyContent: "center",
  },
  dBtnPressed: {
    backgroundColor: "rgba(200, 0, 255, 0.7)",
    borderColor: "#ff00ff",
  },
  dBtnText: {
    color: "#ff00ff",
    fontSize: 18,
    lineHeight: 20,
  },
});
