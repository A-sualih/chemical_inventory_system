import Constants from 'expo-constants';
import { Platform } from 'react-native';

/**
 * Same Express backend as the web SPA (`/api/*`).
 *
 * PC browser preview → use localhost
 * Android emulator → 10.0.2.2
 * Physical phone → set EXPO_PUBLIC_API_URL to your LAN IP
 */
function resolveApiBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (fromEnv) {
    // On PC browser, localhost is safer than a LAN IP that may be unreachable
    if (Platform.OS === 'web' && /192\.168\.|10\.|172\./.test(fromEnv)) {
      return 'http://127.0.0.1:5001/api';
    }
    return fromEnv.replace(/\/$/, '');
  }

  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:5001/api';
  }

  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as { debuggerHost?: string }).debuggerHost ||
    '';
  const lanHost = hostUri.split(':')[0];

  if (lanHost && lanHost !== 'localhost' && lanHost !== '127.0.0.1') {
    return `http://${lanHost}:5001/api`;
  }

  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:5001/api';
  }

  return 'http://127.0.0.1:5001/api';
}

export const API_BASE_URL = resolveApiBaseUrl();
console.log(`[config] Platform: ${Platform.OS} | API_BASE_URL: ${API_BASE_URL}`);
