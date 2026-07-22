import React from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
  TextStyle,
} from "react-native";
import { FontAwesome5 } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onClose: () => void;
}

const STEPS = [
  { icon: "skull",    color: "#cc00ff", title: "YOU ARE TARMAN",  body: "Eat brains scattered across the cemetery. Collect them all to advance." },
  { icon: "bolt",     color: "#39ff14", title: "POWER CANS",      body: "Grab glowing green cans to go POWERED UP — punks become scared and edible!" },
  { icon: "running",  color: "#ff2200", title: "AVOID PUNKS",     body: "Punks hunt you down. Touch one while unpowered and you lose a life." },
  { icon: "apple-alt",color: "#FFD700", title: "BONUS ITEMS",     body: "Fruit & bonus items appear mid-level. Eat them fast for massive points!" },
  { icon: "clock",    color: "#00aaff", title: "BEAT THE CLOCK",  body: "Finish each level quickly for a time bonus — the faster, the better." },
];

export default function HowToPlayModal({ visible, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <FontAwesome5 name="question-circle" size={18} color="#cc00ff" solid />
            <Text style={[styles.title, titleGlow]}>HOW TO PLAY</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={12}>
              <FontAwesome5 name="times" size={16} color="#664477" />
            </Pressable>
          </View>

          <View style={styles.divider} />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            {STEPS.map((step) => (
              <View key={step.title} style={styles.row}>
                <View style={[styles.iconBox, { borderColor: step.color }]}>
                  <FontAwesome5 name={step.icon as any} size={16} color={step.color} solid />
                </View>
                <View style={styles.rowText}>
                  <Text style={[styles.rowTitle, { color: step.color }]}>{step.title}</Text>
                  <Text style={styles.rowBody}>{step.body}</Text>
                </View>
              </View>
            ))}

            <View style={styles.controlsBox}>
              <Text style={styles.controlsTitle}>CONTROLS</Text>
              <Text style={styles.controlsBody}>
                📱 Mobile: Swipe in any direction{"\n"}
                🖥️ Desktop: Arrow keys or WASD
              </Text>
            </View>
          </ScrollView>

          <Pressable
            style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}
            onPress={onClose}
          >
            <FontAwesome5 name="skull" size={13} color="#0a0012" solid />
            <Text style={styles.btnText}>LET'S EAT BRAINS!</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const titleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 10px rgba(204,0,255,0.6)" }
    : { textShadowColor: "#cc00ff", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 };

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#0d0018",
    borderWidth: 1.5,
    borderColor: "#440066",
    borderRadius: 16,
    overflow: "hidden",
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 18,
    paddingBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 16,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  closeBtn: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#220033",
    marginHorizontal: 18,
  },
  body: {
    padding: 18,
    gap: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1.5,
    backgroundColor: "rgba(40,0,60,0.6)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText: { flex: 1, gap: 3 },
  rowTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  rowBody: {
    fontSize: 12,
    color: "#997aaa",
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  controlsBox: {
    backgroundColor: "rgba(30,0,50,0.6)",
    borderWidth: 1,
    borderColor: "#330044",
    borderRadius: 10,
    padding: 14,
    gap: 6,
  },
  controlsTitle: {
    fontSize: 9,
    color: "#664477",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  controlsBody: {
    fontSize: 12,
    color: "#997aaa",
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  btn: {
    margin: 18,
    marginTop: 12,
    paddingVertical: 13,
    backgroundColor: "#cc00ff",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: "#0a0012",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
});
