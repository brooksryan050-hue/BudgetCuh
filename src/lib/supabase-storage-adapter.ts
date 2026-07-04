import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Android's SecureStore backing (encrypted SharedPreferences) enforces a ~2048-byte
 * per-key value limit. A serialized Supabase session (access token + refresh token +
 * full user object) can exceed that, so values are split into chunks under
 * `${key}_0`, `${key}_1`, ... plus a `${key}_chunks` count key. iOS Keychain has no
 * such limit but reassembles the same way.
 *
 * expo-secure-store has no web implementation at all (it throws on any call), and
 * there's no browser equivalent of OS-level secure storage anyway, so web falls back
 * to plain AsyncStorage (localStorage), matching this app's existing
 * `Platform.OS === 'web'`-guard convention for native-only APIs (see sound.ts,
 * notifications-native.ts).
 */
const CHUNK_SIZE = 1800;

function chunkCountKey(key: string): string {
  return `${key}_chunks`;
}

// AsyncStorage's web backend touches `window.localStorage` directly, which throws
// during Expo Router's static Node prerender pass (`web.output: "static"` in app.json,
// no `window` global there) — swallow that the same way create-persisted-store.ts's
// own hydration read does, since "storage unavailable" and "no session yet" mean the
// same thing to a caller.
const webStorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key).catch(() => null),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value).catch(() => {}),
  removeItem: (key: string) => AsyncStorage.removeItem(key).catch(() => {}),
};

const secureStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunkCountRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    if (!chunkCountRaw) return null;

    const chunkCount = parseInt(chunkCountRaw, 10);
    const chunks: string[] = [];
    for (let i = 0; i < chunkCount; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      if (chunk === null) return null;
      chunks.push(chunk);
    }
    return chunks.join('');
  },

  async setItem(key: string, value: string): Promise<void> {
    const previousChunkCountRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const previousChunkCount = previousChunkCountRaw ? parseInt(previousChunkCountRaw, 10) : 0;

    const newChunks: string[] = [];
    for (let offset = 0; offset < value.length; offset += CHUNK_SIZE) {
      newChunks.push(value.slice(offset, offset + CHUNK_SIZE));
    }

    await Promise.all(newChunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)));
    await SecureStore.setItemAsync(chunkCountKey(key), String(newChunks.length));

    for (let i = newChunks.length; i < previousChunkCount; i++) {
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },

  async removeItem(key: string): Promise<void> {
    const chunkCountRaw = await SecureStore.getItemAsync(chunkCountKey(key));
    const chunkCount = chunkCountRaw ? parseInt(chunkCountRaw, 10) : 0;
    await Promise.all(
      Array.from({ length: chunkCount }, (_, i) => SecureStore.deleteItemAsync(`${key}_${i}`))
    );
    await SecureStore.deleteItemAsync(chunkCountKey(key));
  },
};

export const chunkedSecureStorageAdapter =
  Platform.OS === 'web' ? webStorageAdapter : secureStorageAdapter;
