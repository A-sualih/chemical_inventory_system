import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { Button, Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function SecurityScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [status, setStatus] = useState<any>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [restoring, setRestoring] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, b] = await Promise.all([
        api.get('/security/status').catch(() => ({ data: null })),
        api.get('/security/backups').catch(() => ({ data: [] })),
      ]);
      setStatus(s.data?.data || s.data);
      setBackups(asList(b.data, ['backups', 'data']));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createBackup = async () => {
    setMsg('');
    try {
      await api.post('/security/backups');
      setMsg('Manual backup created.');
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || 'Backup failed');
    }
  };

  const restore = async (fileName: string) => {
    const ok = await dialog.confirm({
      title: 'Restore backup',
      message: `Restore system from ${fileName}? Current live data may be overwritten.`,
      confirmLabel: 'Restore',
      danger: true,
    });
    if (!ok) return;
    setRestoring(fileName);
    try {
      await api.post('/security/restore', { fileName });
      setMsg(`Restored from ${fileName}`);
      await load();
    } catch (e: any) {
      await dialog.alert('Restore failed', e.response?.data?.error || 'Could not restore');
    } finally {
      setRestoring(null);
    }
  };

  const mfa = Math.round(status?.mfaRatio || 0);
  const locked = status?.lockedUsers || 0;
  const backupCount = backups.length || status?.backups || 0;
  const lastBackup = status?.lastBackup
    ? new Date(status.lastBackup).toLocaleDateString()
    : backups[0]?.createdAt
      ? new Date(backups[0].createdAt).toLocaleDateString()
      : '—';
  const recent = asList(status?.recentAudit, ['logs', 'data']).slice(0, 8);

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Title>Security & Backup</Title>
            <Subtitle>Manage system integrity, access controls, and disaster recovery.</Subtitle>
          </View>
        </View>

        <Button label="Create manual backup" onPress={() => void createBackup()} />
        {msg ? <Text style={styles.ok}>{msg}</Text> : null}

        <View style={styles.metrics}>
          <Metric
            styles={styles}
            icon="shield-checkmark"
            iconColor="#22c55e"
            label="System health"
            value="Secure"
            sub="Real-time protection active"
          />
          <Metric
            styles={styles}
            icon="finger-print"
            iconColor={colors.accent}
            label="MFA adoption"
            value={`${mfa}%`}
            sub="Users with MFA enabled"
          />
          <Metric
            styles={styles}
            icon="warning"
            iconColor="#f59e0b"
            label="Locked accounts"
            value={String(locked)}
            sub="Due to failed attempts"
          />
          <Metric
            styles={styles}
            icon="archive"
            iconColor="#8b5cf6"
            label="Available backups"
            value={String(backupCount)}
            sub={`Last: ${lastBackup}`}
          />
        </View>

        <Text style={styles.section}>System restore points</Text>
        {backups.length === 0 ? <EmptyState title="No backups listed" /> : null}
        {backups.map((b, i) => {
          const fileName = b.fileName || b.filename || b.name || `backup-${i}`;
          const size =
            b.size != null
              ? typeof b.size === 'number'
                ? `${(b.size / (1024 * 1024)).toFixed(2)} MB`
                : String(b.size)
              : '—';
          return (
            <Card key={fileName}>
              <Text style={styles.backupName} numberOfLines={2}>
                {fileName}
              </Text>
              <Text style={styles.meta}>
                {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'} · {size}
              </Text>
              <Button
                label={restoring === fileName ? 'Restoring…' : 'Restore'}
                variant="ghost"
                onPress={() => restore(fileName)}
                disabled={!!restoring}
                loading={restoring === fileName}
              />
            </Card>
          );
        })}

        <Text style={styles.section}>Recent security activity</Text>
        {recent.length === 0 ? (
          <Card>
            <Text style={styles.meta}>No recent security events.</Text>
          </Card>
        ) : (
          recent.map((ev: any, idx: number) => (
            <Card key={ev._id || idx}>
              <View style={styles.activityTop}>
                <Text style={styles.activityAction}>{ev.action || ev.type || 'EVENT'}</Text>
                <Text style={styles.meta}>
                  {ev.createdAt ? new Date(ev.createdAt).toLocaleTimeString() : ''}
                </Text>
              </View>
              <Text style={styles.meta} numberOfLines={3}>
                {ev.details || ev.message || JSON.stringify(ev.target || {})}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}

function Metric({
  styles,
  icon,
  iconColor,
  label,
  value,
  sub,
}: {
  styles: ReturnType<typeof makeStyles>;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={20} color={iconColor} />
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.meta}>{sub}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { marginBottom: 4 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14, marginBottom: 8 },
    metric: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 8,
    },
    metricValue: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 4 },
    section: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 18,
      marginBottom: 10,
    },
    backupName: { color: colors.accent, fontWeight: '800', marginBottom: 4 },
    meta: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 2 },
    activityTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    activityAction: { color: colors.text, fontWeight: '900' },
    ok: { color: colors.accent, marginTop: 8, marginBottom: 4, fontWeight: '700' },
  });
}
