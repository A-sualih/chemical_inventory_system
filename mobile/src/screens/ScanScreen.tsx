import React, { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { parseScanCode } from '../utils/scanCode';
import { getTransactionRoleFlags } from '../utils/roles';
import { ViewerScanCard } from '../components/ViewerScanCard';
import type { ScanResult } from '../types';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, Card, Input, Screen, Subtitle, Title } from '../components/ui';

const BARCODE_TYPES = ['qr', 'code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] as const;

type OpMode = 'view' | 'in' | 'out';

/**
 * Adaptive Scanner — parity with web ScanQR.jsx + TransactionSystem role rules
 *
 * - Lab Manager: Quick View + Check-In/Out (±1 quick-scan)
 * - Lab Technician: Quick View; Check-Out → Requests; Check-In uses quick-scan (same as web Laboratory Staff)
 * - Safety Officer / Viewer: Quick View only — full safety profile, no stock moves
 */
export default function ScanScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [permission, requestPermission] = useCameraPermissions();
  const scrollRef = useRef<ScrollView>(null);

  const { isViewer, isLabStaff, isLabManager, canQuickStock } = getTransactionRoleFlags(
    user?.role
  );

  const availableModes = useMemo(() => {
    const view = { id: 'view' as const, label: 'Quick View', desc: 'Read details' };
    const checkIn = { id: 'in' as const, label: 'Check-In', desc: '+1 container' };
    const checkOut = { id: 'out' as const, label: 'Check-Out', desc: '-1 container' };

    // Safety / Viewer: inspection only (website Fast Track is read-only for them)
    if (isViewer) return [view];
    // Lab Technician: view + out (request) + in (web ScanQR still allows IN for Laboratory Staff)
    if (isLabStaff) return [view, checkIn, checkOut];
    // Lab Manager (and any other stock-capable role)
    return [view, checkIn, checkOut];
  }, [isViewer, isLabStaff]);

  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(true);
  const [scanFormat, setScanFormat] = useState<'auto' | 'qr' | 'barcode'>('auto');
  const [opMode, setOpMode] = useState<OpMode>('view');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [scanPayload, setScanPayload] = useState<any>(null);
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    chemical?: string;
    newQty?: string;
  } | null>(null);

  // Keep selected mode valid when role-limited modes change
  React.useEffect(() => {
    if (!availableModes.some((m) => m.id === opMode)) {
      setOpMode('view');
    }
  }, [availableModes, opMode]);

  const barcodeTypes =
    scanFormat === 'qr'
      ? (['qr'] as const)
      : scanFormat === 'barcode'
        ? (['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e'] as const)
        : BARCODE_TYPES;

  const scrollToResults = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  };

  const routeLabStaffToRequest = async (code: string) => {
    try {
      const { data } = await api.get(`/transactions/scan/${encodeURIComponent(code)}`);
      const payload = data?.data || data;
      const chemId = payload?.chemical?._id || payload?.chemical?.id || code;
      navigation.navigate('Main', {
        screen: 'Requests',
        params: { chemical_id: String(chemId) },
      });
    } catch (e: any) {
      setError(e.response?.data?.error || 'Could not resolve chemical for request.');
      scrollToResults();
    }
  };

  const processCode = async (raw: string) => {
    const code = parseScanCode(raw);
    if (!code) return;

    setLoading(true);
    setError('');
    setLastResult(null);
    setScanning(false);
    setManualCode(code);

    // Lab Technician Check-Out → Requests (website ScanQR Laboratory Staff + out)
    if (isLabStaff && opMode === 'out') {
      setLoading(false);
      await routeLabStaffToRequest(code);
      return;
    }

    if (opMode === 'view' || isViewer) {
      try {
        const { data } = await api.get(`/transactions/scan/${encodeURIComponent(code)}`);
        const payload = data?.data || data;
        setScanPayload(payload);
        setResult({
          found: true,
          data: {
            chemical: {
              id: payload.chemical?.id || payload.chemical?._id,
              name: payload.chemical?.name,
              cas: payload.chemical?.cas_number,
            },
            container: payload.container
              ? {
                  id: payload.container.container_id || payload.container.id,
                  quantity: payload.container.quantity,
                  unit: payload.container.unit,
                  status: payload.container.status,
                  location: payload.container.location || '',
                  _id: payload.container._id,
                }
              : null,
          },
        });
        scrollToResults();
      } catch (e: any) {
        setResult(null);
        setScanPayload(null);
        setError(e.response?.data?.error || e.response?.data?.message || 'Scan failed');
        scrollToResults();
      } finally {
        setLoading(false);
      }
      return;
    }

    // Stock movements: Lab Manager full; Lab Tech Check-In only (out handled above)
    if (!canQuickStock || isViewer) {
      setError('Your role cannot perform quick stock movements.');
      setLoading(false);
      scrollToResults();
      return;
    }

    try {
      const action = opMode === 'in' ? 'IN' : 'OUT';
      const { data } = await api.post('/inventory/quick-scan', {
        chemical_id: code,
        action,
      });
      setLastResult({
        success: true,
        message: data.message,
        chemical: data.chemicalName,
        newQty: `${data.newQty} ${data.unit}`,
      });
      scrollToResults();
    } catch (e: any) {
      setLastResult({
        success: false,
        message: e.response?.data?.error || 'Transaction failed',
      });
      scrollToResults();
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
        <ScrollView
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Title>Camera access</Title>
          <Subtitle>Needed to scan barcodes and QR codes in the lab.</Subtitle>
          <Button label="Allow camera" onPress={() => void requestPermission()} />
          <ManualEntry
            styles={styles}
            value={manualCode}
            onChange={setManualCode}
            onSubmit={() => void processCode(manualCode)}
            loading={loading}
          />
        </ScrollView>
      </Screen>
    );
  }

  const chemicalId = result?.data?.chemical?.id;

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 48 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <View style={{ paddingHorizontal: 16 }}>
          <Title>Adaptive Scanner</Title>
          <Subtitle>
            {isViewer
              ? 'Safety inspection mode — scan for PPE, SDS, and hazard details.'
              : isLabStaff
                ? 'Check-Out opens a usage request. Check-In adjusts stock by one container.'
                : 'Select operation mode and scan labels for instant processing.'}
          </Subtitle>

          <View style={styles.modeRow}>
            {availableModes.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  setOpMode(m.id);
                  setLastResult(null);
                  setResult(null);
                  setScanPayload(null);
                  setError('');
                }}
                style={[styles.opMode, opMode === m.id && styles.opModeOn]}
              >
                <Text style={[styles.opModeLabel, opMode === m.id && styles.opModeLabelOn]}>
                  {m.label}
                </Text>
                <Text style={styles.opModeDesc}>
                  {isLabStaff && m.id === 'out' ? 'Open request' : m.desc}
                </Text>
              </Pressable>
            ))}
          </View>

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
                onPress={() => setScanFormat(m.id)}
                style={[styles.modeChip, scanFormat === m.id && styles.modeChipOn]}
              >
                <Text style={[styles.modeChipText, scanFormat === m.id && styles.modeChipTextOn]}>
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
              onBarcodeScanned={({ data }) => void processCode(data)}
            />
            <View style={styles.overlay} pointerEvents="none">
              <View
                style={[
                  styles.frame,
                  scanFormat === 'qr' && styles.frameQr,
                  scanFormat === 'barcode' && styles.frameBarcode,
                ]}
              />
              <Text style={styles.hint}>
                {scanFormat === 'qr'
                  ? 'Center the QR code'
                  : scanFormat === 'barcode'
                    ? 'Align the barcode in the band'
                    : 'Align QR or barcode in the frame'}
              </Text>
            </View>
            <Pressable
              style={styles.stopBtn}
              onPress={() => {
                setScanning(false);
              }}
            >
              <Text style={styles.stopBtnText}>Stop camera</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraOff}>
            <Text style={styles.cameraOffText}>Camera stopped</Text>
            <Pressable
              style={styles.startBtn}
              onPress={() => {
                setScanning(true);
                setResult(null);
                setScanPayload(null);
                setError('');
                setLastResult(null);
              }}
            >
              <Text style={styles.startBtnText}>Start camera</Text>
            </Pressable>
          </View>
        )}

        <View style={{ paddingHorizontal: 16 }}>
          {!scanning ? (
            <Button
              label="Scan again"
              variant="ghost"
              onPress={() => {
                setScanning(true);
                setResult(null);
                setScanPayload(null);
                setError('');
                setLastResult(null);
              }}
            />
          ) : null}

          <ManualEntry
            styles={styles}
            value={manualCode}
            onChange={setManualCode}
            onSubmit={() => void processCode(manualCode)}
            loading={loading}
          />

          {lastResult ? (
            <Card>
              <Text
                style={[
                  styles.resultTitle,
                  { color: lastResult.success ? colors.success : colors.danger },
                ]}
              >
                {lastResult.success ? 'Success' : 'Failed'}
              </Text>
              <Text style={styles.meta}>{lastResult.message}</Text>
              {lastResult.chemical ? (
                <Text style={styles.meta}>
                  {lastResult.chemical} · {lastResult.newQty}
                </Text>
              ) : null}
            </Card>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {(opMode === 'view' || isViewer) && result?.found && result.data ? (
            <>
              {isViewer && scanPayload?.chemical ? (
                <ViewerScanCard
                  chemical={scanPayload.chemical}
                  container={scanPayload.container}
                  warnings={scanPayload.warnings || []}
                />
              ) : (
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
                  {scanPayload?.warnings?.length
                    ? scanPayload.warnings.map((w: string, i: number) => (
                        <Text key={i} style={styles.warn}>
                          ⚠ {w}
                        </Text>
                      ))
                    : null}
                </Card>
              )}

              <View style={{ gap: 8, marginTop: 8 }}>
                {isLabStaff && chemicalId ? (
                  <Button
                    label="Submit request"
                    onPress={() =>
                      navigation.navigate('Main', {
                        screen: 'Requests',
                        params: { chemical_id: chemicalId },
                      })
                    }
                  />
                ) : null}

                {chemicalId ? (
                  <Button
                    label="Open chemical details"
                    variant="ghost"
                    onPress={() => navigation.navigate('ChemicalDetail', { id: chemicalId })}
                  />
                ) : null}

                {isLabManager ? (
                  <Button
                    label="Open Fast Check-In/Out"
                    variant="ghost"
                    onPress={() => navigation.navigate('Transactions')}
                  />
                ) : null}
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
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
        placeholder="Manual barcode entry / handheld scan"
        value={value}
        onChangeText={onChange}
        autoCapitalize="none"
        onSubmitEditing={onSubmit}
      />
      <Button label="Process ID" onPress={onSubmit} loading={loading} disabled={!value.trim()} />
      <Text style={styles.handheldHint}>
        Scanning with a handheld device? Focus the input above and pull the trigger.
      </Text>
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
    frameQr: { width: 220, height: 220, borderRadius: 20 },
    frameBarcode: { width: '88%', height: 110, borderRadius: 14 },
    hint: {
      color: '#fff',
      marginTop: 14,
      fontWeight: '800',
      fontSize: 13,
      textShadowColor: '#000',
      textShadowRadius: 8,
    },
    stopBtn: {
      position: 'absolute',
      top: 12,
      right: 12,
      backgroundColor: colors.danger,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      zIndex: 10,
    },
    stopBtnText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
    },
    cameraOff: {
      height: 160,
      marginVertical: 12,
      marginHorizontal: 16,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    cameraOffText: {
      color: colors.muted,
      fontWeight: '700',
      fontSize: 14,
    },
    startBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 18,
      paddingVertical: 12,
    },
    startBtnText: {
      color: colors.btnText,
      fontWeight: '800',
      fontSize: 14,
    },
    modeRow: { flexDirection: 'row', gap: 8, marginBottom: 8, marginTop: 4, flexWrap: 'wrap' },
    opMode: {
      flex: 1,
      minWidth: '30%',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 10,
    },
    opModeOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    opModeLabel: { color: colors.text, fontWeight: '900', fontSize: 13 },
    opModeLabelOn: { color: colors.accent },
    opModeDesc: { color: colors.muted, fontSize: 10, marginTop: 2 },
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
    handheldHint: { color: colors.muted, fontSize: 11, textAlign: 'center', marginTop: 4 },
    error: { color: colors.danger, marginBottom: 8, fontWeight: '600' },
    resultTitle: { fontWeight: '900', fontSize: 16 },
    chemName: { color: colors.text, fontSize: 20, fontWeight: '900' },
    meta: { color: colors.muted, marginTop: 4, fontSize: 13 },
    warn: { color: colors.danger, fontSize: 12, marginTop: 4 },
  });
}
