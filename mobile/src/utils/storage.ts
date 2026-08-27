import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore on device; localStorage in the browser (PC web preview).
 *
 * IMPORTANT: expo-secure-store has a ~2048 byte limit per value on native.
 * If a value exceeds this, the write silently fails or throws.
 * Callers that store large payloads (e.g. user JSON) should use
 * `largeStorageSet/Get/Delete` instead, which chunk the data.
 */

// ─── Small-value helpers (token, branding cache — under 2 KB) ──────────────

export async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  try {
    return await SecureStore.getItemAsync(key);
  } catch (err) {
    console.warn(`[storage] getItemAsync("${key}") failed:`, err);
    return null;
  }
}

export async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[storage] localStorage.setItem("${key}") failed:`, err);
    }
    return;
  }
  try {
    await SecureStore.setItemAsync(key, value);
  } catch (err) {
    console.warn(`[storage] setItemAsync("${key}") failed (${value.length} bytes):`, err);
  }
}

export async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(key);
  } catch (err) {
    console.warn(`[storage] deleteItemAsync("${key}") failed:`, err);
  }
}

// ─── Large-value helpers (user JSON — can exceed 2 KB) ─────────────────────
// Chunks the value into ≤1800-byte segments stored under key__0, key__1, etc.
// A meta key stores the chunk count.

const CHUNK_SIZE = 1800; // stay well under the 2048-byte SecureStore ceiling

export async function largeStorageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.setItem(key, value);
    } catch (err) {
      console.warn(`[storage] localStorage.setItem("${key}") failed:`, err);
    }
    return;
  }

  try {
    const chunks: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK_SIZE) {
      chunks.push(value.slice(i, i + CHUNK_SIZE));
    }

    // Write all chunks
    for (let i = 0; i < chunks.length; i++) {
      await SecureStore.setItemAsync(`${key}__${i}`, chunks[i]);
    }
    // Write chunk count
    await SecureStore.setItemAsync(`${key}__meta`, String(chunks.length));

    // Clean up any leftover chunks from a previously longer value
    let cleanup = chunks.length;
    while (cleanup < 20) {
      try {
        const old = await SecureStore.getItemAsync(`${key}__${cleanup}`);
        if (!old) break;
        await SecureStore.deleteItemAsync(`${key}__${cleanup}`);
      } catch {
        break;
      }
      cleanup++;
    }
  } catch (err) {
    console.warn(`[storage] largeStorageSet("${key}") failed:`, err);
  }
}

export async function largeStorageGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  try {
    const metaRaw = await SecureStore.getItemAsync(`${key}__meta`);
    if (!metaRaw) {
      // Fallback: try reading the key directly (migration from old non-chunked storage)
      return await SecureStore.getItemAsync(key);
    }
    const count = parseInt(metaRaw, 10);
    if (isNaN(count) || count <= 0) return null;

    let result = '';
    for (let i = 0; i < count; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}__${i}`);
      if (chunk === null) {
        console.warn(`[storage] largeStorageGet("${key}") missing chunk ${i}/${count}`);
        return null;
      }
      result += chunk;
    }
    return result;
  } catch (err) {
    console.warn(`[storage] largeStorageGet("${key}") failed:`, err);
    return null;
  }
}

export async function largeStorageDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }

  try {
    // Delete meta
    const metaRaw = await SecureStore.getItemAsync(`${key}__meta`);
    const count = metaRaw ? parseInt(metaRaw, 10) : 0;
    for (let i = 0; i < Math.max(count, 10); i++) {
      try {
        await SecureStore.deleteItemAsync(`${key}__${i}`);
      } catch {
        /* ignore missing chunks */
      }
    }
    try {
      await SecureStore.deleteItemAsync(`${key}__meta`);
    } catch {
      /* ignore */
    }
    // Also delete the direct key (migration cleanup)
    try {
      await SecureStore.deleteItemAsync(key);
    } catch {
      /* ignore */
    }
  } catch (err) {
    console.warn(`[storage] largeStorageDelete("${key}") failed:`, err);
  }
}
