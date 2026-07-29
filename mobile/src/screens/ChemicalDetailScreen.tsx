import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import ChemicalHistoryModal from '../components/chemicals/ChemicalHistoryModal';
import HazardBadges from '../components/chemicals/HazardBadges';
import NFPADiamond from '../components/chemicals/NFPADiamond';
import StockActionModal from '../components/chemicals/StockActionModal';
import { ChemicalCodePanel } from '../components/ChemicalCodePanel';
import { assetUrl } from '../utils/assetUrl';
import { toneForStatus } from '../utils/apiHelpers';
import { fmtQty } from '../utils/formatQuantity';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, Card, EmptyState, Screen, SectionLabel, Subtitle, Title } from '../components/ui';

export default function ChemicalDetailScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const id = route.params?.id as string;
  const { hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [chemical, setChemical] = useState<any>(null);
  const [batches, setBatches] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [codeView, setCodeView] = useState<'qr' | 'barcode'>('qr');
  const [stockOpen, setStockOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canEdit = hasPermission('edit_chemical');
  const canDelete = hasPermission('delete_chemical');
  const canStock = hasPermission('update_stock');

  const fetchAll = useCallback(async () => {
    try {
      const [chemRes, batchRes, contRes] = await Promise.all([
        api.get(`/chemicals/${id}`),
        api.get('/batches', { params: { chemical_id: id } }),
        api.get('/containers', { params: { chemical_id: id } }),
      ]);
      setChemical(chemRes.data.chemical || chemRes.data);
      setBatches(Array.isArray(batchRes.data) ? batchRes.data : []);
      setContainers(Array.isArray(contRes.data) ? contRes.data : []);
      setError('');
    } catch (e: any) {
      setError((prev) => prev || e.response?.data?.error || 'Asset lookup failed.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void fetchAll();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void fetchAll();
    }, [fetchAll])
  );

  const stockPercentage = chemical
    ? Math.min(100, (chemical.quantity / (chemical.threshold * 4)) * 100)
    : 0;
  const thresholdPercentage = chemical ? (chemical.threshold / (chemical.threshold * 4)) * 100 : 0;

  const handleQuickAction = async (action: 'IN' | 'OUT') => {
    try {
      const { data } = await api.post('/inventory/quick-scan', {
        chemical_id: chemical.id,
        action,
      });
      setChemical((prev: any) => ({ ...prev, quantity: data.newQty }));
      await dialog.alert(
        'Success',
        `${action === 'IN' ? 'Check-in' : 'Check-out'} successful. New quantity: ${data.newQty} ${data.unit}`
      );
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Transaction failed');
    }
  };

  const openSds = async () => {
    const url = assetUrl(chemical.sds_file_url);
    if (!url) return;
    const ok = await Linking.canOpenURL(url);
    if (ok) await Linking.openURL(url);
    else await dialog.alert('Error', 'Cannot open SDS document.');
  };

  const downloadSds = async () => {
    const url = assetUrl(chemical.sds_file_url);
    if (url) await Linking.openURL(url);
  };

  const handleExportSds = async () => {
    if (chemical.sds_file_url) {
      await openSds();
      return;
    }
    setExporting(true);
    try {
      await api.get(`/safety/export-sds/${chemical.id}`);
      await dialog.alert('Export ready', 'Secure SDS export is generated on the server. Use View SDS or the web portal for authenticated PDF download.');
    } catch {
      await dialog.alert('Error', 'Failed to generate secure SDS export.');
    } finally {
      setExporting(false);
    }
  };

  const toggleArchive = async () => {
    const ok = await dialog.confirm({
      title: chemical.archived ? 'Restore asset?' : 'Archive asset?',
      message: chemical.archived
        ? 'Restore this asset to active inventory?'
        : 'Archive this asset for safety compliance?',
      confirmLabel: chemical.archived ? 'Restore' : 'Archive',
      danger: !chemical.archived,
    });
    if (!ok) return;
    try {
      if (chemical.archived) await api.put(`/chemicals/${chemical.id}/restore`);
      else await api.delete(`/chemicals/${chemical.id}`);
      await fetchAll();
    } catch {
      await dialog.alert('Error', 'State synchronization failed.');
    }
  };

  if (error && !chemical) {
    return (
      <Screen>
        <EmptyState title="Asset not found" body={`CIMS-${id} does not exist in the active registry.`} />
        <Button label="Back to inventory" onPress={() => navigation.navigate('Main', { screen: 'Chemicals' })} />
      </Screen>
    );
  }

  if (!chemical) {
    return (
      <Screen>
        <Subtitle>Synchronizing laboratory data…</Subtitle>
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchAll} tintColor={colors.accent} />}
      >
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Return to registry</Text>
        </Pressable>

        <Card>
          <View style={styles.codeToggle}>
            {(['qr', 'barcode'] as const).map((v) => (
              <Pressable key={v} onPress={() => setCodeView(v)} style={[styles.codeBtn, codeView === v && styles.codeBtnOn]}>
                <Text style={[styles.codeBtnText, codeView === v && styles.codeBtnTextOn]}>
                  {v === 'qr' ? 'QR Code' : 'Barcode'}
                </Text>
              </Pressable>
            ))}
          </View>

          <ChemicalCodePanel
            chemicalId={chemical.id || chemical._id}
            barcode={chemical.barcode}
            mode={codeView}
          />

          <Title>{chemical.name}</Title>
          <View style={styles.metaRow}>
            <Text style={styles.metaChip}>CAS {chemical.cas_number || 'N/A'}</Text>
            <Text style={styles.metaChip}>{chemical.formula || 'No formula'}</Text>
          </View>
          <Badge label={`${chemical.status || 'Unknown'} protocol`} tone={toneForStatus(chemical.status)} />
        </Card>

        <Card>
          <SectionLabel>Hazard classification</SectionLabel>
          {chemical.ghs_hazards?.signal_word && chemical.ghs_hazards.signal_word !== 'None' ? (
            <Badge
              label={chemical.ghs_hazards.signal_word}
              tone={chemical.ghs_hazards.signal_word.toLowerCase() === 'danger' ? 'danger' : 'warn'}
            />
          ) : null}
          <View style={{ marginTop: 8 }}>
            <HazardBadges hazards={chemical.ghs_classes} />
          </View>
          <View style={{ marginTop: 12 }}>
            <NFPADiamond ratings={chemical.nfpa_rating} />
          </View>
        </Card>

        <Card>
          <SectionLabel>Safety data sheet (SDS)</SectionLabel>
          {chemical.sds_file_url ? (
            <>
              <Text style={styles.sdsName}>{chemical.sds_file_name || `SDS_CIMS-${chemical.id}.pdf`}</Text>
              <Text style={styles.hint}>Verified document</Text>
              <View style={styles.btnRow}>
                <Button label="View SDS" onPress={() => void openSds()} />
                <Button label="Download" variant="ghost" onPress={() => void downloadSds()} />
              </View>
            </>
          ) : (
            <Text style={styles.hint}>No verified SDS attached. Attach via the inventory editor.</Text>
          )}
        </Card>

        <Card>
          <SectionLabel>Inventory intelligence</SectionLabel>
          <Text style={styles.bigQty}>
            {fmtQty(chemical.quantity, chemical.unit).split(' ')[0]}
            <Text style={styles.unitLabel}> {chemical.unit}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${stockPercentage}%` }]} />
            <View style={[styles.thresholdMarker, { left: `${thresholdPercentage}%` }]} />
          </View>
          <Text style={styles.hint}>
            Minimum safety threshold: {fmtQty(chemical.threshold, chemical.unit)} · {Math.round(stockPercentage)}% of
            capacity
          </Text>
        </Card>

        <Card>
          <SectionLabel>Rapid response protocols</SectionLabel>
          <Text style={styles.protocolLabel}>First aid</Text>
          <Text style={styles.protocolText}>
            {chemical.emergency_response?.first_aid || 'Standard first aid protocol.'}
          </Text>
          <Text style={styles.protocolLabel}>Spill control</Text>
          <Text style={styles.protocolText}>
            {chemical.emergency_response?.neutralization || chemical.spill_instructions || 'Evacuate and contain.'}
          </Text>
          <Text style={styles.protocolLabel}>H-codes</Text>
          <View style={styles.chips}>
            {(chemical.ghs_hazards?.h_codes || []).length ? (
              chemical.ghs_hazards.h_codes.map((code: string) => <Badge key={code} label={code} tone="warn" />)
            ) : (
              <Text style={styles.hint}>None assigned</Text>
            )}
          </View>
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <SectionLabel>Operational batches</SectionLabel>
            <Badge label={`${batches.length} lots`} tone="muted" />
          </View>
          {batches.length ? (
            batches.map((batch) => (
              <View key={batch.batch_number || batch._id} style={styles.tableRow}>
                <View style={styles.rowHead}>
                  <Text style={[styles.rowTitle, { flex: 1 }]} numberOfLines={1}>
                    {batch.batch_number}
                  </Text>
                  <Badge label={batch.status || '—'} tone={toneForStatus(batch.status)} />
                </View>
                <Text style={styles.rowMeta}>
                  MFG {batch.manufacturing_date ? new Date(batch.manufacturing_date).toLocaleDateString() : 'N/A'}
                  {'  ·  '}
                  Exp {batch.expiry_date ? new Date(batch.expiry_date).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.hint}>No batch history recorded.</Text>
          )}
        </Card>

        <Card>
          <View style={styles.cardHead}>
            <SectionLabel>Asset vessel tracking</SectionLabel>
            <Badge label={`${containers.length} vessels`} tone="muted" />
          </View>
          {containers.length ? (
            containers.map((c) => (
              <Pressable
                key={c.container_id || c._id}
                style={styles.tableRow}
                onPress={() => navigation.navigate('Containers')}
              >
                <Text style={styles.rowTitle}>{c.container_id}</Text>
                <Text style={styles.rowMeta}>{c.barcode || 'NO BARCODE'}</Text>
                <Text style={styles.rowMeta}>
                  {c.building}-{c.room} (C:{c.cabinet}, S:{c.shelf})
                </Text>
                <Text style={styles.rowQty}>{fmtQty(c.quantity, c.unit)} · {c.status}</Text>
              </Pressable>
            ))
          ) : (
            <Text style={styles.hint}>No active vessels found in registry.</Text>
          )}
        </Card>

        <Card>
          <SectionLabel>Storage logistics</SectionLabel>
          <Row label="Primary facility" value={chemical.location || 'Central inventory'} styles={styles} />
          <Row
            label="Coordinate"
            value={`R:${chemical.room || '-'} · C:${chemical.cabinet || '-'} · S:${chemical.shelf || '-'}`}
            styles={styles}
          />
          <Row label="Storage temp" value={chemical.storage_temp ? `${chemical.storage_temp}°C` : '—'} styles={styles} />
          <Row label="Humidity" value={chemical.storage_humidity ? `${chemical.storage_humidity}%` : '—'} styles={styles} />
        </Card>

        <Card>
          <SectionLabel>Safety gear (PPE)</SectionLabel>
          <View style={styles.chips}>
            {(chemical.ppe_requirements || []).length ? (
              chemical.ppe_requirements.map((ppe: string) => <Badge key={ppe} label={ppe} tone="warn" />)
            ) : (
              <Text style={styles.hint}>Standard protocol gear.</Text>
            )}
          </View>
        </Card>

        <Card>
          <SectionLabel>Actions</SectionLabel>
          <Text style={styles.hint}>Print safety label is available on the web portal (/print/{chemical.id}).</Text>

          {canStock ? (
            <>
              <Button label="Inventory operation (IN/OUT/Transfer/Disposal)" onPress={() => setStockOpen(true)} />
              <Button label="Fast check-in (+1)" variant="ghost" onPress={() => void handleQuickAction('IN')} />
              <Button label="Fast check-out (-1)" variant="ghost" onPress={() => void handleQuickAction('OUT')} />
            </>
          ) : null}

          {canEdit ? (
            <Button
              label="Modify protocol (edit)"
              variant="ghost"
              onPress={() => navigation.navigate('ChemicalForm', { chemical })}
            />
          ) : null}

          <Button label="Activity ledger" variant="ghost" onPress={() => setHistoryOpen(true)} />
          <Button label={exporting ? 'Processing…' : 'Export SDS (PDF)'} variant="ghost" onPress={() => void handleExportSds()} disabled={exporting} />

          {canDelete ? (
            <Button
              label={chemical.archived ? 'Restore asset' : 'Archive record'}
              variant="danger"
              onPress={toggleArchive}
            />
          ) : null}
        </Card>
      </ScrollView>

      <StockActionModal
        chemical={chemical}
        visible={stockOpen}
        onClose={() => setStockOpen(false)}
        onSuccess={fetchAll}
      />

      <ChemicalHistoryModal
        chemical={{ id: chemical.id, name: chemical.name }}
        visible={historyOpen}
        onClose={() => setHistoryOpen(false)}
      />
    </Screen>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backBtn: { marginBottom: 8 },
    backText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
    codeToggle: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    codeBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 8,
      alignItems: 'center',
    },
    codeBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    codeBtnText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    codeBtnTextOn: { color: colors.btnText },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
    metaChip: {
      fontSize: 11,
      fontWeight: '700',
      color: colors.muted,
      backgroundColor: colors.surface2,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 8,
    },
    sdsName: { color: colors.text, fontWeight: '800', marginBottom: 4 },
    hint: { color: colors.muted, fontSize: 12, marginTop: 4 },
    btnRow: { gap: 4 },
    bigQty: { color: colors.text, fontWeight: '900', fontSize: 32 },
    unitLabel: { fontSize: 16, color: colors.muted, fontWeight: '700' },
    progressTrack: {
      height: 10,
      backgroundColor: colors.surface2,
      borderRadius: 999,
      marginTop: 12,
      overflow: 'hidden',
      position: 'relative',
    },
    progressFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
    thresholdMarker: {
      position: 'absolute',
      top: -2,
      width: 3,
      height: 14,
      backgroundColor: colors.warn,
    },
    protocolLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginTop: 8,
    },
    protocolText: { color: colors.text, fontSize: 13, marginTop: 4 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
    cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    tableRow: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingVertical: 10,
      marginTop: 4,
    },
    rowHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      marginBottom: 4,
    },
    rowTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
    rowMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    rowQty: { color: colors.text, fontWeight: '800', fontSize: 12, marginTop: 4 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, gap: 12 },
    rowLabel: { color: colors.muted, fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
    rowValue: { color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  });
}
