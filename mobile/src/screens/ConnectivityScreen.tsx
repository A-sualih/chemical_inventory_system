import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { storageGet } from '../utils/storage';
import { TOKEN_KEY } from '../api/client';
import { Button, Card, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

type Integration = {
  id: string;
  name: string;
  description: string;
  provider: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
};

const DEFAULT_INTEGRATIONS: Integration[] = [
  {
    id: 'lis',
    name: 'LIS Integration',
    description: 'Connect with Laboratory Information Systems for automated test result syncing.',
    provider: 'HL7 Standard',
    icon: 'server-outline',
    active: true,
  },
  {
    id: 'erp',
    name: 'ERP Sync',
    description: 'Synchronize inventory procurement and financial data with SAP or Oracle.',
    provider: 'SAP / Oracle',
    icon: 'globe-outline',
    active: false,
  },
  {
    id: 'webhook',
    name: 'Custom Webhooks',
    description: 'Trigger external actions based on inventory threshold alerts or movements.',
    provider: 'REST API',
    icon: 'flash-outline',
    active: true,
  },
];

const RECENT_TRANSFERS = [
  { name: 'Ethanol_SDS_v2.pdf', time: '2m ago', size: '1.2MB' },
  { name: 'Lab_Asset_Registry.xlsx', time: '1h ago', size: '450KB' },
  { name: 'Safety_Protocol_2026.docx', time: '3h ago', size: '2.1MB' },
];

export default function ConnectivityScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [integrations, setIntegrations] = useState(DEFAULT_INTEGRATIONS);
  const [activeProvider, setActiveProvider] = useState<'drive' | 'aws' | 'azure'>('drive');
  const [stats, setStats] = useState({ health: '—', usage: '—' });
  const [loading, setLoading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ name: string; progress: number } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/reports/inventory');
      const total = data?.summary?.totalChemicals ?? 0;
      const expired = data?.summary?.expired ?? 0;
      const sds = total - expired;
      const health = total > 0 ? `${Math.round((sds / total) * 100)}%` : '100%';
      setStats({ health, usage: `${(total * 0.15).toFixed(1)} GB` });
    } catch {
      setStats({ health: '—', usage: '—' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((integ) => (integ.id === id ? { ...integ, active: !integ.active } : integ))
    );
  };

  const handleExportCSV = async () => {
    try {
      await api.get('/reports/export/csv', { responseType: 'arraybuffer' });
      await dialog.alert('Export', 'Inventory CSV export completed.');
    } catch (e: any) {
      await dialog.alert('Export failed', e.response?.data?.error || 'CSV export failed');
    }
  };

  const handleExportPDF = async () => {
    if (Platform.OS === 'web') {
      const token = await storageGet(TOKEN_KEY);
      const url = `${API_BASE_URL}/reports/export/pdf${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      Linking.openURL(url).catch(() => void dialog.alert('Export', 'Could not open PDF export.'));
      return;
    }
    try {
      await api.get('/reports/export/pdf', { responseType: 'arraybuffer' });
      await dialog.alert('Export', 'Inventory PDF export completed.');
    } catch (e: any) {
      await dialog.alert('Export failed', e.response?.data?.error || 'PDF export failed');
    }
  };

  const simulateUpload = (fileName: string) => {
    setUploadStatus({ name: fileName, progress: 0 });
    let p = 0;
    const interval = setInterval(() => {
      p += 10;
      setUploadStatus((prev) => (prev ? { ...prev, progress: p } : null));
      if (p >= 100) {
        clearInterval(interval);
        setTimeout(() => setUploadStatus(null), 2000);
      }
    }, 200);
  };

  const handleImportTap = () => {
    simulateUpload('inventory_manifest.csv');
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Title>Connectivity Hub</Title>
            <Subtitle>
              Master your laboratory ecosystem with enterprise-grade API integrations and cloud data orchestration.
            </Subtitle>
          </View>
          <View style={styles.statsCol}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.health}</Text>
              <Text style={styles.statLabel}>System Health</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.usage}</Text>
              <Text style={styles.statLabel}>Cloud Sync</Text>
            </View>
          </View>
        </View>

        <Text style={styles.section}>API & System Integrations</Text>
        {integrations.map((integ) => (
          <View key={integ.id} style={[styles.integCard, integ.active && styles.integCardActive]}>
            <View style={styles.integTop}>
              <View style={[styles.icon, { backgroundColor: colors.surface2 }]}>
                <Ionicons name={integ.icon} size={22} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.integName}>{integ.name}</Text>
                <Text style={styles.meta}>{integ.provider}</Text>
              </View>
              <View style={styles.toggleWrap}>
                <Text style={styles.toggleLabel}>{integ.active ? 'Online' : 'Disabled'}</Text>
                <Switch
                  value={integ.active}
                  onValueChange={() => toggleIntegration(integ.id)}
                  trackColor={{ true: colors.accent }}
                />
              </View>
            </View>
            <Text style={styles.desc}>{integ.description}</Text>
            <Pressable style={styles.configureBtn}>
              <Text style={styles.configureText}>Configure Endpoints</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addCard}>
          <Ionicons name="add-circle-outline" size={32} color={colors.muted} />
          <Text style={styles.addText}>Add New Connection</Text>
        </Pressable>

        <Text style={styles.section}>Bulk Data Exchange</Text>
        <Card>
          <Text style={styles.meta}>Last Sync: 12m ago</Text>
          <Pressable
            style={[styles.dropZone, (isDragging || uploadStatus) && styles.dropZoneActive]}
            onPressIn={() => setIsDragging(true)}
            onPressOut={() => setIsDragging(false)}
            onPress={handleImportTap}
          >
            <Ionicons name="cloud-upload-outline" size={32} color={colors.accent} />
            {uploadStatus ? (
              <View style={{ width: '100%', alignItems: 'center', marginTop: 12 }}>
                <Text style={styles.dropTitle}>Uploading {uploadStatus.name}…</Text>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${uploadStatus.progress}%` }]} />
                </View>
              </View>
            ) : (
              <>
                <Text style={styles.dropTitle}>Drop data manifest here</Text>
                <Text style={styles.desc}>Support for .CSV, .XLSX, and .JSON datasets up to 50MB</Text>
                <Text style={[styles.meta, { marginTop: 8 }]}>Tap to simulate import</Text>
              </>
            )}
          </Pressable>

          <View style={styles.exportRow}>
            <Pressable style={styles.exportBtn} onPress={() => void handleExportCSV()}>
              <Ionicons name="download-outline" size={18} color={colors.accent} />
              <Text style={styles.exportText}>Export CSV</Text>
            </Pressable>
            <Pressable style={styles.exportBtn} onPress={() => void handleExportPDF()}>
              <Ionicons name="document-text-outline" size={18} color={colors.accent} />
              <Text style={styles.exportText}>Inventory PDF</Text>
            </Pressable>
          </View>
        </Card>

        <Text style={styles.section}>SDS Cloud Vault</Text>
        <Card>
          <View style={styles.vaultHeader}>
            <View>
              <Text style={styles.integName}>SDS Cloud Vault</Text>
              <Text style={styles.meta}>Encrypted document synchronization</Text>
            </View>
            <Ionicons name="shield-checkmark-outline" size={24} color={colors.accent2} />
          </View>

          <View style={styles.providerRow}>
            {([
              ['drive', 'cloud-outline', 'Drive'],
              ['aws', 'hardware-chip-outline', 'AWS S3'],
              ['azure', 'globe-outline', 'Azure'],
            ] as const).map(([id, icon, label]) => (
              <Pressable
                key={id}
                onPress={() => setActiveProvider(id)}
                style={[styles.providerPill, activeProvider === id && styles.providerPillOn]}
              >
                <Ionicons
                  name={icon}
                  size={20}
                  color={activeProvider === id ? colors.accent : colors.muted}
                />
                <Text
                  style={[
                    styles.providerLabel,
                    activeProvider === id && { color: colors.accent },
                  ]}
                >
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.recentTitle}>Recent Transfers</Text>
          {RECENT_TRANSFERS.map((file, i) => (
            <View key={i} style={styles.syncItem}>
              <View style={styles.fileInfo}>
                <Ionicons name="document-text-outline" size={16} color={colors.muted} />
                <View>
                  <Text style={styles.fileName}>{file.name}</Text>
                  <Text style={styles.meta}>
                    {file.size} · {file.time}
                  </Text>
                </View>
              </View>
              <View style={styles.syncStatus}>
                <View style={[styles.syncDot, { backgroundColor: colors.success }]} />
                <Text style={styles.syncLabel}>Synced</Text>
              </View>
            </View>
          ))}

          <Button label="Access Cloud Explorer" onPress={() => void dialog.alert('Cloud Explorer', 'Coming soon — matches web placeholder.')} />
        </Card>

        <Card style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.success} />
            <Text style={styles.securityTitle}>Connectivity Security</Text>
          </View>
          <Text style={styles.desc}>
            All API traffic is encrypted via TLS 1.3. OIDC and OAuth 2.0 protocols are enforced for third-party access.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', gap: 12, marginBottom: 4 },
    statsCol: { gap: 8 },
    statItem: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 10,
      alignItems: 'center',
      minWidth: 90,
    },
    statValue: { color: colors.text, fontWeight: '900', fontSize: 18 },
    statLabel: { color: colors.muted, fontSize: 9, fontWeight: '800', textTransform: 'uppercase', marginTop: 2 },
    section: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 16,
      marginBottom: 10,
    },
    integCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    integCardActive: { borderColor: colors.accent },
    integTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    integName: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    toggleWrap: { alignItems: 'flex-end' },
    toggleLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', marginBottom: 4 },
    desc: { color: colors.muted, fontSize: 13, lineHeight: 18, marginTop: 10 },
    configureBtn: {
      marginTop: 12,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    configureText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
    addCard: {
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginBottom: 10,
    },
    addText: { color: colors.muted, fontWeight: '700', marginTop: 8 },
    dropZone: {
      borderWidth: 2,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 14,
    },
    dropZoneActive: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    dropTitle: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 10 },
    progressTrack: {
      width: 200,
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
      marginTop: 12,
    },
    progressFill: { height: '100%', backgroundColor: colors.accent },
    exportRow: { flexDirection: 'row', gap: 10 },
    exportBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    exportText: { color: colors.accent, fontWeight: '800', fontSize: 13 },
    vaultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    providerRow: { flexDirection: 'row', gap: 8, marginVertical: 14 },
    providerPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    providerPillOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    providerLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 4 },
    recentTitle: { color: colors.muted, fontWeight: '800', fontSize: 11, textTransform: 'uppercase', marginBottom: 8 },
    syncItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    fileInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    fileName: { color: colors.text, fontWeight: '700', fontSize: 13 },
    syncStatus: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    syncDot: { width: 6, height: 6, borderRadius: 3 },
    syncLabel: { color: colors.success, fontSize: 11, fontWeight: '700' },
    securityTitle: { color: colors.text, fontWeight: '800', fontSize: 14 },
  });
}
