import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "@more_brains:sound_settings";

export interface SoundSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
}

// In-memory cache — lets useSoundPlayer read synchronously inside callbacks.
// saveSoundSettings() updates both AsyncStorage and this cache atomically.
let _cache: SoundSettings = { musicEnabled: true, sfxEnabled: true };

export function getSoundSettingsSync(): SoundSettings {
  return _cache;
}

export async function loadSoundSettings(): Promise<SoundSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) _cache = { ..._cache, ...JSON.parse(raw) };
  } catch {}
  return _cache;
}

export async function saveSoundSettings(settings: SoundSettings): Promise<void> {
  _cache = settings;
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}
