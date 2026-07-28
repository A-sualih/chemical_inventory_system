import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { Button, Input } from './ui';

const ALL_TYPES = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] as const;

type ScanFormat = 'auto' | 'qr' | 'barcode';

type Props = {
  value: string;
  onChange: (code: string) => void;
  editable?: boolean;
};

/**
 * Mfg. barcode / QR capture for Enroll Asset — parity with web ChemicalForm Scan Code.
 */
export function EnrollBarcodeScanner({ value, onChange, editable = true }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [scanFormat, setScanFormat] = useState<ScanFormat>('auto');
  const lockRef = useRef(false);

  useEffect(() => {
    if (!open) lockRef.current = false;
  }, [open]);

  const barcodeTypes =
    scanFormat === 'qr'
      ? (['qr'] as const)
      : scanFormat === 'barcode'
        ? (['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] as const)
        : ALL_TYPES;

  const openScanner = async () => {
    if (!editable) return;
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    lockRef.current = false;
    setOpen(true);
  };

  const onScanned = ({ data }: { data: string }) => {
    if (lockRef.current) return;
    const code = String(data || '').trim();
    if (!code) return;
    lockRef.current = true;
    onChange(code);
    setOpen(false);
  };

  return (
    <View>
      <Text style={styles.label}>
        Mfg. barcode / QR <Text style={styles.optional}>optional</Text>
      </Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Input
            placeholder="Type or scan QR / manufacturer barcode"
            value={value}
            onChangeText={onChange}
            autoCapitalize="none"
            editable={editable}
          />
        </View>
        {editable ? (
          <Pressable
            onPress={() => void openScanner()}
            style={[styles.scanBtn, open && styles.scanBtnOn]}
          >
            <Ionicons name="scan-outline" size={18} color={colors.btnText} />
            <Text style={styles.scanBtnText}>Scan Code</Text>
          </Pressable>
        ) : null}
      </View>

      {value ? (
        <Text style={styles.captured}>
          Code captured: <Text style={styles.capturedVal}>{value}</Text>
        </Text>
      ) : null}

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Scan manufacturer code</Text>
            <Pressable onPress={() => setOpen(false)} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          <Text style={styles.modalHint}>Point camera at a QR label or bottle barcode</Text>

          <View style={styles.formatRow}>
            {(
              [
                { id: 'auto' as const, label: 'Auto' },
                { id: 'qr' as const, label: 'QR' },
                { id: 'barcode' as const, label: 'Barcode' },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.id}
                onPress={() => {
                  setScanFormat(opt.id);
                  lockRef.current = false;
                }}
                style={[styles.formatChip, scanFormat === opt.id && styles.formatChipOn]}
              >
                <Text
                  style={[styles.formatChipText, scanFormat === opt.id && styles.formatChipTextOn]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.cameraWrap}>
            {permission?.granted ? (
              <CameraView
                style={StyleSheet.absoluteFill}
                barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
                onBarcodeScanned={onScanned}
              />
            ) : (
              <View style={styles.permBox}>
                <Text style={styles.modalHint}>Camera permission is required to scan.</Text>
                <Button label="Allow camera" onPress={() => void requestPermission()} />
              </View>
            )}
            <View style={styles.overlay} pointerEvents="none">
              <View
                style={[
                  styles.frame,
                  scanFormat === 'qr' && styles.frameQr,
                  scanFormat === 'barcode' && styles.frameBarcode,
                ]}
              />
            </View>
          </View>

          <Button label="Close camera" variant="ghost" onPress={() => setOpen(false)} />
        </View>
      </Modal>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 4,
    },
    optional: { color: colors.muted, fontWeight: '600', textTransform: 'none', fontSize: 10 },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    scanBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 14,
      marginTop: 0,
    },
    scanBtnOn: { opacity: 0.85 },
    scanBtnText: { color: colors.btnText, fontWeight: '800', fontSize: 12 },
    captured: { color: colors.success, fontSize: 12, fontWeight: '600', marginTop: 8 },
    capturedVal: { fontFamily: 'monospace', fontWeight: '800', color: colors.text },
    modal: {
      flex: 1,
      backgroundColor: colors.bg,
      paddingTop: 52,
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 8,
    },
    modalTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
    modalHint: { color: colors.muted, fontSize: 13, marginBottom: 12 },
    formatRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    formatChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    formatChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    formatChipText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    formatChipTextOn: { color: colors.btnText },
    cameraWrap: {
      flex: 1,
      borderRadius: 16,
      overflow: 'hidden',
      backgroundColor: '#000',
      marginBottom: 16,
      minHeight: 320,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: '70%',
      aspectRatio: 1,
      borderWidth: 2,
      borderColor: 'rgba(255,255,255,0.85)',
      borderRadius: 16,
    },
    frameQr: { aspectRatio: 1 },
    frameBarcode: { width: '85%', aspectRatio: 2.6, borderRadius: 10 },
    permBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  });
}
