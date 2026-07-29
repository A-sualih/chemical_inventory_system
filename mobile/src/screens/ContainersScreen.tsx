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

const STATUS_CHIPS = ['All', 'Full', 'In Use', 'Empty', 'Expired', 'Near Expiry', 'Damaged'] as const;

function normStatus(s?: string) {
  return String(s || '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
}

function formatLot(batch?: string) {
  if (!batch) return null;
  const t = String(batch).trim();
  if (/^lot[\s_-]/i.test(t)) return t;
  return `LOT ${t}`;
}

function shortBarcode(raw?: string) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (s.length <= 28) return s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      const tail = u.pathname.replace(/\/$/, '').split('/').pop() || u.host;
      return `${u.host}/${tail}`.slice(0, 32);
    } catch {
      return `${s.slice(0, 26)}…`;
    }
  }
  return `${s.slice(0, 26)}…`;
}

const emptyForm = () => ({
  container_id: `CONT-${Date.now().toString().slice(-4)}`,
  barcode: '',
  chemical_id: '',
  quantity: '',
  unit: 'L',
  building: '',
  room: '',
  cabinet: '',
  shelf: '',
  batch_number: '',
  expiry_date: '',
  container_type: 'Plastic bottle',
  status: 'Full',
  notes: '',
});

/**
 * Containers — sticky toolbar + independent list scroll (fixes cramped / awkward scroll on mobile web).
 */
export default function ContainersScreen() {
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
  const [form, setForm] = useState(emptyForm());

  const canCreate = hasPermission('create_chemical');
  const canUpdateStock = hasPermission('update_stock');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/containers');
      setItems(asList(data, ['containers', 'data']));
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
      total: items.length,
      inUse: items.filter((c) => normStatus(c.status) === 'in use').length,
      critical: items.filter((c) => ['expired', 'near expiry'].includes(normStatus(c.status))).length,
      available: items.filter((c) => normStatus(c.status) === 'full').length,
    }),
    [items]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((c) => {
      const matchesSearch =
        !q ||
        [c.container_id, c.id, c.chemical_name, c.chemical_id, c.batch_number, c.barcode]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const matchesStatus = filter === 'All' || normStatus(c.status) === normStatus(filter);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, filter]);

  const openCreate = () => {
    setEditItem(null);
    setForm(emptyForm());
    setMsg('');
    setModalOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({
      container_id: item.container_id || item.id || '',
      barcode: item.barcode || '',
      chemical_id: item.chemical_id || '',
      quantity: String(item.quantity ?? ''),
      unit: item.unit || 'L',
      building: item.building || '',
      room: item.room || '',
      cabinet: item.cabinet || '',
      shelf: item.shelf || '',
      batch_number: item.batch_number || '',
      expiry_date: item.expiry_date?.split?.('T')?.[0] || item.expiry_date || '',
      container_type: item.container_type || 'Plastic bottle',
      status: item.status || 'Full',
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
        ...form,
        quantity: Number(form.quantity) || 0,
      };
      if (editItem) {
        const id = editItem.container_id || editItem._id || editItem.id;
        await api.put(`/containers/${id}`, payload);
      } else {
        if (!form.chemical_id.trim()) {
          setMsg('chemical_id is required.');
          setSaving(false);
          return;
        }
        await api.post('/containers', payload);
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
    const id = item.container_id || item._id;
    const ok = await dialog.confirm({
      title: 'Delete container',
      message: `Delete ${id}?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/containers/${id}`);
      await load();
    } catch (e: any) {
      await dialog.alert('Error', e.response?.data?.error || 'Delete failed');
    }
  };

  const patch = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  return (
    <Screen style={styles.screen}>
      {/* Fixed top — does not scroll with the list */}
      <View style={styles.toolbar}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Title style={styles.title}>Containers</Title>
            <Text style={styles.subtitle}>
              {filtered.length} of {items.length} vessels
            </Text>
          </View>
          {canCreate ? (
            <Pressable style={styles.addBtn} onPress={openCreate} accessibilityRole="button">
              <Text style={styles.addText}>+ Add</Text>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.statsStrip}>
          {[
            { label: 'Total', value: stats.total },
            { label: 'In use', value: stats.inUse },
            { label: 'Critical', value: stats.critical },
            { label: 'Full', value: stats.available },
          ].map((s) => (
            <View key={s.label} style={styles.statCell}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        <Input
          placeholder="Search container, chemical, batch…"
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

      {/* Only the vessel list scrolls */}
      <FlatList
        style={[styles.list, Platform.OS === 'web' ? ({ overflowY: 'auto', height: '100%' } as object) : null]}
        data={filtered}
        keyExtractor={(item) => item._id || item.container_id || String(item.id)}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading ? <EmptyState title="No containers" body="Try another filter or pull to refresh." /> : null
        }
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        renderItem={({ item }) => {
          const barcodeLabel = shortBarcode(item.barcode);
          return (
            <View style={styles.row}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.container_id || item.id || 'Container'}
                </Text>
                {barcodeLabel ? (
                  <Text style={styles.meta} numberOfLines={1}>
                    Barcode: {barcodeLabel}
                  </Text>
                ) : null}
                <Text style={styles.meta} numberOfLines={2}>
                  {[
                    item.chemical_name || item.chemical_id,
                    formatLot(item.batch_number),
                    item.quantity != null ? fmtQty(item.quantity, item.unit) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {[item.building, item.room, item.cabinet, item.shelf].filter(Boolean).join(' / ') ||
                    item.location ||
                    '—'}
                </Text>
                {canUpdateStock || canCreate ? (
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
          );
        }}
      />

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView
            style={styles.modalScroll}
            contentContainerStyle={styles.modalCard}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.modalTitle}>{editItem ? 'Edit container' : 'Add container'}</Text>
            <Input placeholder="Container ID" value={form.container_id} onChangeText={(v) => patch('container_id', v)} autoCapitalize="none" />
            <Input placeholder="Barcode" value={form.barcode} onChangeText={(v) => patch('barcode', v)} autoCapitalize="none" />
            <Input placeholder="Chemical ID *" value={form.chemical_id} onChangeText={(v) => patch('chemical_id', v)} autoCapitalize="none" editable={!editItem} />
            <Input placeholder="Quantity" value={form.quantity} onChangeText={(v) => patch('quantity', v)} keyboardType="decimal-pad" />
            <Input placeholder="Unit" value={form.unit} onChangeText={(v) => patch('unit', v)} />
            <Input placeholder="Batch number" value={form.batch_number} onChangeText={(v) => patch('batch_number', v)} />
            <Input placeholder="Expiry (YYYY-MM-DD)" value={form.expiry_date} onChangeText={(v) => patch('expiry_date', v)} />
            <Input placeholder="Building" value={form.building} onChangeText={(v) => patch('building', v)} />
            <Input placeholder="Room" value={form.room} onChangeText={(v) => patch('room', v)} />
            <Input placeholder="Cabinet" value={form.cabinet} onChangeText={(v) => patch('cabinet', v)} />
            <Input placeholder="Shelf" value={form.shelf} onChangeText={(v) => patch('shelf', v)} />
            <Input placeholder="Container type" value={form.container_type} onChangeText={(v) => patch('container_type', v)} />
            <Input placeholder="Status" value={form.status} onChangeText={(v) => patch('status', v)} />
            <Input placeholder="Notes" value={form.notes} onChangeText={(v) => patch('notes', v)} multiline />
            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            <Button label={editItem ? 'Save container' : 'Create container'} onPress={() => void save()} loading={saving} />
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
