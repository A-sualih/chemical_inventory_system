import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Platform,
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
import { asList, toneForStatus } from '../utils/apiHelpers';
import { fmtQty } from '../utils/formatQuantity';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, EmptyState, Input, Screen, Title } from '../components/ui';

const STATUS_CHIPS = ['All', 'Active', 'Expired', 'Near Expiry', 'Depleted'] as const;

function normStatus(s?: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
}

/**
 * Batches — sticky toolbar + horizontal scroll filters (same pattern as Containers).
 */
export default function BatchesScreen() {
  const { hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof STATUS_CHIPS)[number]>('All');
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    batch_number: '',
    chemical_id: '',
    total_quantity: '0',
    unit: 'L',
    manufacturing_date: '',
    expiry_date: '',
    supplier_name: '',
    status: 'Active',
    notes: '',
  });

  const canCreate = hasPermission('create_chemical');
  const canEdit = hasPermission('edit_chemical');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/batches');
      setItems(asList(data, ['batches', 'data']));
    } catch {
      /* keep previous */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(
    () => ({
      active: items.filter((b) => normStatus(b.status) === 'active').length,
      expired: items.filter((b) => normStatus(b.status) === 'expired').length,
      near: items.filter((b) => normStatus(b.status).includes('near')).length,
      total: items.length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((b) => {
      const matchesSearch =
        !q ||
        [b.batch_number, b.lot_number, b.chemical_name, b.chemical_id, b.supplier_name]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const matchesStatus =
        filter === 'All' || normStatus(b.status) === normStatus(filter);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, filter]);

  const openCreate = () => {
    setEditItem(null);
    setForm({
      batch_number: `B-${Date.now().toString().slice(-4)}`,
      chemical_id: '',
      total_quantity: '0',
      unit: 'L',
      manufacturing_date: '',
      expiry_date: '',
      supplier_name: '',
      status: 'Active',
      notes: '',
    });
    setMsg('');
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      batch_number: item.batch_number || item.lot_number || '',
      chemical_id: item.chemical_id || '',
      total_quantity: String(item.total_quantity ?? item.quantity ?? 0),
      unit: item.unit || 'L',
      manufacturing_date: item.manufacturing_date?.split?.('T')?.[0] || '',
      expiry_date: item.expiry_date?.split?.('T')?.[0] || '',
      supplier_name: item.supplier_name || '',
      status: item.status || 'Active',
      notes: item.notes || '',
    });
    setMsg('');
    setModalOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setMsg('');
    try {
      const payload = {
        batch_number: form.batch_number.trim(),
        chemical_id: form.chemical_id.trim(),
        total_quantity: Number(form.total_quantity) || 0,
        unit: form.unit.trim() || 'L',
        manufacturing_date: form.manufacturing_date || undefined,
        expiry_date: form.expiry_date || undefined,
        supplier_name: form.supplier_name.trim() || undefined,
        status: form.status || 'Active',
        notes: form.notes.trim() || undefined,
      };
      if (editItem) {
        const id = editItem.batch_number || editItem._id;
        await api.put(`/batches/${id}`, payload);
      } else {
        if (!payload.chemical_id) {
          setMsg('chemical_id is required.');
          setSaving(false);
          return;
        }
        await api.post('/batches', payload);
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: any) => {
    const id = item.batch_number || item._id;
    const ok = await dialog.confirm({
      title: 'Delete batch',
      message: `Delete batch ${id}?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/batches/${id}`);
      await load();
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Delete failed');
    }
  };

  const patch = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Screen style={styles.screen}>
      <View style={styles.toolbar}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Title style={styles.title}>Batches</Title>
            <Text style={styles.subtitle}>
              {filtered.length} of {items.length} lots
            </Text>
          </View>
          {canCreate ? (
            <Pressable style={styles.addBtn} onPress={openCreate} accessibilityRole="button">
              <Text style={styles.addText}>+ New</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsStrip}>
          {[
            { label: 'Active', value: stats.active },
            { label: 'Expired', value: stats.expired },
            { label: 'Near', value: stats.near },
            { label: 'Total', value: stats.total },
          ].map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Input
          placeholder="Search lot / chemical / supplier…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          style={styles.search}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.chipRow}
          style={styles.chipScroll}
        >
          {STATUS_CHIPS.map((s) => {
            const on = filter === s;
            return (
              <Pressable
                key={s}
                onPress={() => setFilter(s)}
                style={[styles.chip, on && styles.chipOn]}
                accessibilityRole="button"
              >
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        style={[styles.list, Platform.OS === 'web' ? ({ overflowY: 'auto', height: '100%' } as object) : null]}
        data={filtered}
        keyExtractor={(item) => item._id || item.batch_number || item.lot_number}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading ? <EmptyState title="No batches" body="Try another filter or pull to refresh." /> : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.name} numberOfLines={1}>
                {item.batch_number || item.lot_number || 'Batch'}
              </Text>
              <Text style={styles.meta} numberOfLines={2}>
                {[
                  item.chemical_name || item.chemical_id,
                  item.supplier_name,
                  item.total_quantity != null || item.quantity != null
                    ? fmtQty(item.total_quantity ?? item.quantity, item.unit)
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {[
                  item.manufacturing_date
                    ? `MFG ${new Date(item.manufacturing_date).toLocaleDateString()}`
                    : null,
                  item.expiry_date ? `Exp ${new Date(item.expiry_date).toLocaleDateString()}` : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {canEdit ? (
                <View style={styles.rowActions}>
                  <Pressable
                    onPress={() => openEdit(item)}
                    style={styles.actionHit}
                    accessibilityRole="button"
                  >
                    <Text style={styles.editLink}>Edit</Text>
                  </Pressable>
                  {canCreate ? (
                    <Pressable
                      onPress={() => void remove(item)}
                      style={styles.actionHit}
                      accessibilityRole="button"
                    >
                      <Text style={styles.deleteLink}>Delete</Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
            <Badge label={item.status || '—'} tone={toneForStatus(item.status)} />
          </View>
        )}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>{editItem ? 'Edit Batch' : 'New Batch'}</Text>
            <Input placeholder="Lot / batch number" value={form.batch_number} onChangeText={(v) => patch('batch_number', v)} autoCapitalize="none" />
            <Input placeholder="Chemical ID *" value={form.chemical_id} onChangeText={(v) => patch('chemical_id', v)} autoCapitalize="none" />
            <Input placeholder="Quantity" value={form.total_quantity} onChangeText={(v) => patch('total_quantity', v)} keyboardType="decimal-pad" />
            <Input placeholder="Unit" value={form.unit} onChangeText={(v) => patch('unit', v)} />
            <Input placeholder="Supplier" value={form.supplier_name} onChangeText={(v) => patch('supplier_name', v)} />
            <Input placeholder="MFG date (YYYY-MM-DD)" value={form.manufacturing_date} onChangeText={(v) => patch('manufacturing_date', v)} />
            <Input placeholder="Expiry (YYYY-MM-DD)" value={form.expiry_date} onChangeText={(v) => patch('expiry_date', v)} />
            <Input placeholder="Status" value={form.status} onChangeText={(v) => patch('status', v)} />
            <Input placeholder="Notes" value={form.notes} onChangeText={(v) => patch('notes', v)} multiline />
            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            <Button label="Save batch" onPress={() => void save()} loading={saving} />
            <Button label="Cancel" variant="ghost" onPress={() => setModalOpen(false)} />
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: { paddingTop: 4 },
    toolbar: {
      flexShrink: 0,
      paddingBottom: 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      marginBottom: 8,
      zIndex: 2,
      backgroundColor: colors.bg,
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    title: { fontSize: 22, marginBottom: 0 },
    subtitle: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
    addBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      minHeight: 40,
      justifyContent: 'center',
    },
    addText: { color: colors.btnText, fontWeight: '900', fontSize: 13 },
    statsStrip: {
      flexDirection: 'row',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 14,
      marginBottom: 8,
      overflow: 'hidden',
    },
    statCell: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRightWidth: StyleSheet.hairlineWidth,
      borderRightColor: colors.border,
    },
    statValue: { color: colors.text, fontSize: 18, fontWeight: '900' },
    statLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      marginTop: 2,
    },
    search: { marginBottom: 8 },
    chipScroll: { maxHeight: 44, marginBottom: 4, flexGrow: 0 },
    chipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'nowrap',
      gap: 8,
      paddingRight: 12,
      paddingVertical: 2,
    },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      justifyContent: 'center',
      flexShrink: 0,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.muted, fontWeight: '800', fontSize: 12 },
    chipTextOn: { color: colors.btnText },
    list: { flex: 1, minHeight: 0 },
    listContent: { paddingBottom: 48, flexGrow: 1 },
    row: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    name: { fontWeight: '800', fontSize: 15, color: colors.text },
    meta: { fontSize: 12, marginTop: 4, color: colors.muted, lineHeight: 16 },
    rowActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
    actionHit: { paddingVertical: 8, paddingHorizontal: 4, minHeight: 40, justifyContent: 'center' },
    editLink: { color: colors.accent, fontWeight: '800', fontSize: 13 },
    deleteLink: { color: colors.danger, fontWeight: '800', fontSize: 13 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalScroll: { maxHeight: '90%' },
    modalCard: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      paddingBottom: 40,
    },
    modalTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 12 },
    msg: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
  });
}
