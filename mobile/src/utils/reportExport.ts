import { Alert, Platform, Share } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { api } from '../api/client';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function exportInventoryReport(type: 'excel' | 'pdf') {
  try {
    const response = await api.get(`/reports/export/${type}`, { responseType: 'arraybuffer' });
    const ext = type === 'excel' ? 'xlsx' : 'pdf';
    const filename = `inventory_report.${ext}`;
    const base64 = arrayBufferToBase64(response.data as ArrayBuffer);
    const uri = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await Share.share(
      Platform.OS === 'ios'
        ? { url: uri, title: filename }
        : { message: filename, url: uri, title: filename }
    );
  } catch (e: any) {
    const msg = e.response?.data?.error || `Failed to export ${type}.`;
    if (Platform.OS === 'web') {
      window.alert(`Export\n\n${msg}`);
    } else {
      Alert.alert('Export', msg);
    }
  }
}
