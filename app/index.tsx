import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dimensions,
  Image,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FontAwesome5 } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";

import { GameEngine, GameState } from "@/components/game/GameEngine";
import { GameCanvas } from "@/components/game/GameCanvas";
import { CemeteryBorder } from "@/components/game/CemeteryBorder";
import { GameHUD } from "@/components/game/GameHUD";
import { GameOverlay } from "@/components/game/GameOverlay";
import { useSoundPlayer } from "@/hooks/useSoundPlayer";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { getUser } from "@/utils/userStorage";
import { fetchCmsConfig, DEFAULT_SPIN_THRESHOLD } from "@/utils/cmsConfig";

export default function GameScreen() {
  // ── Registration gate ───────────────────────────────────────────────────────
  // Check for a saved user profile on mount. If none exists, send to /register.
  // Phase 2: replace getUser() with a Supabase session check.
  useEffect(() => {
    getUser().then((user) => {
      if (!user) router.replace("/register");
    });
    fetchCmsConfig().then((cfg) => {
      spinThresholdRef.current = cfg.spin_threshold;
    });
  }, []);

  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const isWeb = Platform.OS === "web";

  const topPad    = isWeb ? 4  : insets.top;
  const bottomPad = isWeb ? 4  : insets.bottom;

  const HUD_HEIGHT    = 62;
  const TITLE_HEIGHT  = isWeb ? 30 : 36;
  const MIN_LOGO_H    = isWeb ? 0  : 40;
  const MARGINS       = isWeb ? 2  : 8;
  const gateReserveH  = isWeb ? 90 : 110;

  const availableWidth  = screenWidth;
  const availableHeight =
    screenHeight - topPad - bottomPad - HUD_HEIGHT - TITLE_HEIGHT - MIN_LOGO_H - MARGINS - gateReserveH;
  const mazeSide = Math.min(availableWidth, availableHeight);
  const gameSide = mazeSide;

  // Remaining vertical space after every fixed element — the logo fills this
  const logoAreaHeight = Math.max(
    MIN_LOGO_H,
    screenHeight - topPad - TITLE_HEIGHT - mazeSide - gateReserveH - HUD_HEIGHT - bottomPad - MARGINS,
  );

  const [gameKey, setGameKey]     = useState(0);
  const engineRef                  = useRef<GameEngine | null>(null);
  const [gameState, setGameState]  = useState<GameState | null>(null);
  const spinThresholdRef           = useRef<number>(DEFAULT_SPIN_THRESHOLD);
  const rafRef                     = useRef<number | null>(null);
  const deadTimerRef               = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelTimerRef              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelRestartTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Nav-pause support ────────────────────────────────────────────────────────
  // Stores the loop fn so useFocusEffect can restart it without re-mounting
  const loopFnRef      = useRef<((now: number) => void) | null>(null);
  const navPausedRef   = useRef(false);
  const [navPaused, setNavPaused] = useState(false);


  const { playSound, enableAudio, setMode, pauseMusic, resumeMusic } = useSoundPlayer();
  const prevPhaseRef = useRef<string | null>(null);
  const isOnline = useOnlineStatus();

  // Pause the game loop (reuses the nav-pause mechanism)
  const handleOfflinePause = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    pauseMusic();
    navPausedRef.current = true;
    setNavPaused(true);
  }, [pauseMusic]);

  const handleDirection = useCallback((dx: number, dy: number) => {
    engineRef.current?.setDirection(dx, dy);
  }, []);

  useEffect(() => {
    // Reset per-game flags so each new game starts fresh

    // Cancel any in-flight RAF / timers from the previous run
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    if (deadTimerRef.current)        clearTimeout(deadTimerRef.current);
    if (levelTimerRef.current)       clearTimeout(levelTimerRef.current);
    if (levelRestartTimerRef.current) clearTimeout(levelRestartTimerRef.current);

    const engine = new GameEngine(gameSide);
    engineRef.current = engine;
    setGameState({ ...engine.getState() });

    const TICK_MS   = 33;
    let lastTime    = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      const delta = Math.min(now - lastTime, 100);
      lastTime      = now;
      accumulator  += delta;

      let didTick = false;

      while (accumulator >= TICK_MS) {
        accumulator -= TICK_MS;
        const eng = engineRef.current;
        if (!eng) break;

        const prevState   = eng.getState();
        const prevPhase   = prevState.phase;
        const prevPowered = prevState.powered;

        eng.tick();
        const nextState = eng.getState();
        didTick = true;

        // "Brains!" SFX on can pickup
        if (!prevPowered && nextState.powered) playSound("power");

        // ── Death handling ───────────────────────────────────────────────────
        if (prevPhase === "playing" && nextState.phase === "dead") {
          playSound("death");
          if (deadTimerRef.current) clearTimeout(deadTimerRef.current);
          deadTimerRef.current = setTimeout(() => {
            const e = engineRef.current;
            if (!e) return;
            e.triggerRespawn();
            setGameState({ ...e.getState() });
          }, 1500);
        }

        // ── Level complete: stop the RAF loop, let timer handle transition ──
        if (prevPhase === "playing" && nextState.phase === "levelup") {
          if (levelTimerRef.current) clearTimeout(levelTimerRef.current);

          // Stop the loop here — do NOT reschedule after this iteration
          rafRef.current = null;

          levelTimerRef.current = setTimeout(() => {
            const e = engineRef.current;
            if (!e) return;
            e.levelUp();
            setGameState({ ...e.getState() });

            // Wait 2 animation frames so React paints the new full maze
            // before the game loop (and input) can advance the engine again
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                if (!engineRef.current) return;
                lastTime    = performance.now();
                accumulator = 0;
                rafRef.current = requestAnimationFrame(loop);
              });
            });
          }, 2000);

          // Update state one last time to show levelup overlay, then exit
          setGameState({ ...nextState });
          return; // Exit without scheduling next RAF
        }

      }

      if (didTick && engineRef.current) {
        setGameState({ ...engineRef.current.getState() });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    loopFnRef.current = loop; // expose so useFocusEffect can restart it
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null)        cancelAnimationFrame(rafRef.current);
      if (deadTimerRef.current)           clearTimeout(deadTimerRef.current);
      if (levelTimerRef.current)          clearTimeout(levelTimerRef.current);
      if (levelRestartTimerRef.current)   clearTimeout(levelRestartTimerRef.current);
    };
  }, [gameKey, gameSide, playSound]);

  // ── Pause on navigation away; RESUME button restarts the loop ────────────────
  const handleResume = useCallback(() => {
    enableAudio();
    if (navPausedRef.current && loopFnRef.current) {
      navPausedRef.current = false;
      setNavPaused(false);
      resumeMusic();
      rafRef.current = requestAnimationFrame(loopFnRef.current);
    }
  }, [enableAudio, resumeMusic]);

  useFocusEffect(
    useCallback(() => {
      // Screen gained focus — do NOT auto-resume; the pause overlay shows a RESUME button
      return () => {
        // Screen losing focus — always silence music, pause loop if game is running
        pauseMusic();
        const phase = engineRef.current?.getState()?.phase;
        if (phase === "playing" || phase === "dead") {
          if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
          }
          navPausedRef.current = true;
          setNavPaused(true);
        }
      };
    }, [pauseMusic])
  );

  // ── Music mode: menu / gameplay / power ──────────────────────────────────
  useEffect(() => {
    if (!gameState) return;
    prevPhaseRef.current = gameState.phase;
    const { phase, powered } = gameState;
    if (phase === "start" || phase === "gameover") {
      setMode("menu");
    } else if (phase === "playing" || phase === "dead") {
      setMode(powered ? "power" : "gameplay");
    }
    // levelup / win: keep current mode unchanged
  }, [gameState?.phase, gameState?.powered, setMode]);

  // ── Navigate to leaderboard when game over ────────────────────────────────
  // Read score/level directly from the engine ref at navigation time so we
  // always get the final committed values — avoids any closure staleness.
  useEffect(() => {
    if (!gameState || gameState.phase !== "gameover") return;
    const t = setTimeout(() => {
      const finalState = engineRef.current?.getState();
      const finalScore = finalState?.score ?? gameState.score;
      const finalLevel = finalState?.level ?? gameState.level;
      const online = Platform.OS !== "web" || navigator.onLine;
      if (finalScore >= spinThresholdRef.current && online) {
        router.push({
          pathname: "/spinwheel",
          params: { score: String(finalScore), level: String(finalLevel) },
        });
      } else {
        router.push({
          pathname: "/gameover",
          params: {
            score: String(finalScore),
            level: String(finalLevel),
            ...(finalScore >= spinThresholdRef.current && !online
              ? { offlineWheel: "true" }
              : {}),
          },
        });
      }
    }, 1800);
    return () => clearTimeout(t);
  }, [gameState?.phase]);

  const handleRestart = useCallback(() => {
    setGameKey((k) => k + 1);
  }, []);

  const handleStartOrAction = useCallback(() => {
    enableAudio();
    if (engineRef.current?.getState().phase === "start") {
      engineRef.current.startGame();
    } else {
      handleRestart();
    }
  }, [handleRestart, enableAudio]);

  // ── Keyboard controls (web / desktop) ──────────────────────────────────────
  useEffect(() => {
    if (Platform.OS !== "web") return;
    if (typeof window === "undefined" || typeof window.addEventListener !== "function") return;

    const onKeyDown = (e: KeyboardEvent) => {
      enableAudio();
      if      (e.key === "ArrowUp"    || e.key === "w" || e.key === "W") handleDirection(0, -1);
      else if (e.key === "ArrowDown"  || e.key === "s" || e.key === "S") handleDirection(0, 1);
      else if (e.key === "ArrowLeft"  || e.key === "a" || e.key === "A") handleDirection(-1, 0);
      else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") handleDirection(1, 0);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDirection, enableAudio]);

  // ── Swipe / tap via PanResponder ───────────────────────────────────────────
  const swipeHandled = useRef(false);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        swipeHandled.current = false;
      },
      onPanResponderMove: (_, gs) => {
        if (swipeHandled.current) return;
        const dist = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);
        if (dist < 12) return;
        swipeHandled.current = true;
        enableAudio();
        if (Math.abs(gs.dx) > Math.abs(gs.dy)) {
          handleDirection(gs.dx > 0 ? 1 : -1, 0);
        } else {
          handleDirection(0, gs.dy > 0 ? 1 : -1);
        }
      },
      onPanResponderRelease: (_, gs) => {
        const dist = Math.sqrt(gs.dx * gs.dx + gs.dy * gs.dy);
        swipeHandled.current = false;
        if (dist < 10) {
          enableAudio();
          const phase = engineRef.current?.getState().phase;
          if (phase === "start") {
            engineRef.current?.startGame();
          }
        }
      },
    })
  ).current;

  if (!gameState) return null;

  const showOverlay =
    gameState.phase === "dead"    ||
    gameState.phase === "gameover" ||
    gameState.phase === "win"     ||
    gameState.phase === "levelup" ||
    gameState.phase === "start";

  return (
    <View
      style={[styles.root, { paddingTop: topPad, paddingBottom: bottomPad }]}
      {...panResponder.panHandlers}
    >
      <Text
        style={[
          styles.title,
          isWeb ? styles.titleShadowWeb : styles.titleShadowNative,
        ]}
      >
        MORE BRAINS
      </Text>

      <View style={[styles.mazeWrapper, { width: mazeSide, height: mazeSide }]}>
        <CemeteryBorder size={mazeSide} borderSize={0} />
        <GameCanvas state={gameState} size={gameSide} />
        {showOverlay && (
          <GameOverlay
            phase={gameState.phase}
            onRestart={handleStartOrAction}
            level={gameState.level}
            lastLevelTimeBonus={gameState.lastLevelTimeBonus}
            lastLevelTimeBonusRank={gameState.lastLevelTimeBonusRank}
          />
        )}
        {navPaused && gameState && (
          <View style={styles.pauseOverlay}>
            <Text style={[styles.pauseTitle, pauseTitleGlow]}>GAME PAUSED</Text>
            <Text style={styles.pauseScore}>
              SCORE  {gameState.score.toLocaleString()}
            </Text>
            <Text style={styles.pauseLevel}>LEVEL {gameState.level}</Text>
            <Pressable
              style={({ pressed }) => [styles.pauseBtn, pressed && styles.pauseBtnPressed]}
              onPress={handleResume}
            >
              <Text style={styles.pauseBtnText}>▶  RESUME GAME</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Gate scene spacer */}
      <View style={{ height: gateReserveH }} pointerEvents="none" />

      <GameHUD
        score={gameState.score}
        lives={gameState.lives}
        powered={gameState.powered}
        powerTimer={gameState.powerTimer}
        width={mazeSide}
        level={gameState.level}
        levelTimerTicks={gameState.levelTimerTicks}
      />

      {/* Film logo + hub CTA — fills all remaining black space below HUD */}
      <FilmLogo
        containerWidth={mazeSide}
        areaHeight={logoAreaHeight}
        onHubPress={() => router.push("/hub")}
      />

      {/* ── Offline banner ─────────────────────────────────────────────── */}
      {!isOnline && !navPaused && (
        <View style={styles.offlineBanner} pointerEvents="box-none">
          <View style={styles.offlineBannerInner}>
            <FontAwesome5 name="wifi" size={11} color="#ff4444" />
            <Text style={styles.offlineText}>NO CONNECTION — SCORE WON'T SAVE</Text>
            {gameState.phase === "playing" && (
              <Pressable style={styles.offlinePauseBtn} onPress={handleOfflinePause}>
                <Text style={styles.offlinePauseBtnText}>PAUSE</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

// ── Film logo component ──────────────────────────────────────────────────────

// 648×398 pre-cropped landscape PNG
const RTLD_LOGO = require("../assets/images/rtld_logo_cropped.png");
const LOGO_ASPECT = 648 / 398;   // ≈ 1.628

function FilmLogo({
  containerWidth,
  areaHeight,
  onHubPress,
}: {
  containerWidth: number;
  areaHeight: number;
  onHubPress: () => void;
}) {
  // Exactly the same sizing as before — hub button overlays at the bottom
  const imgH   = Math.round(areaHeight * 0.85);
  const imgW   = Math.min(Math.round(imgH * LOGO_ASPECT), containerWidth * 0.95);
  const finalH = Math.round(imgW / LOGO_ASPECT);
  return (
    <View style={[styles.logoArea, { width: containerWidth, height: areaHeight }]}>
      <Image
        source={RTLD_LOGO}
        style={{ width: imgW, height: finalH }}
        resizeMode="contain"
      />
      {/* Hub button sits at the bottom of the logo area without changing its height */}
      <Pressable
        style={({ pressed }) => [styles.hubBtn, pressed && { opacity: 0.75 }]}
        onPress={onHubPress}
      >
        <FontAwesome5 name="th-large" size={11} color="#0a0012" solid />
        <Text style={styles.hubBtnText}>SEE MORE FROM RTLD</Text>
        <FontAwesome5 name="chevron-right" size={10} color="#0a0012" />
      </Pressable>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const titleShadowWeb: TextStyle = {
  // @ts-expect-error textShadow is a valid web CSS property not typed in React Native
  textShadow: "0 0 10px rgba(255,255,255,0.4)",
};

const titleShadowNative: TextStyle = {
  textShadowColor: "#ffffff",
  textShadowOffset: { width: 0, height: 0 },
  textShadowRadius: 10,
};

const pauseTitleGlow: TextStyle =
  Platform.OS === "web"
    ? // @ts-expect-error
      { textShadow: "0 0 15px #ff00ff, 0 0 30px #cc00aa" }
    : { textShadowColor: "#ff00ff", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 15 };

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0a0012",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    color: "#ffffff",
    letterSpacing: 3,
    marginBottom: 4,
    marginTop: 2,
    fontFamily: "Inter_700Bold",
  },
  titleShadowWeb: titleShadowWeb,
  titleShadowNative: titleShadowNative,
  mazeWrapper: {
    position: "relative",
    overflow: "visible",
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(5,0,20,0.88)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    gap: 8,
  },
  pauseTitle: {
    fontSize: 26,
    color: "#cc00ff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
    textAlign: "center",
  },
  pauseScore: {
    fontSize: 13,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    marginTop: 4,
  },
  pauseLevel: {
    fontSize: 11,
    color: "#886699",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  pauseBtn: {
    marginTop: 18,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#ffffff",
    borderRadius: 4,
    backgroundColor: "rgba(80,0,100,0.6)",
  },
  pauseBtnPressed: {
    backgroundColor: "rgba(150,0,200,0.7)",
  },
  pauseBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    textAlign: "center",
  },
  logoArea: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingBottom: 6,
  },
  hubBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 28,
    marginBottom: 10,
    backgroundColor: "#cc00ff",
    borderRadius: 6,
  },
  hubBtnText: {
    fontSize: 11,
    color: "#0a0012",
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  offlineBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 99,
  },
  offlineBannerInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.88)",
    borderBottomWidth: 1.5,
    borderColor: "#ff4444",
    paddingHorizontal: 14,
    paddingVertical: 7,
    width: "100%",
    justifyContent: "center",
  },
  offlineText: {
    fontSize: 9,
    color: "#ff4444",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  offlinePauseBtn: {
    backgroundColor: "#ff4444",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 6,
  },
  offlinePauseBtnText: {
    fontSize: 9,
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
});
