import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi } from '@/services/api';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function ScannerScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();

  if (!permission) {
    // Camera permissions are still loading.
    return <View />;
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet.
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <TouchableOpacity style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);

    const saveToHistory = async (code: string, found: boolean) => {
      try {
        const history = await AsyncStorage.getItem('scanHistory');
        const list = history ? JSON.parse(history) : [];
        list.unshift({
          barcode: code,
          timestamp: new Date().toISOString(),
          synced: false,
          status: found ? 'Success' : 'Not Found'
        });
        await AsyncStorage.setItem('scanHistory', JSON.stringify(list.slice(0, 100))); // Keep last 100
      } catch (e) {
        console.error('History save failed', e);
      }
    };

    try {
      const result = await mobileApi.scanCode(data);
      await saveToHistory(data, result.success);
      
      if (result.success) {
        // Intercepted! If found, navigate to details.
        router.push({
          pathname: '/details/[id]',
          params: { id: result.data.data.chemical.id, scanResult: JSON.stringify(result.data.data) }
        });
      } else {
        // Not found in system
        Alert.alert(
          'Code Not Found',
          `The barcode "${data}" was not recognized. Would you like to enroll this new asset?`,
          [
            { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
            { 
              text: 'Enroll', 
              onPress: () => {
                // Navigate to enrollment screen (to be implemented)
                setScanned(false);
              } 
            },
          ]
        );
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred while scanning.');
      setScanned(false);
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'code128', 'code39'],
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.unfocusedContainer}></View>
          <View style={styles.focusedContainer}>
            <View style={styles.cornerTopLeft} />
            <View style={styles.cornerTopRight} />
            <View style={styles.cornerBottomLeft} />
            <View style={styles.cornerBottomRight} />
          </View>
          <View style={styles.unfocusedContainer}>
             <Text style={styles.instructionText}>Align barcode/QR within the frame</Text>
          </View>
        </View>
      </CameraView>
      {scanned && (
        <TouchableOpacity style={styles.rescanButton} onPress={() => setScanned(false)}>
          <Text style={styles.rescanText}>Tap to Scan Again</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  message: {
    textAlign: 'center',
    paddingBottom: 10,
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  unfocusedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusedContainer: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    position: 'relative',
  },
  instructionText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  button: {
    backgroundColor: '#6366f1',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  rescanButton: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 15,
    borderRadius: 25,
  },
  rescanText: {
    color: 'white',
    fontWeight: 'bold',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 40,
    height: 40,
    borderTopWidth: 5,
    borderLeftWidth: 5,
    borderColor: '#6366f1',
  },
  cornerTopRight: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderTopWidth: 5,
    borderRightWidth: 5,
    borderColor: '#6366f1',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 5,
    borderLeftWidth: 5,
    borderColor: '#6366f1',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderBottomWidth: 5,
    borderRightWidth: 5,
    borderColor: '#6366f1',
  },
});
