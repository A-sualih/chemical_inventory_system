import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { fmtQty } from '../utils/formatQuantity';
import { parseScanCode } from '../utils/scanCode';
import { getTransactionRoleFlags } from '../utils/roles';
import { ViewerScanCard } from '../components/ViewerScanCard';
import {
  Badge,
  Button,
  Card,
  CheckRow,
  EmptyState,
  Input,
  Screen,
  Subtitle,
  Title,
} from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const QTY_PRESETS = [100, 250, 500, 1000];

/**
 * Fast Track Logistics — parity with web TransactionSystem.jsx
 *
 * Role logic (same as website):
 * - Lab Manager: Check-Out / Check-In / Activity / Enroll + quantity + PPE confirm
 * - Lab Technician: scan routes to Requests (no stock mutation)
 * - Safety Officer / Viewer: read-only safety profile after scan
 */
export default function TransactionsScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  const { isViewer, isLabStaff, canFastTrackTransact } = getTransactionRoleFlags(user?.role);
  const showManagerTools = canFastTrackTransact;

  const [tab, setTab] = useState<'checkout' | 'checkin' | 'history'>('checkout');
  const [code, setCode] = useState('');
  const [qty, setQty] = useState('');
  const [notes, setNotes] = useState('');
  const [safetyVerified, setSafetyVerified] = useState({ ppe: false, hazard: false });
  const [isContaminated, setIsContaminated] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [scanError, setScanError] = useState<{ message: string; scannedCode: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/transactions/history');
      setHistory(asList(data, ['transactions', 'history', 'data']));
    } catch {
      setHistory([]);
    }
  }, []);

  const refreshScanned = useCallback(async (containerId?: string) => {
    if (!containerId) return;
    try {
      const { data } = await api.get(`/transactions/scan/${encodeURIComponent(containerId)}`);
      setResult(data?.data || data);
    } catch {
      /* silent refresh */
    }
  }, []);

  useEffect(() => {
    void loadHistory();
    const interval = setInterval(() => {
      void loadHistory();
      if (result?.container?.container_id) {
        void refreshScanned(result.container.container_id);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [loadHistory, refreshScanned, result?.container?.container_id]);

  useEffect(() => {
    if (tab === 'history') void loadHistory();
  }, [tab, loadHistory]);

  const resetScan = () => {
    setResult(null);
    setCode('');
    setQty('');
    setNotes('');
    setSafetyVerified({ ppe: false, hazard: false });
    setIsContaminated(false);
    setScanError(null);
    setMsg('');
  };

  const scrollToResults = () => {
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 150);
  };

  const routeLabStaffToRequest = (chemical: any) => {
    const chemId = chemical?._id || chemical?.id;
    if (!chemId) {
      setMsg('Could not resolve chemical for request.');
      return;
    }
    navigation.navigate('Main', {
      screen: 'Requests',
      params: { chemical_id: String(chemId) },
    });
  };

  const lookup = async (rawCode?: string) => {
    const finalCode = parseScanCode(rawCode ?? code);
    setMsg('');
    setScanError(null);
    if (!finalCode) {
      setMsg('Enter a container ID, barcode, or chemical code.');
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get(`/transactions/scan/${encodeURIComponent(finalCode)}`);
      const payload = data?.data || data;

      // Lab Technician Workflow (website): redirect to request form
      if (isLabStaff && payload?.chemical) {
        routeLabStaffToRequest(payload.chemical);
        return;
      }

      setResult(payload);
      setCode(finalCode);
      scrollToResults();
    } catch (e: any) {
      const errMsg = e.response?.data?.error || 'Scan failed';
      setScanError({ message: errMsg, scannedCode: finalCode });
      setResult(null);
      scrollToResults();
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { data } = await api.get('/chemicals', { params: { search: query, limit: 10 } });
      setSearchResults(asList(data, ['data']));
    } catch {
      setSearchResults([]);
    }
  };

  const selectChemical = async (chem: any) => {
    setLoading(true);
    setSearchQuery('');
    setSearchResults([]);
    try {
      if (isLabStaff) {
        routeLabStaffToRequest(chem);
        return;
      }
      const { data } = await api.get('/containers', {
        params: { chemical_id: chem._id, limit: 1 },
      });
      const list = asList(data, ['data']);
      if (list.length > 0) {
        await lookup(list[0].container_id);
      } else {
        setMsg('No active containers found for this chemical.');
      }
    } catch {
      setMsg('Error fetching container details.');
    } finally {
      setLoading(false);
    }
  };

  const runStock = async () => {
    if (!canFastTrackTransact || !result?.container?._id) return;
    const quantity = Number(qty);
    if (!quantity || quantity <= 0) {
      setMsg('Please enter a valid quantity.');
      return;
    }
    if (!safetyVerified.ppe || !safetyVerified.hazard) {
      setMsg('Verify all safety protocols before proceeding.');
      return;
    }

    setSubmitting(true);
    setMsg('');
    try {
      const endpoint = tab === 'checkout' ? '/transactions/checkout' : '/transactions/checkin';
      await api.post(endpoint, {
        container_id: result.container._id,
        quantity,
        returned_quantity: quantity,
        unit: result.container.unit,
        notes,
        safety_verified: {
          ppe_worn: safetyVerified.ppe,
          hazard_acknowledged: safetyVerified.hazard,
          safe_handling_verified: true,
        },
        is_contaminated: tab === 'checkin' ? isContaminated : false,
        device_info: 'CIMS Mobile',
      });
      setMsg(tab === 'checkout' ? 'Check-out completed.' : 'Check-in completed.');
      resetScan();
      await loadHistory();
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Transaction failed');
    } finally {
      setSubmitting(false);
    }
  };

  const chemical = result?.chemical;
  const container = result?.container;
  const warnings: string[] = result?.warnings || [];

  return (
    <Screen>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadHistory} tintColor={colors.accent} />
        }
        contentContainerStyle={{ paddingBottom: 48, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        <Title>Fast Track Logistics</Title>
        <Subtitle>
          {isLabStaff
            ? 'Scan chemicals to open a usage request — same flow as the website.'
            : isViewer
              ? 'Scan for safety identity, PPE, SDS, and emergency prep (read-only).'
              : 'High-speed chemical borrowing and return system.'}
        </Subtitle>

        {showManagerTools ? (
          <View style={styles.tabs}>
            {(
              [
                ['checkout', 'Check-Out'],
                ['checkin', 'Check-In'],
                ['history', 'Activity'],
              ] as const
            ).map(([id, label]) => (
              <Pressable
                key={id}
                onPress={() => setTab(id)}
                style={[styles.tab, tab === id && styles.tabOn]}
              >
                <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {showManagerTools ? (
          <View style={styles.managerActions}>
            <Button
              label="Launch camera"
              onPress={() => navigation.navigate('Main', { screen: 'Scan' })}
            />
            <Button
              label="Enroll asset"
              variant="ghost"
              onPress={() => navigation.navigate('ChemicalForm', { chemical: null })}
            />
          </View>
        ) : (
          <Button
            label="Launch camera"
            onPress={() => navigation.navigate('Main', { screen: 'Scan' })}
          />
        )}

        {tab !== 'history' || !showManagerTools ? (
          <>
            {!result ? (
              <Card>
                <Text style={styles.label}>Search by chemical name</Text>
                <Input
                  value={searchQuery}
                  onChangeText={(v) => void handleSearch(v)}
                  placeholder="Search by Chemical Name…"
                  autoCapitalize="none"
                />
                {searchResults.length > 0 ? (
                  <View style={styles.searchDrop}>
                    {searchResults.map((chem) => (
                      <Pressable
                        key={chem._id}
                        onPress={() => void selectChemical(chem)}
                        style={styles.searchItem}
                      >
                        <Text style={styles.chem}>{chem.name}</Text>
                        <Text style={styles.meta}>
                          CAS: {chem.cas_number || 'N/A'} · {fmtQty(chem.quantity, chem.unit)}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : null}

                {scanError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorTitle}>Barcode Not Found</Text>
                    <Text style={styles.meta}>{scanError.message}</Text>
                    <Text style={styles.meta}>Code: {scanError.scannedCode}</Text>
                    {showManagerTools ? (
                      <Button
                        label="Register new asset"
                        onPress={() =>
                          navigation.navigate('ChemicalForm', {
                            chemical: { barcode: scanError.scannedCode },
                          })
                        }
                      />
                    ) : null}
                    <Button label="Dismiss" variant="ghost" onPress={() => setScanError(null)} />
                  </View>
                ) : null}

                <Text style={styles.label}>Direct ID entry</Text>
                <Input
                  value={code}
                  onChangeText={setCode}
                  placeholder="Enter Barcode or ID…"
                  autoCapitalize="none"
                />
                <Button label="Scan database" onPress={() => void lookup()} loading={loading} />
              </Card>
            ) : (
              <>
                {isViewer ? (
                  <>
                    <ViewerScanCard chemical={chemical} container={container} warnings={warnings} />
                    <Button label="New scan" variant="ghost" onPress={resetScan} />
                  </>
                ) : (
                  <Card>
                    <Text style={styles.chem}>{chemical?.name}</Text>
                    <Text style={styles.meta}>
                      {chemical?.cas_number || 'No CAS'} · {chemical?.id}
                    </Text>
                    {container ? (
                      <>
                        <Text style={styles.meta}>
                          Stock: {fmtQty(container.quantity, container.unit)}
                        </Text>
                        <Text style={styles.meta}>Location: {container.location || 'Not assigned'}</Text>
                      </>
                    ) : (
                      <Badge label="No container" tone="warn" />
                    )}
                    {warnings.length > 0 ? (
                      <View style={styles.warnBox}>
                        {warnings.map((w, i) => (
                          <Text key={i} style={styles.warnText}>
                            ⚠ {w}
                          </Text>
                        ))}
                      </View>
                    ) : null}
                    {chemical?.ppe_requirements?.length ? (
                      <View style={styles.ppeRow}>
                        {chemical.ppe_requirements.map((p: string, i: number) => (
                          <Badge key={i} label={p} tone="muted" />
                        ))}
                      </View>
                    ) : null}
                  </Card>
                )}

                {canFastTrackTransact ? (
                  <Card>
                    <Text style={styles.label}>
                      {tab === 'checkout' ? 'Check-Out Quantity' : 'Return Quantity'}
                    </Text>
                    <Input
                      value={qty}
                      onChangeText={setQty}
                      keyboardType="decimal-pad"
                      placeholder={
                        container ? `Max: ${fmtQty(container.quantity, '').trim()}` : '0'
                      }
                    />
                    <View style={styles.presetRow}>
                      {QTY_PRESETS.map((v) => (
                        <Pressable key={v} onPress={() => setQty(String(v))} style={styles.preset}>
                          <Text style={styles.presetText}>+{v}</Text>
                        </Pressable>
                      ))}
                    </View>
                    <Input
                      placeholder="Notes (optional)"
                      value={notes}
                      onChangeText={setNotes}
                    />
                    <Text style={styles.label}>Confirmation check</Text>
                    <CheckRow
                      label="PPE verified and worn"
                      checked={safetyVerified.ppe}
                      onToggle={() =>
                        setSafetyVerified((s) => ({ ...s, ppe: !s.ppe }))
                      }
                    />
                    <CheckRow
                      label="Safety guidelines read"
                      checked={safetyVerified.hazard}
                      onToggle={() =>
                        setSafetyVerified((s) => ({ ...s, hazard: !s.hazard }))
                      }
                    />
                    {tab === 'checkin' ? (
                      <CheckRow
                        label="Flag for contamination?"
                        checked={isContaminated}
                        onToggle={() => setIsContaminated((v) => !v)}
                        danger
                      />
                    ) : null}
                    <Button
                      label={
                        submitting
                          ? 'Processing…'
                          : `Confirm ${tab === 'checkout' ? 'Check-Out' : 'Check-In'}`
                      }
                      onPress={() => void runStock()}
                      loading={submitting}
                    />
                    <Button label="Cancel / New Scan" variant="ghost" onPress={resetScan} />
                  </Card>
                ) : null}
              </>
            )}

            {!result ? (
              isLabStaff ? (
                <Card>
                  <Text style={styles.stationTitle}>Laboratory Assistant Station</Text>
                  <Text style={styles.meta}>
                    Session throughput: {history.length} scans
                  </Text>
                  <Text style={[styles.meta, { marginTop: 10 }]}>
                    Inventory auto-routing — any scanned item is routed to your personalized
                    requisition form (same as the website).
                  </Text>
                  <Text style={styles.meta}>
                    Safety verification — meet all PPE requirements before retrieving the chemical.
                  </Text>
                </Card>
              ) : (
                <Card>
                  <Text style={styles.label}>
                    {isViewer ? 'Safety lookup station' : 'Recent telemetry'}
                  </Text>
                  {isViewer ? (
                    <Text style={styles.meta}>
                      Safety Officers inspect identity, PPE, SDS, NFPA, and emergency prep.
                      Stock check-in/out is restricted to Lab Managers.
                    </Text>
                  ) : null}
                  {history.slice(0, 4).map((h, i) => (
                    <Text key={h._id || i} style={styles.meta}>
                      {h.chemical_name || h.chemicalName || 'Asset'} · {h.type} ·{' '}
                      {h.createdAt ? new Date(h.createdAt).toLocaleTimeString() : ''}
                    </Text>
                  ))}
                  {history.length === 0 ? (
                    <Text style={styles.meta}>Awaiting incoming telemetry…</Text>
                  ) : null}
                </Card>
              )
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.label}>Activity</Text>
            {history.length === 0 ? <EmptyState title="No transactions in this session." /> : null}
            {history.map((h, i) => (
              <Card key={h._id || i}>
                <Text style={styles.chem}>{h.chemical_name || h.chemicalName || 'Transaction'}</Text>
                <Text style={styles.meta}>
                  {h.type} · {h.user_name} ·{' '}
                  {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                </Text>
                <Text
                  style={[
                    styles.qtyDelta,
                    { color: h.type === 'Check-Out' ? colors.danger : colors.success },
                  ]}
                >
                  {h.type === 'Check-Out' ? '-' : '+'}
                  {fmtQty(h.quantity, h.unit)}
                </Text>
              </Card>
            ))}
          </>
        )}

        {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      backgroundColor: colors.surface2,
      borderRadius: 999,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
    tabOn: { backgroundColor: colors.accent },
    tabText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    tabTextOn: { color: colors.btnText },
    managerActions: { gap: 8, marginBottom: 4 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 8,
    },
    stationTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 6 },
    chem: { color: colors.text, fontWeight: '900', fontSize: 17 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    msg: { color: colors.accent, fontWeight: '700', marginTop: 10 },
    searchDrop: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      marginBottom: 8,
      overflow: 'hidden',
    },
    searchItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    errorBox: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
      marginVertical: 8,
      borderWidth: 1,
      borderColor: colors.danger,
    },
    errorTitle: { color: colors.danger, fontWeight: '900', marginBottom: 4 },
    warnBox: { marginTop: 10, padding: 10, backgroundColor: colors.surface2, borderRadius: 10 },
    warnText: { color: colors.danger, fontSize: 12, marginTop: 4 },
    ppeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
    presetRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    preset: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      backgroundColor: colors.surface2,
    },
    presetText: { color: colors.text, fontWeight: '700', fontSize: 12 },
    qtyDelta: { fontWeight: '900', fontSize: 18, marginTop: 6 },
  });
}
