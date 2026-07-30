import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
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
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const CRITERIA: { field: string; label: string }[] = [
  { field: 'delivery_punctuality', label: 'Delivery Punctuality' },
  { field: 'order_accuracy', label: 'Order Accuracy' },
  { field: 'chemical_quality', label: 'Chemical Quality' },
  { field: 'communication', label: 'Communication' },
  { field: 'safety_compliance', label: 'Safety Compliance' },
];

const emptyForm = {
  supplier_id: '',
  purchase_order_id: '',
  delivery_punctuality: 0,
  order_accuracy: 0,
  chemical_quality: 0,
  communication: 0,
  safety_compliance: 0,
  was_on_time: true,
  had_damaged_goods: false,
  had_quantity_mismatch: false,
  shipment_rejected: false,
  comments: '',
  incident_description: '',
};

function Stars({
  value,
  onSelect,
  colors,
}: {
  value: number;
  onSelect: (n: number) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Pressable key={s} onPress={() => onSelect(s)} hitSlop={6}>
          <Ionicons
            name={s <= value ? 'star' : 'star-outline'}
            size={22}
            color={s <= value ? '#fbbf24' : colors.muted}
          />
        </Pressable>
      ))}
    </View>
  );
}

export default function VendorPerformanceScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [activeView, setActiveView] = useState<'reviews' | 'rankings'>('reviews');
  const [reviews, setReviews] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [rankings, setRankings] = useState<any[]>([]);
  const [filterSupplier, setFilterSupplier] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, sRes, rankRes] = await Promise.all([
        api.get('/procurement/reviews', { params: { supplier_id: filterSupplier || undefined } }),
        api.get('/procurement/suppliers', { params: { limit: 100 } }),
        api.get('/procurement/suppliers/rankings'),
      ]);
      setReviews(Array.isArray(rRes.data) ? rRes.data : rRes.data?.reviews || []);
      setSuppliers(sRes.data?.suppliers || (Array.isArray(sRes.data) ? sRes.data : []));
      setRankings(Array.isArray(rankRes.data) ? rankRes.data : rankRes.data?.rankings || []);
    } catch {
      await dialog.alert('Vendor Performance', 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [filterSupplier]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  const avgScore = () => {
    const scores = CRITERIA.map((c) => (form as any)[c.field]).filter((s) => s > 0);
    return scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '—';
  };

  const handleSubmit = async () => {
    if (!form.supplier_id) {
      await dialog.alert('Review', 'Select a supplier.');
      return;
    }
    if (CRITERIA.some((c) => (form as any)[c.field] === 0)) {
      await dialog.alert('Review', 'Please rate all 5 criteria.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = { ...form };
      Object.keys(payload).forEach((key) => {
        if (payload[key] === '' || payload[key] == null) delete payload[key];
      });
      await api.post('/procurement/reviews', payload);
      setShowModal(false);
      setForm(emptyForm);
      await fetch();
    } catch (e: any) {
      await dialog.alert('Review', e.response?.data?.error || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const reliabilityClass = (score: number) =>
    score >= 80 ? styles.relHigh : score >= 60 ? styles.relMid : styles.relLow;

  const filterChips = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.chipScroll}
      contentContainerStyle={styles.chipScrollContent}
    >
      <Pressable
        onPress={() => setFilterSupplier('')}
        style={[styles.chip, !filterSupplier && styles.chipOn]}
      >
        <Text style={[styles.chipText, !filterSupplier && styles.chipTextOn]} numberOfLines={1}>
          All Suppliers
        </Text>
      </Pressable>
      {suppliers.map((s) => (
        <Pressable
          key={s._id}
          onPress={() => setFilterSupplier(s._id)}
          style={[styles.chip, filterSupplier === s._id && styles.chipOn]}
        >
          <Text
            style={[styles.chipText, filterSupplier === s._id && styles.chipTextOn]}
            numberOfLines={1}
          >
            {s.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );

  return (
    <Screen>
      <Title>Vendor Performance</Title>
      <Subtitle>Reviews and supplier rankings</Subtitle>

      <View style={styles.tabs}>
        {(['reviews', 'rankings'] as const).map((id) => (
          <Pressable
            key={id}
            style={[styles.tab, activeView === id && styles.tabOn]}
            onPress={() => setActiveView(id)}
          >
            <Text style={[styles.tabText, activeView === id && styles.tabTextOn]}>
              {id === 'reviews' ? 'Reviews' : 'Supplier Rankings'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeView === 'rankings' ? (
        <FlatList
          data={rankings}
          keyExtractor={(item, i) => item._id || String(i)}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.accent} />
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState title="No suppliers to rank yet" body="Submit reviews to build rankings." />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => (
            <View style={styles.card}>
              <View style={styles.rankRow}>
                <View style={[styles.rankBadge, index < 3 && styles.rankTop]}>
                  <Text style={[styles.rankText, index < 3 && { color: colors.warn }]}>
                    {index < 3 ? '★' : index + 1}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.primary} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.supplier_id}
                  </Text>
                </View>
                <Text style={styles.rating}>★ {item.rating?.toFixed(1) || '—'}</Text>
              </View>
              <View style={styles.rankGrid}>
                <RankStat label="On-Time" value={`${item.on_time_delivery_rate ?? '—'}%`} />
                <RankStat
                  label="Reliability"
                  value={String(item.reliability_score ?? '—')}
                  pill={reliabilityClass(item.reliability_score || 0)}
                />
                <RankStat label="Orders" value={String(item.total_orders ?? 0)} />
                <RankStat label="Delayed" value={String(item.delayed_orders ?? 0)} warn />
                <RankStat label="Rejected" value={String(item.rejected_shipments ?? 0)} danger />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={reviews}
          keyExtractor={(item, i) => item._id || String(i)}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={fetch} tintColor={colors.accent} />
          }
          ListHeaderComponent={
            <View style={styles.listHeader}>
              {filterChips}
              <Pressable style={styles.submitBtn} onPress={() => setShowModal(true)}>
                <Ionicons name="add" size={18} color={colors.btnText} />
                <Text style={styles.submitBtnText}>Submit Review</Text>
              </Pressable>
            </View>
          }
          ListEmptyComponent={
            !loading ? (
              <EmptyState
                title="No reviews yet"
                body="Submit the first vendor performance review."
              />
            ) : null
          }
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.reviewHeader}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.primary} numberOfLines={1}>
                    {item.supplier_id?.name || '—'}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {item.purchase_order_id?.po_number || 'General Review'}
                  </Text>
                </View>
                <View style={styles.ratingPill}>
                  <Text style={styles.rating}>★ {item.overall_rating?.toFixed(1) || '—'}</Text>
                </View>
              </View>
              <View style={styles.criteriaGrid}>
                {CRITERIA.map((c) => (
                  <View key={c.field} style={styles.criteriaBox}>
                    <Text style={styles.criteriaLabel} numberOfLines={1}>
                      {c.label.split(' ')[0]}
                    </Text>
                    <Text style={styles.criteriaVal}>{item[c.field]}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.flags}>
                {item.was_on_time ? (
                  <Flag label="On Time" tone="ok" />
                ) : (
                  <Flag label="Late" tone="danger" />
                )}
                {item.had_damaged_goods ? <Flag label="Damaged" tone="warn" /> : null}
                {item.had_quantity_mismatch ? <Flag label="Qty Mismatch" tone="warn" /> : null}
                {item.shipment_rejected ? <Flag label="Rejected" tone="danger" /> : null}
              </View>
              {item.comments ? <Text style={styles.comment}>"{item.comments}"</Text> : null}
              <Text style={styles.meta}>
                by {item.reviewed_by_name || item.reviewed_by?.name || 'Unknown'} ·{' '}
                {new Date(item.review_date).toLocaleDateString()}
              </Text>
            </View>
          )}
        />
      )}

      <Modal visible={showModal} animationType="slide" onRequestClose={() => setShowModal(false)}>
        <Screen>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: 40 }}
          >
            <View style={styles.modalHeader}>
              <Title>Submit Vendor Review</Title>
              <Pressable onPress={() => setShowModal(false)} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.muted} />
              </Pressable>
            </View>

            <Text style={styles.label}>Supplier *</Text>
            <View style={styles.supplierWrap}>
              {suppliers.map((s) => (
                <Pressable
                  key={s._id}
                  onPress={() => setForm((f) => ({ ...f, supplier_id: s._id }))}
                  style={[styles.chip, form.supplier_id === s._id && styles.chipOn]}
                >
                  <Text
                    style={[styles.chipText, form.supplier_id === s._id && styles.chipTextOn]}
                    numberOfLines={1}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              ))}
              {suppliers.length === 0 ? (
                <Text style={styles.meta}>No suppliers available.</Text>
              ) : null}
            </View>

            <Text style={styles.label}>Performance Scores (1–5 stars) *</Text>
            {CRITERIA.map((c) => (
              <View key={c.field} style={styles.scoreRow}>
                <Text style={styles.scoreLabel}>{c.label}</Text>
                <Stars
                  value={(form as any)[c.field]}
                  onSelect={(n) => setForm((f) => ({ ...f, [c.field]: n }))}
                  colors={colors}
                />
              </View>
            ))}
            <Text style={[styles.rating, { marginBottom: 12 }]}>Overall: ★ {avgScore()}</Text>

            <View style={styles.checkCard}>
              {(
                [
                  ['was_on_time', 'Delivered On Time', colors.accent],
                  ['had_damaged_goods', 'Damaged Goods', colors.warn],
                  ['had_quantity_mismatch', 'Qty Mismatch', colors.warn],
                  ['shipment_rejected', 'Rejected', colors.danger],
                ] as const
              ).map(([key, label, track]) => (
                <View key={key} style={styles.checkRow}>
                  <Text style={styles.checkLabel}>{label}</Text>
                  <Switch
                    value={(form as any)[key]}
                    onValueChange={(v) => setForm((f) => ({ ...f, [key]: v }))}
                    trackColor={{ false: colors.border, true: track }}
                  />
                </View>
              ))}
            </View>

            <Input
              placeholder="Overall feedback…"
              value={form.comments}
              onChangeText={(v) => setForm((f) => ({ ...f, comments: v }))}
              multiline
              style={{ minHeight: 80, textAlignVertical: 'top' }}
            />

            {(form.had_damaged_goods || form.shipment_rejected) && (
              <>
                <Text style={[styles.label, { color: colors.danger }]}>Incident Description</Text>
                <Input
                  value={form.incident_description}
                  onChangeText={(v) => setForm((f) => ({ ...f, incident_description: v }))}
                  multiline
                  style={{ minHeight: 60, textAlignVertical: 'top' }}
                />
              </>
            )}

            <Button
              label={submitting ? 'Submitting…' : 'Submit Review'}
              onPress={() => void handleSubmit()}
              loading={submitting}
            />
            <Button label="Cancel" variant="ghost" onPress={() => setShowModal(false)} />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function RankStat({
  label,
  value,
  pill,
  warn,
  danger,
}: {
  label: string;
  value: string;
  pill?: object;
  warn?: boolean;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: 'center', minWidth: 56, flex: 1 }}>
      <Text style={{ color: colors.muted, fontSize: 10, fontWeight: '700' }}>{label}</Text>
      <Text
        style={[
          { color: colors.text, fontWeight: '900', fontSize: 13, marginTop: 2 },
          pill,
          warn && { color: colors.warn },
          danger && { color: colors.danger },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function Flag({ label, tone }: { label: string; tone: 'ok' | 'warn' | 'danger' }) {
  const { colors } = useTheme();
  const bg =
    tone === 'ok'
      ? `${colors.success}22`
      : tone === 'warn'
        ? `${colors.warn}22`
        : `${colors.danger}22`;
  const fg = tone === 'ok' ? colors.success : tone === 'warn' ? colors.warn : colors.danger;
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
      }}
    >
      <Text style={{ color: fg, fontWeight: '800', fontSize: 10 }}>{label}</Text>
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 4,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tab: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tabOn: { backgroundColor: colors.accentSoft },
    tabText: { color: colors.muted, fontWeight: '700', fontSize: 13 },
    tabTextOn: { color: colors.accent, fontWeight: '800' },

    listHeader: { marginBottom: 4 },
    listContent: { paddingBottom: 40, flexGrow: 1 },

    /** Prevent RN Web from stretching horizontal chips into a tall pill */
    chipScroll: {
      flexGrow: 0,
      flexShrink: 0,
      maxHeight: 44,
      marginBottom: 12,
    },
    chipScrollContent: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingRight: 8,
      gap: 8,
    },
    chip: {
      height: 36,
      paddingHorizontal: 14,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'center',
      flexShrink: 0,
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    chipText: { color: colors.muted, fontWeight: '700', fontSize: 12, lineHeight: 16 },
    chipTextOn: { color: colors.accent },

    supplierWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 8,
    },

    submitBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      marginBottom: 14,
    },
    submitBtnText: { color: colors.btnText, fontWeight: '800', fontSize: 15 },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    primary: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    rating: { color: '#d97706', fontWeight: '900', fontSize: 14 },
    ratingPill: {
      backgroundColor: 'rgba(251, 191, 36, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 10,
    },
    reviewHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      marginBottom: 12,
    },
    criteriaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    criteriaBox: {
      width: '30%',
      flexGrow: 1,
      backgroundColor: colors.surface2,
      borderRadius: 10,
      paddingVertical: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    criteriaLabel: { color: colors.muted, fontSize: 10, fontWeight: '700' },
    criteriaVal: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 2 },
    flags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
    comment: {
      color: colors.text,
      fontStyle: 'italic',
      marginBottom: 6,
      lineHeight: 20,
    },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    rankBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    rankTop: {
      backgroundColor: 'rgba(251, 191, 36, 0.18)',
      borderColor: 'rgba(251, 191, 36, 0.45)',
    },
    rankText: { fontWeight: '900', color: colors.text, fontSize: 13 },
    rankGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
      paddingTop: 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    relHigh: { color: colors.success },
    relMid: { color: colors.warn },
    relLow: { color: colors.danger },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 8,
      marginTop: 10,
    },
    scoreRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
      paddingVertical: 4,
    },
    scoreLabel: { color: colors.text, fontWeight: '700', flex: 1, fontSize: 13, paddingRight: 8 },
    checkCard: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 6,
      marginBottom: 12,
    },
    checkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    checkLabel: { color: colors.text, fontWeight: '700', fontSize: 14 },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
  });
}
