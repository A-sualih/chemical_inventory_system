import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';
import { HorizontalBarChart } from '../components/HorizontalBarChart';
import { Card, EmptyState, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = [2024, 2025, 2026, 2027];

const STATUS_COLORS: Record<string, string> = {
  Draft: '#94a3b8',
  Submitted: '#3b82f6',
  Approved: '#4f46e5',
  Rejected: '#ef4444',
  Ordered: '#7c3aed',
  'Partially Received': '#f59e0b',
  Completed: '#10b981',
  Cancelled: '#64748b',
};

function fmtMoney(n: number | undefined | null) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return `$${Number(n).toFixed(0)}`;
}

export default function ProcurementAnalyticsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/procurement/analytics', { params: { year } });
      setData(res.data);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <Screen>
        <Title>Procurement Analytics</Title>
        <EmptyState title="Loading analytics…" />
      </Screen>
    );
  }

  if (!data) {
    return (
      <Screen>
        <Title>Procurement Analytics</Title>
        <EmptyState title="Failed to load analytics" />
      </Screen>
    );
  }

  const { summary, ordersByStatus, monthlySpending, topSuppliers, topChemicals } = data;
  const maxMonthly = Math.max(...(monthlySpending || []).map((m: any) => m.total), 1);
  const maxSupplier = Math.max(...(topSuppliers || []).map((s: any) => s.totalSpent), 1);
  const statusData = (ordersByStatus || []).map((s: any) => ({ label: s._id, value: s.count }));
  const totalOrders = statusData.reduce((a: number, s: any) => a + s.value, 0) || 1;

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Title>Procurement Analytics</Title>
        <Subtitle>Supply chain KPIs and spending trends</Subtitle>

        <View style={styles.yearRow}>
          {YEARS.map((y) => (
            <Pressable
              key={y}
              onPress={() => setYear(y)}
              style={[styles.yearChip, year === y && styles.yearChipOn]}
            >
              <Text style={[styles.yearText, year === y && styles.yearTextOn]}>{y}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.metrics}>
          <MetricCard styles={styles} label="Total Spending" value={fmtMoney(summary?.totalSpending)} sub="Completed orders" />
          <MetricCard styles={styles} label="Total Orders" value={String(summary?.totalOrders || 0)} sub="All time" />
          <MetricCard styles={styles} label="Avg Order Value" value={fmtMoney(summary?.avgOrderValue)} sub="Per PO" />
          <MetricCard
            styles={styles}
            label="Active Suppliers"
            value={String(summary?.activeSuppliers || 0)}
            sub={`of ${summary?.totalSuppliers || 0} total`}
          />
        </View>

        <Card>
          <Text style={styles.chartTitle}>Monthly Procurement Spending — {year}</Text>
          <Text style={styles.chartSub}>Total spend per month from completed purchase orders</Text>
          <HorizontalBarChart
            data={(monthlySpending || []).map((m: any) => ({
              label: MONTHS[(m.month || 1) - 1],
              value: m.total || 0,
              display: fmtMoney(m.total),
              meta: `${m.count || 0} POs`,
            }))}
            color="#7c3aed"
          />
        </Card>

        <Card>
          <Text style={styles.chartTitle}>Orders by Status</Text>
          {(statusData.length ? statusData : []).map((s: any) => {
            const pct = Math.round((s.value / totalOrders) * 100);
            return (
              <View key={s.label} style={styles.statusRow}>
                <Text style={styles.statusLabel}>{s.label}</Text>
                <View style={styles.statusTrack}>
                  <View
                    style={[
                      styles.statusFill,
                      {
                        width: `${Math.max(pct, 2)}%`,
                        backgroundColor: STATUS_COLORS[s.label] || colors.muted,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.statusCount}>{s.value}</Text>
                <Text style={styles.statusPct}>{pct}%</Text>
              </View>
            );
          })}
        </Card>

        <Card>
          <Text style={styles.chartTitle}>Top Suppliers by Spend</Text>
          {(topSuppliers || []).length === 0 ? (
            <Text style={styles.meta}>No completed orders yet</Text>
          ) : (
            <HorizontalBarChart
              data={(topSuppliers || []).map((s: any) => ({
                label: (s.supplier?.name || 'Unknown').substring(0, 12),
                value: s.totalSpent || 0,
                display: fmtMoney(s.totalSpent),
                meta: `${s.orderCount || 0} POs`,
              }))}
              color="#3b82f6"
              prefix="$"
            />
          )}
        </Card>

        <Card>
          <Text style={styles.chartTitle}>Most Purchased Chemicals</Text>
          <Text style={styles.chartSub}>By total procurement cost across all orders</Text>
          {(topChemicals || []).length === 0 ? (
            <Text style={styles.meta}>No orders yet</Text>
          ) : (
            (topChemicals || []).map((c: any, i: number) => (
              <View key={c._id || i} style={styles.topItem}>
                <Text style={styles.rank}>#{i + 1}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.primary}>{c._id}</Text>
                  <Text style={styles.meta}>
                    {c.orderCount || 0} orders · {(c.totalQty || 0).toLocaleString()} units
                  </Text>
                </View>
                <Text style={styles.total}>{fmtMoney(c.totalCost)}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </Screen>
  );
}

function MetricCard({
  styles,
  label,
  value,
  sub,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    yearRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    yearChip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    yearChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    yearText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
    yearTextOn: { color: colors.accent },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 4 },
    metric: {
      width: '47%',
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: { color: colors.text, fontWeight: '900', fontSize: 20, marginTop: 6 },
    metricSub: { color: colors.muted, fontSize: 11, marginTop: 4 },
    chartTitle: { color: colors.text, fontWeight: '900', fontSize: 16, marginBottom: 4 },
    chartSub: { color: colors.muted, fontSize: 12, marginBottom: 10 },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 8,
    },
    statusLabel: { width: 88, color: colors.text, fontWeight: '700', fontSize: 11 },
    statusTrack: {
      flex: 1,
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      overflow: 'hidden',
    },
    statusFill: { height: '100%', borderRadius: 999 },
    statusCount: { width: 28, textAlign: 'right', color: colors.text, fontWeight: '800', fontSize: 12 },
    statusPct: { width: 32, textAlign: 'right', color: colors.muted, fontWeight: '700', fontSize: 11 },
    topItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    rank: { color: colors.accent, fontWeight: '900', width: 28 },
    primary: { color: colors.text, fontWeight: '800' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    total: { color: colors.text, fontWeight: '900' },
  });
}
