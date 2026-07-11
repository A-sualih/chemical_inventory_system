import axios from 'axios';

/**
 * Sends a silent ping request to the backend keep-alive endpoint once per day
 * to maintain active database and server connections.
 */
export const runKeepAliveService = async () => {
  const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  const LAST_PING_KEY = 'chemical_inventory_keep_alive_last_ping';
  const lastPing = localStorage.getItem(LAST_PING_KEY);
  const now = Date.now();

  if (!lastPing || now - Number(lastPing) > ONE_DAY) {
    try {
      // Direct silent ping in the background
      const res = await axios.get('/api/public/keep-alive');
      if (res.data && res.data.success) {
        localStorage.setItem(LAST_PING_KEY, now.toString());
        console.log('[Keep-Alive Service] Connection maintained. DB active count:', res.data.data?.activeCount);
      }
    } catch (err) {
      // Silent error catching in general use, logged to console
      console.warn('[Keep-Alive Service] Inactivity threshold check failed:', err.message || err);
    }
  }
};
