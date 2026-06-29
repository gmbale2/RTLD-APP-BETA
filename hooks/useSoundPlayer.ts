import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";

const MENU_SRC        = require("../assets/sounds/party_time.m4a");
const AMBIENT_SRC     = require("../assets/sounds/ambient.wav");
const POWER_THEME_SRC = require("../assets/sounds/power_theme.wav");
const BRAINS_SRC      = require("../assets/sounds/brains_sfx.m4a");
const PARAMEDICS_SRC  = require("../assets/sounds/paramedics_sfx.m4a");

type SoundName = "ambient" | "brain" | "death" | "power";
type MusicMode = "menu" | "gameplay" | "power";

export function useSoundPlayer() {
  const menuRef        = useRef<Audio.Sound | null>(null);
  const ambientRef     = useRef<Audio.Sound | null>(null);
  const powerThemeRef  = useRef<Audio.Sound | null>(null);
  const brainsRef      = useRef<Audio.Sound | null>(null);
  const paramedicsRef  = useRef<Audio.Sound | null>(null);
  const enabledRef     = useRef(false);
  const currentModeRef = useRef<MusicMode | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch {}

      try {
        const { sound: menu } = await Audio.Sound.createAsync(
          MENU_SRC, { shouldPlay: false, volume: 0.55 }
        );
        await menu.setIsLoopingAsync(true);
        if (mounted) menuRef.current = menu;
      } catch (e) { console.warn("menu theme:", e); }

      try {
        const { sound: ambient } = await Audio.Sound.createAsync(
          AMBIENT_SRC, { shouldPlay: false, volume: 0.30 }
        );
        await ambient.setIsLoopingAsync(true);
        if (mounted) ambientRef.current = ambient;
      } catch (e) { console.warn("ambient:", e); }

      try {
        const { sound: powerTheme } = await Audio.Sound.createAsync(
          POWER_THEME_SRC, { shouldPlay: false, volume: 0.45 }
        );
        await powerTheme.setIsLoopingAsync(true);
        if (mounted) powerThemeRef.current = powerTheme;
      } catch (e) { console.warn("power theme:", e); }

      try {
        const { sound: brains } = await Audio.Sound.createAsync(
          BRAINS_SRC, { shouldPlay: false, volume: 0.85 }
        );
        if (mounted) brainsRef.current = brains;
      } catch (e) { console.warn("brains SFX:", e); }

      try {
        const { sound: paramedics } = await Audio.Sound.createAsync(
          PARAMEDICS_SRC, { shouldPlay: false, volume: 0.90 }
        );
        if (mounted) paramedicsRef.current = paramedics;
      } catch (e) { console.warn("paramedics SFX:", e); }
    }

    load();

    return () => {
      mounted = false;
      [menuRef, ambientRef, powerThemeRef, brainsRef, paramedicsRef].forEach((r) => {
        const s = r.current;
        r.current = null;
        s?.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      });
    };
  }, []);

  // First touch — enable audio and start menu theme
  const enableAudio = useCallback(() => {
    if (enabledRef.current) return;
    enabledRef.current = true;
    currentModeRef.current = "menu";
    menuRef.current?.playAsync().catch(() => {});
  }, []);

  const setMode = useCallback((mode: MusicMode) => {
    if (!enabledRef.current) return;
    if (currentModeRef.current === mode) return;
    currentModeRef.current = mode;

    if (mode === "menu") {
      ambientRef.current?.pauseAsync().catch(() => {});
      powerThemeRef.current?.stopAsync().then(() =>
        powerThemeRef.current?.setPositionAsync(0)
      ).catch(() => {});
      menuRef.current?.playAsync().catch(() => {});
    } else if (mode === "gameplay") {
      menuRef.current?.pauseAsync().catch(() => {});
      powerThemeRef.current?.stopAsync().then(() =>
        powerThemeRef.current?.setPositionAsync(0)
      ).catch(() => {});
      ambientRef.current?.playAsync().catch(() => {});
    } else if (mode === "power") {
      menuRef.current?.pauseAsync().catch(() => {});
      ambientRef.current?.pauseAsync().catch(() => {});
      powerThemeRef.current?.setPositionAsync(0).then(() =>
        powerThemeRef.current?.playAsync()
      ).catch(() => {});
    }
  }, []);

  const playSound = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    if (name === "power") {
      brainsRef.current
        ?.setPositionAsync(0)
        .then(() => brainsRef.current?.playAsync())
        .catch(() => {});
    } else if (name === "death") {
      paramedicsRef.current
        ?.setPositionAsync(0)
        .then(() => paramedicsRef.current?.playAsync())
        .catch(() => {});
    }
  }, []);

  // Pauses whichever music track is active without changing the tracked mode,
  // so resumeMusic() can restart the correct track later.
  const pauseMusic = useCallback(() => {
    if (!enabledRef.current) return;
    menuRef.current?.pauseAsync().catch(() => {});
    ambientRef.current?.pauseAsync().catch(() => {});
    powerThemeRef.current?.pauseAsync().catch(() => {});
  }, []);

  // Restarts the track that was playing before pauseMusic() was called.
  const resumeMusic = useCallback(() => {
    if (!enabledRef.current) return;
    const mode = currentModeRef.current;
    if (mode === "menu") {
      menuRef.current?.playAsync().catch(() => {});
    } else if (mode === "gameplay") {
      ambientRef.current?.playAsync().catch(() => {});
    } else if (mode === "power") {
      powerThemeRef.current?.playAsync().catch(() => {});
    }
  }, []);

  return { playSound, enableAudio, setMode, pauseMusic, resumeMusic };
}
