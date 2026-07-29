import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { HorizontalBarChart } from '../components/HorizontalBarChart';
import { Button, Card, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import { fmtQty } from '../utils/formatQuantity';
import { exportInventoryReport } from '../utils/reportExport';
import type { ThemeColors } from '../theme/colors';

const HAZARD_COLORS = ['#0f172a', '#3b82f6', '#f59e0b', '#ef4444', '#10b981', '#6366f1'];

export default function ComplianceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [usageData, setUsageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params: Record<string, string> = {};
      if (dateRange.start.trim()) params.start = dateRange.start.trim();
      if (dateRange.end.trim()) params.end = dateRange.end.trim();
      const [invRes, usageRes] = await Promise.all([
        api.get('/reports/inventory'),
        api.get('/reports/usage', { params }),
      ]);
      setInventoryData(invRes.data);
      setUsageData(usageRes.data);
    } catch (err: any) {
      const msg =
        err.response?.data?.error ||
        'Could not load analytics. Check permissions or try again.';
      setLoadError(msg);
      setInventoryData(null);
      setUsageData(null);
    } finally {
      setLoading(false);
    }
  }, [dateRange.start, dateRange.end]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading && !inventoryData && !loadError) {
    return (
      <Screen>
        <Title>Intelligence & Analytics</Title>
        <Subtitle>Loading report data…</Subtitle>
        <EmptyState title="Loading analytics" />
      </Screen>
    );
  }

  if (loadError && !inventoryData) {
    return (
      <Screen>
        <Title>Analytics unavailable</Title>
        <Card>
          <Text style={styles.error}>{loadError}</Text>
          <Button label="Try again" onPress={() => void fetchData()} />
        </Card>
      </Screen>
    );
  }

  const summary = inventoryData?.summary || {};
  const usageStats = usageData?.usageStats || [];
  const topChemicals = usageData?.topChemicals || [];
  const hazards = inventoryData?.hazards || [];

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchData} tintColor={colors.accent} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Title>Intelligence & Analytics</Title>
        <Subtitle>Data-driven insights for laboratory compliance.</Subtitle>

        <Text style={styles.label}>Date range</Text>
        <Input
          placeholder="Start YYYY-MM-DD"
          value={dateRange.start}
          onChangeText={(v) => setDateRange((d) => ({ ...d, start: v }))}
          autoCapitalize="none"
        />
        <Input
          placeholder="End YYYY-MM-DD"
          value={dateRange.end}
          onChangeText={(v) => setDateRange((d) => ({ ...d, end: v }))}
          autoCapitalize="none"
        />
        <View style={styles.actions}>
          <Button label="Refresh" onPress={() => void fetchData()} loading={loading} />
          <Button label="Export XLSX" variant="ghost" onPress={() => void exportInventoryReport('excel')} />
          <Button label="Export PDF" onPress={() => void exportInventoryReport('pdf')} />
        </View>

        <View style={styles.metrics}>
          <ReportCard
            styles={styles}
            title="Active Assets"
            value={String(summary.totalChemicals ?? 0)}
            icon="cube-outline"
            tint={colors.text}
          />
          <ReportCard
            styles={styles}
            title="Expired Items"
            value={String(summary.expired ?? 0)}
            icon="warning-outline"
            tint={colors.danger}
          />
          <ReportCard
            styles={styles}
            title="Near Expiry"
            value={String(summary.nearExpiry ?? 0)}
            icon="time-outline"
            tint={colors.warn}
          />
          <ReportCard
            styles={styles}
            title="Low Stock"
            value={String(summary.lowStock ?? 0)}
            icon="trending-up-outline"
            tint={colors.accent}
          />
        </View>

        <Text style={styles.section}>Expired Inventory</Text>
        <StatusList
          styles={styles}
          items={inventoryData?.lists?.expired || []}
          empty="No expired items detected."
          tone="danger"
          badgeKey="expiry_date"
        />

        <Text style={styles.section}>Near Expiry (30d)</Text>
        <StatusList
          styles={styles}
          items={inventoryData?.lists?.nearExpiry || []}
          empty="No items near expiry."
          tone="warn"
          badgeKey="expiry_date"
        />

        <Text style={styles.section}>Low Stock Alerts</Text>
        <StatusList
          styles={styles}
          items={inventoryData?.lists?.lowStock || []}
          empty="All stock levels adequate."
          tone="accent"
          badgeKey="quantity"
        />

        <Card>
          <Text style={styles.chartTitle}>Consumption Velocity</Text>
          <Text style={styles.chartSub}>Daily Outflow</Text>
          {usageStats.length === 0 ? (
            <Text style={styles.meta}>No usage data for selected range.</Text>
          ) : (
            <HorizontalBarChart
              data={usageStats.map((u: any) => ({
                label: String(u._id),
                value: u.totalQuantity || 0,
                display: String(u.totalQuantity ?? 0),
              }))}
              color="#3b82f6"
            />
          )}
        </Card>

        <Card>
          <Text style={styles.chartTitle}>Risk Landscape</Text>
          <Text style={styles.chartSub}>Hazard Groups</Text>
          {hazards.length === 0 ? (
            <Text style={styles.meta}>No hazard breakdown available.</Text>
          ) : (
            <View style={{ gap: 8, marginTop: 8 }}>
              {hazards.map((h: any, i: number) => (
                <View key={h._id || i} style={styles.hazardRow}>
                  <View
                    style={[styles.hazardDot, { backgroundColor: HAZARD_COLORS[i % HAZARD_COLORS.length] }]}
                  />
                  <Text style={styles.primary}>{h._id || 'Unknown'}</Text>
                  <Text style={styles.meta}>{h.count ?? 0}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <Text style={styles.chartTitle}>Most Consumed Assets</Text>
          <Text style={styles.chartSub}>Top 10 Volume</Text>
          {topChemicals.length === 0 ? (
            <Text style={styles.meta}>No consumption data.</Text>
          ) : (
            <HorizontalBarChart
              data={topChemicals.map((c: any) => ({
                label: String(c._id).slice(0, 18),
                value: c.totalUsed || 0,
              }))}
              color="#0f172a"
            />
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function ReportCard({
  styles,
  title,
  value,
  icon,
  tint,
}: {
  styles: ReturnType<typeof makeStyles>;
  title: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
}) {
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: `${tint}14` }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <Text style={styles.metricLabel}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function StatusList({
  styles,
  items,
  empty,
  tone,
  badgeKey,
}: {
  styles: ReturnType<typeof makeStyles>;
  items: any[];
  empty: string;
  tone: 'danger' | 'warn' | 'accent';
  badgeKey: 'expiry_date' | 'quantity';
}) {
  const badgeColors = {
    danger: styles.badgeDanger,
    warn: styles.badgeWarn,
    accent: styles.badgeAccent,
  };

  if (!items.length) {
    return (
      <Card>
        <Text style={styles.meta}>{empty}</Text>
      </Card>
    );
  }

  return items.map((item) => (
    <Card key={item.id || item._id}>
      <Text style={styles.primary}>{item.name}</Text>
      <Text style={styles.meta}>
        {item.location || 'No Location'}
        {item.batch_number ? ` · Batch: ${item.batch_number}` : ''}
      </Text>
      <View style={[styles.badge, badgeColors[tone]]}>
        <Text style={styles.badgeText}>
          {badgeKey === 'expiry_date'
            ? new Date(item.expiry_date).toLocaleDateString()
            : fmtQty(item.quantity, item.unit)}
        </Text>
      </View>
    </Card>
  ));
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    actions: { gap: 8, marginBottom: 8 },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
    metric: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    metricIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 8,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: { color: colors.text, fontWeight: '900', fontSize: 22, marginTop: 4 },
    section: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      fontSize: 11,
      letterSpacing: 1,
      marginTop: 18,
      marginBottom: 8,
    },
    chartTitle: { color: colors.text, fontWeight: '900', fontSize: 16 },
    chartSub: { color: colors.muted, fontSize: 12, marginTop: 2, marginBottom: 10 },
    primary: { color: colors.text, fontWeight: '800' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    error: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
    hazardRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    hazardDot: { width: 10, height: 10, borderRadius: 5 },
    badge: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    badgeDanger: { backgroundColor: `${colors.danger}22` },
    badgeWarn: { backgroundColor: `${colors.warn}22` },
    badgeAccent: { backgroundColor: `${colors.accent}22` },
    badgeText: { color: colors.text, fontWeight: '800', fontSize: 11 },
  });
}
