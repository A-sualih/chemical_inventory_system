import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { Badge, Card, EmptyState, Screen, SectionLabel, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const HAZARD_CLASSES = [
  { id: 'Explosive', label: 'Explosive', color: '#f97316', icon: 'flash' as const },
  { id: 'Flammable', label: 'Flammable', color: '#dc2626', icon: 'flame' as const },
  { id: 'Oxidizer', label: 'Oxidizing', color: '#eab308', icon: 'sunny' as const },
  { id: 'Compressed Gas', label: 'Compressed Gas', color: '#2563eb', icon: 'cloud' as const },
  { id: 'Corrosive', label: 'Corrosive', color: '#1d4ed8', icon: 'water' as const },
  { id: 'Toxic', label: 'Toxic', color: '#475569', icon: 'skull' as const },
  { id: 'Irritant', label: 'Irritant', color: '#f87171', icon: 'alert-circle' as const },
  { id: 'Health Hazard', label: 'Health Hazard', color: '#7c3aed', icon: 'medkit' as const },
  { id: 'Environmental', label: 'Environmental', color: '#059669', icon: 'leaf' as const },
];

const RISK_LEVELS = ['Low', 'Medium', 'High', 'Extreme'] as const;
const RISK_COLORS: Record<(typeof RISK_LEVELS)[number], string> = {
  Low: '#22c55e',
  Medium: '#eab308',
  High: '#f97316',
  Extreme: '#dc2626',
};

const PROTOCOLS = [
  {
    title: 'Spill Response',
    desc: 'Neutralization and cleanup steps for all chemical families.',
    icon: 'water' as const,
    color: '#3b82f6',
  },
  {
    title: 'First Aid',
    desc: 'Immediate medical actions for exposure scenarios.',
    icon: 'heart' as const,
    color: '#ef4444',
  },
  {
    title: 'Evacuation Plan',
    desc: 'Map of exits and assembly points for all laboratory zones.',
    icon: 'exit' as const,
    color: '#059669',
  },
];

function severityTone(severity?: string): 'muted' | 'ok' | 'warn' | 'danger' {
  const s = String(severity || '').toLowerCase();
  if (s === 'critical') return 'danger';
  if (s === 'high') return 'warn';
  return 'muted';
}

function RiskBar({
  label,
  count,
  total,
  fillColor,
  styles,
}: {
  label: string;
  count: number;
  total: number;
  fillColor: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <View style={styles.riskBarWrap}>
      <View style={styles.riskBarHeader}>
        <Text style={styles.riskLabel}>{label}</Text>
        <Text style={styles.riskStats}>
          {count} <Text style={styles.riskPct}>({pct}%)</Text>
        </Text>
      </View>
      <View style={styles.riskTrack}>
        <View style={[styles.riskFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
      </View>
    </View>
  );
}

function StatCard({
  title,
  value,
  icon,
  iconColor,
  valueColor,
  styles,
}: {
  title: string;
  value: number | string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  valueColor?: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: `${iconColor}22` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.statLabel}>{title}</Text>
      <Text style={[styles.statValue, valueColor ? { color: valueColor } : null]}>{value ?? 0}</Text>
    </View>
  );
}

export default function SafetyScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [stats, setStats] = useState<any>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);
  const [matrix, setMatrix] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expandedConflicts, setExpandedConflicts] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [statsRes, conflictsRes, matrixRes] = await Promise.all([
        api.get('/safety/dashboard'),
        api.get('/safety/incompatibility/global'),
        api.get('/safety/matrix'),
      ]);
      setStats(statsRes.data);
      setConflicts(conflictsRes.data?.conflicts || []);
      setMatrix(Array.isArray(matrixRes.data) ? matrixRes.data : []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to load safety data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const summary = stats?.summary || {};
  const totalRisk = (stats?.risks || []).reduce((s: number, r: any) => s + (r.count || 0), 0);
  const criticalConflicts = conflicts.filter((c) => c.severity === 'Critical');
  const displayedConflicts = expandedConflicts ? conflicts : conflicts.slice(0, 4);
  const attentionRequired = conflicts.length > 0 || (summary.sdsPending || 0) > 0;

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Title>Safety & Hazard Command</Title>
        <Subtitle>
          Global compliance monitoring, storage safety, and emergency response management.
        </Subtitle>

        {error ? (
          <Card>
            <Text style={styles.error}>{error}</Text>
          </Card>
        ) : null}

        <View style={styles.statGrid}>
          <StatCard
            title="Total Chemicals"
            value={summary.total ?? 0}
            icon="pulse"
            iconColor="#2563eb"
            styles={styles}
          />
          <StatCard
            title="Restricted Access"
            value={summary.restricted ?? 0}
            icon="shield"
            iconColor="#9333ea"
            valueColor="#7e22ce"
            styles={styles}
          />
          <StatCard
            title="Training Required"
            value={summary.needsTraining ?? 0}
            icon="people"
            iconColor="#ea580c"
            valueColor="#c2410c"
            styles={styles}
          />
          <StatCard
            title="SDS Pending"
            value={summary.sdsPending ?? 0}
            icon="document-text"
            iconColor="#dc2626"
            valueColor="#b91c1c"
            styles={styles}
          />
        </View>

        <SectionLabel>GHS Hazard Distribution</SectionLabel>
        <Card>
          <View style={styles.hazardGrid}>
            {HAZARD_CLASSES.map((h) => {
              const count = stats?.hazards?.find((s: any) => s._id === h.id)?.count || 0;
              return (
                <View key={h.id} style={styles.hazardItem}>
                  <View style={[styles.hazardIcon, { backgroundColor: h.color }]}>
                    <Ionicons name={h.icon} size={16} color="#fff" />
                  </View>
                  <Text style={styles.hazardLabel} numberOfLines={1}>
                    {h.label}
                  </Text>
                  <Text style={[styles.hazardCount, count > 0 && styles.hazardCountActive]}>
                    {count}
                  </Text>
                </View>
              );
            })}
          </View>
        </Card>

        <SectionLabel>Risk Profile</SectionLabel>
        <Card>
          {RISK_LEVELS.map((level) => {
            const count = stats?.risks?.find((r: any) => r._id === level)?.count || 0;
            return (
              <RiskBar
                key={level}
                label={level}
                count={count}
                total={totalRisk}
                fillColor={RISK_COLORS[level]}
                styles={styles}
              />
            );
          })}
          <View style={styles.riskTotalBox}>
            <Text style={styles.riskTotalLabel}>Total Assessed</Text>
            <Text style={styles.riskTotalValue}>{totalRisk}</Text>
          </View>
        </Card>

        <View style={styles.sectionHeader}>
          <SectionLabel>Storage Conflicts</SectionLabel>
          {conflicts.length > 0 ? (
            <Badge label={`${conflicts.length} Detected`} tone="warn" />
          ) : null}
        </View>
        <Card>
          {conflicts.length === 0 ? (
            <View style={styles.allClear}>
              <View style={styles.allClearIcon}>
                <Ionicons name="checkmark-circle" size={32} color="#22c55e" />
              </View>
              <Text style={styles.allClearTitle}>All Clear</Text>
              <Text style={styles.allClearDesc}>
                No incompatible chemicals detected in any storage location.
              </Text>
            </View>
          ) : (
            <>
              {displayedConflicts.map((c, i) => (
                <View
                  key={c._id || i}
                  style={[
                    styles.conflictItem,
                    c.severity === 'Critical' ? styles.conflictCritical : styles.conflictHigh,
                  ]}
                >
                  <View
                    style={[
                      styles.conflictIcon,
                      c.severity === 'Critical' ? styles.iconCritical : styles.iconHigh,
                    ]}
                  >
                    <Ionicons name="close-circle" size={16} color="#fff" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.conflictTitleRow}>
                      <Text style={styles.conflictTitle}>
                        {c.chemicals?.[0] || c.chemical_a || '?'} ↔{' '}
                        {c.chemicals?.[1] || c.chemical_b || '?'}
                      </Text>
                      <Badge label={c.severity || 'High'} tone={severityTone(c.severity)} />
                    </View>
                    <Text style={styles.conflictReason}>{c.reason || c.message}</Text>
                    <View style={styles.conflictLocation}>
                      <Ionicons name="location" size={11} color={colors.muted} />
                      <Text style={styles.locText}>
                        {c.location || c.cabinet || c.room || 'Unknown location'}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {conflicts.length > 4 ? (
                <Pressable
                  onPress={() => setExpandedConflicts((v) => !v)}
                  style={styles.toggleBtn}
                >
                  <Ionicons
                    name={expandedConflicts ? 'chevron-up' : 'chevron-down'}
                    size={14}
                    color={colors.accent}
                  />
                  <Text style={styles.toggleText}>
                    {expandedConflicts
                      ? 'Show Less'
                      : `Show ${conflicts.length - 4} More`}
                  </Text>
                </Pressable>
              ) : null}
            </>
          )}
        </Card>

        <SectionLabel>Safety Alerts</SectionLabel>
        <Card style={styles.alertsPanel}>
          {(summary.sdsPending || 0) > 0 ? (
            <View style={styles.alertItem}>
              <View style={[styles.alertIconBox, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="document-text" size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>SDS Missing / Pending</Text>
                <Text style={styles.alertDesc}>
                  {summary.sdsPending} chemical{summary.sdsPending > 1 ? 's' : ''} require SDS
                  verification.
                </Text>
              </View>
            </View>
          ) : null}

          {(summary.needsTraining || 0) > 0 ? (
            <View style={styles.alertItem}>
              <View style={[styles.alertIconBox, { backgroundColor: '#fff7ed' }]}>
                <Ionicons name="people" size={16} color="#ea580c" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Training Required</Text>
                <Text style={styles.alertDesc}>
                  {summary.needsTraining} chemical{summary.needsTraining > 1 ? 's' : ''} mandate
                  handling training before use.
                </Text>
              </View>
            </View>
          ) : null}

          {criticalConflicts.length > 0 ? (
            <View style={[styles.alertItem, styles.alertCritical]}>
              <View style={[styles.alertIconBox, { backgroundColor: '#fef2f2' }]}>
                <Ionicons name="warning" size={16} color="#ef4444" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.alertTitle, { color: colors.danger }]}>
                  Critical Storage Conflict
                </Text>
                <Text style={styles.alertDesc}>
                  {criticalConflicts.length} critical incompatibilit
                  {criticalConflicts.length > 1 ? 'ies' : 'y'} found in current storage layout.
                </Text>
              </View>
            </View>
          ) : null}

          {(summary.restricted || 0) > 0 ? (
            <View style={styles.alertItem}>
              <View style={[styles.alertIconBox, { backgroundColor: '#faf5ff' }]}>
                <Ionicons name="shield" size={16} color="#9333ea" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Restricted Access</Text>
                <Text style={styles.alertDesc}>
                  {summary.restricted} chemical{summary.restricted > 1 ? 's' : ''} have restricted
                  access controls active.
                </Text>
              </View>
            </View>
          ) : null}

          {!summary.sdsPending &&
          !summary.needsTraining &&
          !criticalConflicts.length &&
          !summary.restricted ? (
            <View style={styles.alertItem}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={styles.alertNominal}>No active safety alerts. All systems nominal.</Text>
            </View>
          ) : null}

          <View style={styles.statusFooter}>
            <View
              style={[styles.statusDot, attentionRequired ? styles.dotAlert : styles.dotOk]}
            />
            <Text style={styles.statusText}>
              {attentionRequired ? 'Attention Required' : 'System Nominal'}
            </Text>
          </View>
        </Card>

        <SectionLabel>Chemical Family Incompatibility Matrix</SectionLabel>
        <Card>
          {matrix.length === 0 ? (
            <Text style={styles.meta}>Matrix data unavailable.</Text>
          ) : (
            matrix.map((row, i) => (
              <View key={row.family || i} style={styles.matrixRow}>
                <Text style={styles.matrixFamily}>{row.family}</Text>
                <View style={styles.incompatTags}>
                  {(row.incompatibleWith || []).map((item: string, j: number) => (
                    <View key={`${item}-${j}`} style={styles.incompatTag}>
                      <Text style={styles.incompatTagText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </Card>

        <SectionLabel>Emergency Response Protocols</SectionLabel>
        <View style={styles.protocolGrid}>
          {PROTOCOLS.map((p) => (
            <Card key={p.title} style={styles.protocolCard}>
              <View style={[styles.protocolIcon, { backgroundColor: `${p.color}18` }]}>
                <Ionicons name={p.icon} size={28} color={p.color} />
              </View>
              <Text style={styles.protocolTitle}>{p.title}</Text>
              <Text style={styles.protocolDesc}>{p.desc}</Text>
            </Card>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    error: { color: colors.danger, fontWeight: '600' },
    statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    statCard: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
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
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    statValue: { color: colors.text, fontSize: 26, fontWeight: '900', marginTop: 4 },
    hazardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    hazardItem: {
      width: '30%',
      flexGrow: 1,
      alignItems: 'center',
      padding: 8,
      minWidth: 90,
    },
    hazardIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    hazardLabel: { color: colors.muted, fontSize: 10, fontWeight: '700', textAlign: 'center' },
    hazardCount: { color: colors.muted, fontSize: 18, fontWeight: '900', marginTop: 4 },
    hazardCountActive: { color: colors.text },
    riskBarWrap: { marginBottom: 14 },
    riskBarHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    riskLabel: { color: colors.text, fontWeight: '800', fontSize: 13 },
    riskStats: { color: colors.text, fontWeight: '800', fontSize: 13 },
    riskPct: { color: colors.muted, fontWeight: '600' },
    riskTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      overflow: 'hidden',
    },
    riskFill: { height: '100%', borderRadius: 999 },
    riskTotalBox: {
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    riskTotalLabel: { color: colors.muted, fontWeight: '700', fontSize: 12 },
    riskTotalValue: { color: colors.text, fontWeight: '900', fontSize: 22 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 4,
    },
    allClear: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    allClearIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#dcfce7',
      alignItems: 'center',
      justifyContent: 'center',
    },
    allClearTitle: { color: colors.text, fontWeight: '900', fontSize: 18 },
    allClearDesc: { color: colors.muted, fontSize: 13, textAlign: 'center', fontWeight: '500' },
    conflictItem: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderRadius: 12,
      marginBottom: 8,
      borderWidth: 1,
    },
    conflictCritical: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
    conflictHigh: { backgroundColor: '#fff7ed', borderColor: '#fed7aa' },
    conflictIcon: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconCritical: { backgroundColor: '#dc2626' },
    iconHigh: { backgroundColor: '#f97316' },
    conflictTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      flexWrap: 'wrap',
    },
    conflictTitle: { color: colors.text, fontWeight: '800', fontSize: 13, flex: 1 },
    conflictReason: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    conflictLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    locText: { color: colors.muted, fontSize: 11, fontWeight: '600' },
    toggleBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 10,
    },
    toggleText: { color: colors.accent, fontWeight: '800', fontSize: 12 },
    alertsPanel: { backgroundColor: colors.surface2 },
    alertItem: { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
    alertCritical: {},
    alertIconBox: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertTitle: { color: colors.text, fontWeight: '800', fontSize: 13 },
    alertDesc: { color: colors.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },
    alertNominal: { color: colors.muted, fontWeight: '500', flex: 1 },
    statusFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 8,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    dotAlert: { backgroundColor: colors.warn },
    dotOk: { backgroundColor: colors.success },
    statusText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
    matrixRow: {
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    matrixFamily: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 8 },
    incompatTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    incompatTag: {
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    incompatTagText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
    meta: { color: colors.muted, fontSize: 13, fontWeight: '500' },
    protocolGrid: { gap: 0 },
    protocolCard: { alignItems: 'flex-start' },
    protocolIcon: {
      width: 52,
      height: 52,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    protocolTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
    protocolDesc: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
  });
}
