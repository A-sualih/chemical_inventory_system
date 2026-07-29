import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { normalizeRole, roleMatches } from '../utils/roles';
import { asList } from '../utils/apiHelpers';
import { fmtQty } from '../utils/formatQuantity';
import { Badge, Button, Card, Screen, SectionLabel, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const STORAGE_BAR_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

function timeAgo(dateStr?: string) {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'N/A';
  const diffMins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/** Compact path for long hierarchy names; keep short names readable */
function formatLocationLabel(name?: string) {
  if (!name) return 'Unknown';
  const clean = String(name).replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!clean) return 'Unknown';
  if (clean.length <= 36) return clean;
  const parts = String(name)
    .split(/[-_/]/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join(' · ');
  return `${clean.slice(0, 34)}…`;
}

function StorageBreakdownList({
  storage,
  maxQty,
  styles,
}: {
  storage: any[];
  maxQty: number;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <>
      {storage.map((unit: any, i: number) => {
        const qty = Number(unit.totalQty) || 0;
        const fill = Math.max(Math.round((qty / maxQty) * 100), qty > 0 ? 4 : 0);
        const bar = STORAGE_BAR_COLORS[i % STORAGE_BAR_COLORS.length];
        const count = Number(unit.count) || 0;
        return (
          <View key={`${unit.name}-${i}`} style={styles.storageRow}>
            <View style={styles.storageLabelRow}>
              <View style={styles.storageNameRow}>
                <View style={[styles.dot, { backgroundColor: bar }]} />
                <Text style={styles.storageName} numberOfLines={2}>
                  {formatLocationLabel(unit.name)}
                </Text>
              </View>
              <View style={styles.storageMetaCol}>
                <Text style={styles.storageQty}>{fmtQty(qty)}</Text>
                <Text style={styles.storageMeta}>
                  {count} item{count === 1 ? '' : 's'} · {fill}%
                </Text>
              </View>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${fill}%`, backgroundColor: bar }]} />
            </View>
          </View>
        );
      })}
    </>
  );
}

export default function HomeScreen() {
  const { user, hasPermission } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [dbStats, setDbStats] = useState<any>({
    total: 0,
    flammables: 0,
    lowStock: 0,
    auditScore: 'N/A',
    expirations: [],
    storageBreakdown: [],
    hazardSummary: [],
    lastAuditAgo: 'Never',
  });
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [wasteStats, setWasteStats] = useState({ pendingDisposals: 0, recentIncidents: 0 });
  const [refreshing, setRefreshing] = useState(false);

  const role = String(normalizeRole(user?.role) || user?.role || '');
  const isManager = role === 'Lab Manager';
  const isAdmin = role === 'Admin';
  const firstName = user?.name?.split(' ')[0] || 'Guest';

  const load = useCallback(async () => {
    try {
      const { data: statsData } = await api.get('/chemicals/stats');
      setDbStats((prev: any) => ({ ...prev, ...statsData }));

      if (hasPermission('view_reports')) {
        try {
          const { data: wasteData } = await api.get('/waste/analytics');
          const pending =
            (wasteData.statusStats || []).find((s: any) => s._id === 'Pending Approval')?.count || 0;
          setWasteStats({
            pendingDisposals: pending,
            recentIncidents: wasteData.incidentStats?.length || 0,
          });
        } catch {
          /* optional */
        }
      }

      if (hasPermission('approve_request') || hasPermission('submit_request')) {
        try {
          const { data } = await api.get('/requests');
          setPendingRequests(asList(data));
        } catch {
          setPendingRequests([]);
        } finally {
          setRequestsLoading(false);
        }
      } else {
        setRequestsLoading(false);
      }

      if (hasPermission('view_audit_logs')) {
        try {
          const { data } = await api.get('/audit');
          setAuditLogs(asList(data).slice(0, 6));
        } catch {
          setAuditLogs([]);
        }
      }
    } finally {
      setRefreshing(false);
    }
  }, [hasPermission]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 15000);
    return () => clearInterval(interval);
  }, [load, user?.active_lab]);

  const handleRequestAction = async (id: string, status: string) => {
    try {
      await api.put(`/inventory/requests/${id}`, { status });
      void load();
    } catch {
      /* toast omitted — keep silent failure visible via unchanged list */
    }
  };

  const pad = (n: number | string, len = 3) => String(n ?? 0).padStart(len, '0');

  const statCards = [
    {
      label: 'Total Chemicals',
      value: pad(dbStats.total ?? 0),
      sub: 'Active Listings',
      tone: 'primary' as const,
      icon: 'flask-outline' as const,
      onPress: () => !isAdmin && navigation.navigate('Chemicals'),
      hidden: false,
    },
    {
      label: 'Flammables',
      value: pad(dbStats.flammables ?? 0),
      sub: 'Class 3 Assets',
      tone: 'warn' as const,
      icon: 'flame-outline' as const,
      onPress: () => !isAdmin && navigation.navigate('Chemicals'),
      hidden: false,
    },
    {
      label: 'Critical Stock',
      value: pad(dbStats.lowStock ?? 0, 2),
      sub: 'Reorder Required',
      tone: 'danger' as const,
      icon: 'warning-outline' as const,
      onPress: () => !isAdmin && navigation.navigate('Chemicals'),
      hidden: false,
    },
    {
      label: 'Safety Audit',
      value: String(dbStats.auditScore ?? 'N/A'),
      sub: 'Passing Score',
      tone: 'ok' as const,
      icon: 'shield-checkmark-outline' as const,
      onPress: () => navigation.getParent()?.navigate('InventoryLogs'),
      hidden: false,
    },
    {
      label: 'Pending Disposal',
      value: pad(wasteStats.pendingDisposals, 2),
      sub: 'Awaiting Action',
      tone: 'accent2' as const,
      icon: 'trash-outline' as const,
      onPress: () => navigation.getParent()?.navigate('Waste'),
      hidden: !hasPermission('manage_waste'),
    },
  ].filter((s) => !s.hidden);

  const storage = dbStats.storageBreakdown || [];
  const maxQty = Math.max(...storage.map((u: any) => u.totalQty || 0), 1);
  const hazards = dbStats.hazardSummary || [];
  const expirations = dbStats.expirations || [];
  const pendingOnly = pendingRequests.filter((r) => r.status === 'Pending');

  const toneBg = (tone: string) => {
    switch (tone) {
      case 'warn':
        return colors.warn + '22';
      case 'danger':
        return colors.danger + '22';
      case 'ok':
        return colors.success + '22';
      case 'accent2':
        return colors.accent2 + '22';
      default:
        return colors.accentSoft;
    }
  };
  const toneFg = (tone: string) => {
    switch (tone) {
      case 'warn':
        return colors.warn;
      case 'danger':
        return colors.danger;
      case 'ok':
        return colors.success;
      case 'accent2':
        return colors.accent2;
      default:
        return colors.accent;
    }
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.accent}
          />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Title>
              Welcome back, <Text style={{ color: colors.accent }}>{firstName}</Text>
            </Title>
            <View style={styles.roleRow}>
              {user?.role ? <Badge label={String(user.role)} tone="ok" /> : null}
            </View>
            <Subtitle>
              System status is Optimal · Last audit {dbStats.lastAuditAgo || 'Never'}
            </Subtitle>
          </View>
        </View>

        <View style={styles.headerActions}>
          {!isAdmin && hasPermission('create_chemical') ? (
            <Pressable
              style={styles.primaryChip}
              onPress={() => navigation.navigate('Chemicals')}
            >
              <Ionicons name="add" size={16} color={colors.btnText} />
              <Text style={styles.primaryChipText}>New Inventory</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsGrid}>
          {statCards.map((stat) => (
            <Pressable
              key={stat.label}
              onPress={stat.onPress}
              style={[styles.statCard, { borderColor: colors.border }]}
            >
              <View style={[styles.statIcon, { backgroundColor: toneBg(stat.tone) }]}>
                <Ionicons name={stat.icon} size={18} color={toneFg(stat.tone)} />
              </View>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statSub}>{stat.sub}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <SectionLabel>Inventory Overview</SectionLabel>
            <Text style={styles.chartSub}>
              Volume by location · {storage.length} storage unit
              {storage.length === 1 ? '' : 's'}
            </Text>
          </View>
          {!isAdmin ? (
            <Pressable onPress={() => navigation.navigate('Chemicals')}>
              <Text style={styles.link}>View All →</Text>
            </Pressable>
          ) : null}
        </View>
        <Card>
          {storage.length === 0 ? (
            <View style={styles.emptyChart}>
              <View style={styles.emptyIcon}>
                <Ionicons name="cube-outline" size={28} color={colors.muted} />
              </View>
              <Text style={styles.emptyTitle}>No storage data</Text>
              <Text style={styles.emptyText}>
                Assign locations to chemicals (e.g. Cabinet A) to generate volume charts.
              </Text>
            </View>
          ) : (
            <StorageBreakdownList storage={storage} maxQty={maxQty} styles={styles} />
          )}
        </Card>

        {isManager ? (
          <>
            <View style={styles.sectionHeader}>
              <SectionLabel>Pending Approvals</SectionLabel>
              <Badge label={`${pendingOnly.length} Pending`} tone="warn" />
            </View>
            <Card>
              {requestsLoading ? (
                <ActivityIndicator color={colors.accent} />
              ) : pendingRequests.length === 0 ? (
                <Text style={styles.emptyText}>All clear — nothing to review.</Text>
              ) : (
                pendingRequests.slice(0, 5).map((req) => {
                  const name =
                    req.chemical_name || req.chemical_id?.name || 'Chemical Request';
                  return (
                    <View key={req._id} style={styles.approvalRow}>
                      <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{String(name)[0]?.toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.approvalName}>{name}</Text>
                        <Text style={styles.approvalMeta}>
                          REQ BY {(req.user_name || req.user_id?.name || 'Unknown').toUpperCase()} ·{' '}
                          {timeAgo(req.created_at)} · QTY: {req.quantity}
                        </Text>
                        <View style={styles.approvalActions}>
                          <Badge
                            label={req.status}
                            tone={
                              req.status === 'Approved'
                                ? 'ok'
                                : req.status === 'Rejected'
                                  ? 'danger'
                                  : 'warn'
                            }
                          />
                          {req.status === 'Pending' ? (
                            <>
                              <Pressable
                                style={[styles.circleBtn, { backgroundColor: colors.success }]}
                                onPress={() => void handleRequestAction(req._id, 'Approved')}
                              >
                                <Ionicons name="checkmark" size={16} color="#fff" />
                              </Pressable>
                              <Pressable
                                style={[styles.circleBtn, { backgroundColor: colors.danger }]}
                                onPress={() => void handleRequestAction(req._id, 'Rejected')}
                              >
                                <Ionicons name="close" size={16} color="#fff" />
                              </Pressable>
                            </>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
              )}
              <Button
                label="Go to Request Center"
                variant="ghost"
                onPress={() => navigation.navigate('Requests')}
              />
            </Card>
          </>
        ) : hasPermission('submit_request') && !isAdmin ? (
          <>
            <SectionLabel>My Requests</SectionLabel>
            <Card style={{ backgroundColor: colors.accent }}>
              <Text style={[styles.sectionTitleOnAccent]}>
                {pendingOnly.length} Active
              </Text>
              {requestsLoading ? (
                <ActivityIndicator color={colors.btnText} />
              ) : pendingRequests.length === 0 ? (
                <Text style={{ color: colors.btnText, opacity: 0.85 }}>No active requests</Text>
              ) : (
                pendingRequests.slice(0, 5).map((req) => (
                  <View key={req._id} style={styles.myReqRow}>
                    <Text style={{ color: colors.btnText, fontWeight: '800', flex: 1 }}>
                      {req.chemical_name || req.chemical_id?.name || req.chemical_id}
                    </Text>
                    <Text style={{ color: colors.btnText, opacity: 0.8, fontSize: 12 }}>
                      {req.status}
                    </Text>
                  </View>
                ))
              )}
              <Pressable
                style={styles.whiteBtn}
                onPress={() => navigation.navigate('Requests')}
              >
                <Text style={[styles.whiteBtnText, { color: colors.accent }]}>
                  Create New Request
                </Text>
              </Pressable>
            </Card>
          </>
        ) : null}

        <SectionLabel>Risk Profile</SectionLabel>
        <Card>
          {hazards.length === 0 ? (
            <Text style={styles.emptyText}>No hazards logged</Text>
          ) : (
            <View style={styles.hazardGrid}>
              {hazards.map((h: any) => (
                <View key={h.id} style={styles.hazardCard}>
                  <Text style={styles.hazardName}>{h.id}</Text>
                  <Text style={styles.hazardCount}>{h.count} Chemicals</Text>
                </View>
              ))}
            </View>
          )}
          <View style={styles.threatBox}>
            <Text style={styles.threatLabel}>Primary Threat</Text>
            <Text style={styles.threatValue}>{hazards[0]?.id || 'None Reported'}</Text>
            <Text style={styles.statSub}>Highest occurrence</Text>
          </View>
        </Card>

        <Card style={{ backgroundColor: colors.surface2 }}>
          <Text style={styles.sectionTitle}>Safety Protocol</Text>
          <Text style={styles.emptyText}>
            All personnel must verify SDS documentation before container opening.
          </Text>
          {['HazMat Guidelines 2026', 'Spill Kit Locations Map', 'Emergency Extraction Plan'].map(
            (item) => (
              <View key={item} style={styles.protocolPill}>
                <Ionicons name="shield-outline" size={14} color={colors.accent} />
                <Text style={styles.protocolText}>{item}</Text>
              </View>
            ),
          )}
          {roleMatches(user?.role, ['Lab Manager', 'Safety Officer', 'Viewer / Auditor']) ? (
            <Button
              label="Open Safety Command"
              variant="ghost"
              onPress={() => navigation.getParent()?.navigate('Safety')}
            />
          ) : null}
        </Card>

        <View style={styles.sectionHeader}>
          <SectionLabel>Expirations</SectionLabel>
          <Text style={styles.statSub}>{expirations.length} upcoming</Text>
        </View>
        <Card>
          {expirations.length === 0 ? (
            <Text style={styles.emptyText}>No chemicals expiring within 90 days.</Text>
          ) : (
            expirations.map((item: any, i: number) => (
              <View key={`${item.name}-${i}`} style={styles.expRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.approvalName}>{item.name}</Text>
                  <Text style={styles.approvalMeta}>
                    {item.location}
                    {item.batch_number ? ` · Batch: ${item.batch_number}` : ''}
                  </Text>
                </View>
                <Badge
                  label={item.days <= 0 ? 'EXPIRED' : `IN ${item.days}D`}
                  tone={item.days <= 7 ? 'danger' : item.days <= 30 ? 'warn' : 'muted'}
                />
              </View>
            ))
          )}
          {!isAdmin ? (
            <Button
              label="Manage All Expiries"
              variant="ghost"
              onPress={() => navigation.getParent()?.navigate('Expiry')}
            />
          ) : null}
        </Card>

        {hasPermission('view_audit_logs') ? (
          <>
            <SectionLabel>Live Activity</SectionLabel>
            <Card style={{ backgroundColor: '#0f172a' }}>
              {auditLogs.length === 0 ? (
                <Text style={{ color: '#94a3b8' }}>No activity recorded yet</Text>
              ) : (
                auditLogs.map((log, i) => (
                  <View key={log._id || i} style={styles.timelineItem}>
                    <View style={styles.timelineDot} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.timelineUser}>{log.user_name || 'System'}</Text>
                      <Text style={styles.timelineAction}>
                        {log.action}
                        {log.details ? ` — ${log.details}` : ''}
                      </Text>
                      <Text style={styles.timelineTime}>{timeAgo(log.timestamp)}</Text>
                    </View>
                  </View>
                ))
              )}
              <Pressable
                style={styles.auditBtn}
                onPress={() => navigation.getParent()?.navigate('Audit')}
              >
                <Text style={styles.auditBtnText}>View All Audit Logs</Text>
              </Pressable>
            </Card>
          </>
        ) : null}

        <Pressable onPress={() => navigation.navigate('More')} style={styles.allModules}>
          <Text style={styles.allModulesText}>Open all modules</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.btnText} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start' },
    roleRow: { marginTop: 8, marginBottom: 4, flexDirection: 'row' },
    headerActions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
    primaryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,
    },
    primaryChipText: { color: colors.btnText, fontWeight: '800', fontSize: 13 },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
    statCard: {
      width: '47%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      padding: 14,
    },
    statIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    statLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    statValue: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
    statSub: { color: colors.muted, fontSize: 12, marginTop: 2 },
    emptyText: { color: colors.muted, fontSize: 13, lineHeight: 18 },
    storageRow: { marginBottom: 14 },
    storageLabelRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 8,
    },
    storageNameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
    dot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
    storageName: { color: colors.text, fontWeight: '700', fontSize: 13, flex: 1, lineHeight: 18 },
    storageMetaCol: { alignItems: 'flex-end', maxWidth: '42%' },
    storageQty: { color: colors.text, fontWeight: '900', fontSize: 14 },
    storageMeta: { color: colors.muted, fontSize: 11, marginTop: 2, textAlign: 'right' },
    track: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 999 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    chartSub: {
      color: colors.accent,
      fontSize: 11,
      fontWeight: '700',
      marginTop: -4,
      marginBottom: 4,
    },
    emptyChart: { alignItems: 'center', paddingVertical: 18, paddingHorizontal: 8 },
    emptyIcon: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyTitle: { color: colors.text, fontWeight: '800', fontSize: 14, marginBottom: 4 },
    link: { color: colors.accent, fontWeight: '800', fontSize: 13, marginTop: 2 },
    approvalRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: { color: colors.accent, fontWeight: '900' },
    approvalName: { color: colors.text, fontWeight: '800', fontSize: 14 },
    approvalMeta: { color: colors.muted, fontSize: 11, marginTop: 2 },
    approvalActions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    circleBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitleOnAccent: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 16,
      marginBottom: 10,
    },
    myReqRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: 'rgba(255,255,255,0.2)',
    },
    whiteBtn: {
      marginTop: 12,
      backgroundColor: '#fff',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    whiteBtnText: { fontWeight: '900' },
    hazardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hazardCard: {
      width: '47%',
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    hazardName: { color: colors.text, fontWeight: '800', fontSize: 12 },
    hazardCount: { color: colors.muted, fontSize: 11, marginTop: 2 },
    threatBox: {
      marginTop: 12,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.accentSoft,
    },
    threatLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    threatValue: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 4 },
    sectionTitle: { color: colors.text, fontWeight: '800', fontSize: 16, marginBottom: 6 },
    protocolPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    protocolText: { color: colors.text, fontWeight: '600', fontSize: 13 },
    expRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    timelineItem: { flexDirection: 'row', gap: 12, marginBottom: 14 },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#2dd4bf',
      marginTop: 4,
    },
    timelineUser: { color: '#fff', fontWeight: '800', fontSize: 13 },
    timelineAction: { color: '#94a3b8', fontSize: 12, marginTop: 2 },
    timelineTime: { color: '#64748b', fontSize: 11, marginTop: 4 },
    auditBtn: {
      marginTop: 8,
      borderWidth: 1,
      borderColor: 'rgba(148,163,184,0.3)',
      borderRadius: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    auditBtnText: { color: '#e2e8f0', fontWeight: '800' },
    allModules: {
      marginTop: 8,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    allModulesText: { color: colors.btnText, fontWeight: '900' },
  });
}
