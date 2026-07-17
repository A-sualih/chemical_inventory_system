import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ScanResult } from '../types';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, Card, Input, Screen, Subtitle, Title } from '../components/ui';

const BARCODE_TYPES = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] as const;

export default function ScanScreen() {
  const { hasPermission } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(true);
  const [scanMode, setScanMode] = useState<'auto' | 'qr' | 'barcode'>('auto');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState('');
  const [qty, setQty] = useState('1');
  const [actionMsg, setActionMsg] = useState('');

  const barcodeTypes =
    scanMode === 'qr'
      ? (['qr'] as const)
      : scanMode === 'barcode'
        ? (['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] as const)
        : BARCODE_TYPES;

  const lookup = async (code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    setActionMsg('');
    setScanning(false);
    try {
      const { data } = await api.get(`/mobile/scan/${encodeURIComponent(trimmed)}`);
      setResult(data);
    } catch (e: any) {
      setResult(null);
      setError(e.response?.data?.message || e.response?.data?.error || 'Scan failed');
    } finally {
      setLoading(false);
    }
  };

  const stockAction = async (mode: 'checkout' | 'checkin') => {
    if (!result?.data?.container?._id) {
      setActionMsg('No container linked — cannot update stock.');
      return;
    }
    if (!hasPermission('update_stock')) {
      setActionMsg('You do not have permission to update stock.');
      return;
    }
    setLoading(true);
    setActionMsg('');
    try {
      const payload = {
        container_id: result.data.container._id,
        quantity: Number(qty) || 1,
        unit: result.data.container.unit,
        safety_verified: true,
        device_info: 'CIMS Mobile',
        notes: `Mobile ${mode}`,
      };
      await api.post(`/transactions/${mode}`, payload);
      setActionMsg(mode === 'checkout' ? 'Checked out successfully.' : 'Checked in successfully.');
      await lookup(manualCode || result.data.container.id || result.data.chemical.id);
    } catch (e: any) {
      setActionMsg(e.response?.data?.error || `${mode} failed`);
    } finally {
      setLoading(false);
    }
  };

  if (!permission) {
    return (
      <Screen>
        <Subtitle>Requesting camera permission…</Subtitle>
      </Screen>
    );
  }

  if (!permission.granted) {
    return (
      <Screen>
        <Title>Camera access</Title>
        <Subtitle>Needed to scan barcodes and QR codes in the lab.</Subtitle>
        <Button label="Allow camera" onPress={() => void requestPermission()} />
        <Text style={styles.or}>or enter a code manually below</Text>
        <ManualEntry
          styles={styles}
          value={manualCode}
          onChange={setManualCode}
          onSubmit={() => void lookup(manualCode)}
          loading={loading}
        />
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 16 }}>
        <Title>Scan</Title>
        <Subtitle>QR labels & bottle barcodes · Fast check-in / check-out</Subtitle>
        <View style={styles.modeRow}>
          {(
            [
              { id: 'auto', label: 'Auto' },
              { id: 'qr', label: 'QR' },
              { id: 'barcode', label: 'Barcode' },
            ] as const
          ).map((m) => (
            <Pressable
              key={m.id}
              onPress={() => setScanMode(m.id)}
              style={[styles.modeChip, scanMode === m.id && styles.modeChipOn]}
            >
              <Text style={[styles.modeChipText, scanMode === m.id && styles.modeChipTextOn]}>
                {m.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {scanning ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            barcodeScannerSettings={{ barcodeTypes: [...barcodeTypes] }}
            onBarcodeScanned={({ data }) => {
              setManualCode(data);
              void lookup(data);
            }}
          />
          <View style={styles.overlay}>
            <View
              style={[
                styles.frame,
                scanMode === 'qr' && styles.frameQr,
                scanMode === 'barcode' && styles.frameBarcode,
              ]}
            />
            <Text style={styles.hint}>
              {scanMode === 'qr'
                ? 'Center the QR code'
                : scanMode === 'barcode'
                  ? 'Align the barcode in the band'
                  : 'Align QR or barcode in the frame'}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={{ paddingHorizontal: 16, paddingBottom: 24 }}>
        {!scanning ? (
          <Button
            label="Scan again"
            variant="ghost"
            onPress={() => {
              setScanning(true);
              setResult(null);
              setError('');
            }}
          />
        ) : null}

        <ManualEntry
          styles={styles}
          value={manualCode}
          onChange={setManualCode}
          onSubmit={() => void lookup(manualCode)}
          loading={loading}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        {result?.found && result.data ? (
          <Card>
            <Text style={styles.chemName}>{result.data.chemical.name}</Text>
            <Text style={styles.meta}>
              {result.data.chemical.id}
              {result.data.chemical.cas ? ` · CAS ${result.data.chemical.cas}` : ''}
            </Text>
            {result.data.container ? (
              <>
                <Text style={styles.meta}>
                  Container {result.data.container.id} · {result.data.container.quantity}{' '}
                  {result.data.container.unit} · {result.data.container.status}
                </Text>
                <Text style={styles.meta}>{result.data.container.location}</Text>
              </>
            ) : (
              <Badge label="No container linked" tone="warn" />
            )}

            <Text style={[styles.meta, { marginTop: 12 }]}>Quantity</Text>
            <Input value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
            <View style={styles.actions}>
              <View style={{ flex: 1 }}>
                <Button label="Check out" onPress={() => void stockAction('checkout')} loading={loading} />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Check in"
                  variant="ghost"
                  onPress={() => void stockAction('checkin')}
                  loading={loading}
                />
              </View>
            </View>
            {actionMsg ? <Text style={styles.actionMsg}>{actionMsg}</Text> : null}
          </Card>
        ) : null}
      </View>
    </Screen>
  );
}

function ManualEntry({
  styles,
  value,
  onChange,
  onSubmit,
  loading,
}: {
  styles: ReturnType<typeof makeStyles>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading: boolean;
}) {
  return (
    <View style={{ marginTop: 8 }}>
      <Input
        placeholder="Or type container / CAS / barcode…"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
      />
      <Button label="Look up" onPress={onSubmit} loading={loading} disabled={!value.trim()} />
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cameraWrap: {
      height: 360,
      marginVertical: 12,
      marginHorizontal: 16,
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: '#0b1220',
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    frame: {
      width: '78%',
      height: 180,
      borderWidth: 2.5,
      borderColor: colors.accent,
      borderRadius: 18,
      backgroundColor: 'transparent',
    },
    frameQr: {
      width: 220,
      height: 220,
      borderRadius: 20,
    },
    frameBarcode: {
      width: '88%',
      height: 110,
      borderRadius: 14,
    },
    hint: {
      color: '#fff',
      marginTop: 14,
      fontWeight: '800',
      fontSize: 13,
      textShadowColor: '#000',
      textShadowRadius: 8,
    },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 4, marginTop: 4 },
    modeChip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    modeChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    modeChipText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    modeChipTextOn: { color: colors.btnText },
    or: { color: colors.muted, textAlign: 'center', marginVertical: 12 },
    error: { color: colors.danger, marginBottom: 8, fontWeight: '600' },
    chemName: { color: colors.text, fontSize: 20, fontWeight: '900' },
    meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
    actions: { flexDirection: 'row', gap: 10 },
    actionMsg: { color: colors.accent, marginTop: 10, fontWeight: '700' },
  });
}
