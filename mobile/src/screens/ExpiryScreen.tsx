import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';

type StatusFilter = 'all' | 'expired' | 'near_expiry' | 'active';

type ExpiryItem = {
  id: string;
  type: 'Batch' | 'Container';
  chemicalId: string;
  chemicalName: string;
  batchId?: string;
  containerId?: string;
  expiryDate: string;
  location?: string;
  status: string;
};

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Assets' },
  { id: 'expired', label: 'Expired' },
  { id: 'near_expiry', label: 'Near Expiry' },
  { id: 'active', label: 'Valid' },
];

function daysLeft(expiryDate: string) {
  const ms = new Date(expiryDate).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ExpiryScreen() {
  const { hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [stats, setStats] = useState({ expired: 0, near: 0, valid: 0 });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [purging, setPurging] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const canDelete = hasPermission('delete_chemical');

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint =
        statusFilter === 'all' ? '/expiry/summary' : `/expiry/summary?status=${statusFilter}`;
      const { data } = await api.get(endpoint);
      const list = Array.isArray(data) ? data : [];
      setItems(list);

      if (statusFilter === 'all') {
        const s = { expired: 0, near: 0, valid: 0 };
        list.forEach((item: ExpiryItem) => {
          if (item.status === 'expired') s.expired++;
          else if (item.status === 'near_expiry') s.near++;
          else s.valid++;
        });
        setStats(s);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDeleteSingle = async (item: ExpiryItem) => {
    const ok = await dialog.confirm({
      title: 'Delete expired asset',
      message: `Permanently delete this expired ${item.type.toLowerCase()} (${item.batchId || item.containerId})? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    setDeletingId(item.id);
    try {
      const type = item.type === 'Batch' ? 'batch' : 'container';
      const { data } = await api.delete(`/expiry/${type}/${item.id}`);
      showToast(
        'success',
        `${item.type} deleted.${data.chemicalDeleted ? ' Parent chemical record also removed (orphaned).' : ''}`
      );
      await load();
    } catch (e: any) {
      showToast('error', e.response?.data?.error || 'Failed to delete record.');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePurgeAll = async () => {
    const ok = await dialog.confirm({
      title: 'Purge all expired',
      message: `This will permanently delete ALL ${stats.expired} expired batches and containers, and any parent chemicals that only had expired stock.\n\nThis action is irreversible. Proceed?`,
      confirmLabel: 'Purge',
      danger: true,
    });
    if (!ok) return;
    setPurging(true);
    try {
      const { data } = await api.delete('/expiry/purge-expired');
      showToast(
        'success',
        `Purge complete: ${data.deletedBatches} batches, ${data.deletedContainers} containers, ${data.deletedChemicals} chemicals removed.`
      );
      await load();
    } catch (e: any) {
      showToast('error', e.response?.data?.error || 'Purge failed.');
    } finally {
      setPurging(false);
    }
  };

  const statusTone = (status: string): 'danger' | 'warn' | 'ok' => {
    if (status === 'expired') return 'danger';
    if (status === 'near_expiry') return 'warn';
    return 'ok';
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {toast ? (
          <View style={[styles.toast, toast.type === 'success' ? styles.toastOk : styles.toastErr]}>
            <Text style={styles.toastText}>{toast.msg}</Text>
          </View>
        ) : null}

        <Title>Expiry Intelligence</Title>
        <Subtitle>Real-time monitoring of chemical longevity and compliance.</Subtitle>

        {canDelete && stats.expired > 0 ? (
          <Button
            label={purging ? 'Purging...' : `Purge All Expired (${stats.expired})`}
            variant="danger"
            onPress={handlePurgeAll}
            loading={purging}
          />
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 12 }}>
          <View style={styles.pills}>
            {FILTERS.map((tab) => (
              <Pressable
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={[styles.pill, statusFilter === tab.id && styles.pillOn]}
              >
                <Text style={[styles.pillText, statusFilter === tab.id && styles.pillTextOn]}>
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <View style={styles.statsGrid}>
          {[
            { label: 'Critically Expired', value: stats.expired, color: colors.danger },
            { label: 'Approaching Expiry', value: stats.near, color: colors.warn },
            { label: 'Stable Inventory', value: stats.valid, color: colors.success },
          ].map((stat) => (
            <Card key={stat.label} style={styles.statCard}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            </Card>
          ))}
        </View>

        <Text style={styles.section}>Inventory Expiry Ledger</Text>
        <View style={styles.ledgerHeader}>
          <Text style={styles.priority}>Priority Queue</Text>
        </View>

        {items.length === 0 && !loading ? (
          <EmptyState title="Safe Horizon" body="No items match your current filter." />
        ) : (
          items.map((item) => {
            const left = daysLeft(item.expiryDate);
            const isExpired = item.status === 'expired';
            const isDeleting = deletingId === item.id;

            return (
              <Card key={item.id} style={isExpired ? styles.expiredCard : undefined}>
                <View style={styles.row}>
                  <View style={[styles.avatar, isExpired && { backgroundColor: `${colors.danger}22` }]}>
                    <Text style={[styles.avatarText, isExpired && { color: colors.danger }]}>
                      {item.chemicalId.slice(-3).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{item.chemicalName}</Text>
                    <Text style={styles.ref}>Ref No: {item.chemicalId}</Text>
                    <View style={styles.originRow}>
                      <Badge
                        label={item.type}
                        tone={item.type === 'Batch' ? 'muted' : 'ok'}
                      />
                      <Text style={styles.meta}>{item.batchId || item.containerId}</Text>
                    </View>
                    {item.location ? <Text style={styles.meta}>{item.location}</Text> : null}
                    <Text style={[styles.date, isExpired && { color: colors.danger }]}>
                      {formatDate(item.expiryDate)}
                    </Text>
                    <Text style={styles.iso}>ISO: {item.expiryDate.split('T')[0]}</Text>
                  </View>
                  <View style={styles.rightCol}>
                    <Badge label={item.status.replace(/_/g, ' ')} tone={statusTone(item.status)} />
                    <Text
                      style={[
                        styles.longevity,
                        isExpired
                          ? { color: colors.danger }
                          : left < 30
                            ? { color: colors.warn }
                            : { color: colors.success },
                      ]}
                    >
                      {isExpired ? 'EXPIRED' : `${left}d`}
                    </Text>
                    <Text style={styles.longevityLabel}>Longevity</Text>
                    {isExpired && canDelete ? (
                      <Button
                        label={isDeleting ? '…' : 'Delete'}
                        variant="danger"
                        onPress={() => handleDeleteSingle(item)}
                        loading={isDeleting}
                        disabled={purging}
                      />
                    ) : null}
                  </View>
                </View>
              </Card>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    toast: {
      borderRadius: 12,
      padding: 12,
      marginBottom: 10,
      borderWidth: 1,
    },
    toastOk: { backgroundColor: `${colors.success}18`, borderColor: colors.success },
    toastErr: { backgroundColor: `${colors.danger}18`, borderColor: colors.danger },
    toastText: { color: colors.text, fontWeight: '700', fontSize: 13 },
    pills: { flexDirection: 'row', gap: 8 },
    pill: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    pillOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    pillText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    pillTextOn: { color: colors.btnText },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    statCard: { width: '47%', flexGrow: 1 },
    statLabel: { color: colors.muted, fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
    statValue: { fontSize: 28, fontWeight: '900', marginTop: 6 },
    section: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 12,
      marginBottom: 4,
    },
    ledgerHeader: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 8 },
    priority: { color: colors.accent, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
    expiredCard: { borderColor: colors.danger },
    row: { flexDirection: 'row', gap: 10 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { fontWeight: '900', fontSize: 11, color: colors.accent },
    name: { color: colors.text, fontWeight: '800', fontSize: 15 },
    ref: { color: colors.muted, fontSize: 11, marginTop: 2 },
    originRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    date: { color: colors.text, fontWeight: '700', marginTop: 6, fontSize: 13 },
    iso: { color: colors.muted, fontSize: 10, marginTop: 2 },
    rightCol: { alignItems: 'flex-end', minWidth: 80 },
    longevity: { fontWeight: '900', fontSize: 16, marginTop: 8 },
    longevityLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  });
}
