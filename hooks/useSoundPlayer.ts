import { useCallback, useEffect, useRef } from "react";
import { Audio } from "expo-av";
import { loadSoundSettings, getSoundSettingsSync } from "@/utils/soundSettings";

const AMBIENT_SRC     = require("../assets/sounds/ambient.wav");
const POWER_THEME_SRC = require("../assets/sounds/power_theme.wav");
const BRAINS_SRC      = require("../assets/sounds/brains_sfx.m4a");
const PARAMEDICS_SRC  = require("../assets/sounds/paramedics_sfx.m4a");

type SoundName = "ambient" | "brain" | "death" | "power";
type MusicMode = "menu" | "gameplay" | "power";

export function useSoundPlayer() {
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

    loadSoundSettings().catch(() => {});
    load();

    return () => {
      mounted = false;
      [ambientRef, powerThemeRef, brainsRef, paramedicsRef].forEach((r) => {
        const s = r.current;
        r.current = null;
        s?.stopAsync().then(() => s.unloadAsync()).catch(() => {});
      });
    };
  }, []);

  // First touch — enable audio (menu screen is silent, gameplay starts on mode change)
  const enableAudio = useCallback(() => {
    if (enabledRef.current) return;
    enabledRef.current = true;
    currentModeRef.current = "menu";
  }, []);

  const setMode = useCallback((mode: MusicMode) => {
    if (!enabledRef.current) return;
    if (currentModeRef.current === mode) return;
    currentModeRef.current = mode;

    if (!getSoundSettingsSync().musicEnabled) return;

    if (mode === "menu") {
      ambientRef.current?.pauseAsync().catch(() => {});
      powerThemeRef.current?.stopAsync().then(() =>
        powerThemeRef.current?.setPositionAsync(0)
      ).catch(() => {});
    } else if (mode === "gameplay") {
      powerThemeRef.current?.stopAsync().then(() =>
        powerThemeRef.current?.setPositionAsync(0)
      ).catch(() => {});
      ambientRef.current?.playAsync().catch(() => {});
    } else if (mode === "power") {
      ambientRef.current?.pauseAsync().catch(() => {});
      powerThemeRef.current?.setPositionAsync(0).then(() =>
        powerThemeRef.current?.playAsync()
      ).catch(() => {});
    }
  }, []);

  const playSound = useCallback((name: SoundName) => {
    if (!enabledRef.current) return;
    if (!getSoundSettingsSync().sfxEnabled) return;
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

  const pauseMusic = useCallback(() => {
    if (!enabledRef.current) return;
    ambientRef.current?.pauseAsync().catch(() => {});
    powerThemeRef.current?.pauseAsync().catch(() => {});
  }, []);

  const resumeMusic = useCallback(() => {
    if (!enabledRef.current) return;
    const mode = currentModeRef.current;
    if (mode === "gameplay") {
      ambientRef.current?.playAsync().catch(() => {});
    } else if (mode === "power") {
      powerThemeRef.current?.playAsync().catch(() => {});
    }
    // "menu" mode is silent
  }, []);

  return { playSound, enableAudio, setMode, pauseMusic, resumeMusic };
}
