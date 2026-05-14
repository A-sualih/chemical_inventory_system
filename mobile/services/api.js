import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://YOUR_HOST_IP:5001/api'; // Update with your actual machine IP

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
});

// Attach token to requests
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('userToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const mobileApi = {
  /**
   * Scan a code and get the intercepted result
   */
  scanCode: async (code) => {
    try {
      const response = await api.get(`/mobile/scan/${encodeURIComponent(code)}`);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.message || 'Scan lookup failed',
        code: code 
      };
    }
  },

  /**
   * Sync offline scan history
   */
  syncHistory: async (scans) => {
    try {
      const response = await api.post('/mobile/history/sync', { scans });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

export default api;
