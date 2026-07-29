import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';

const ACTION_FILTERS = ['ALL', 'IN', 'OUT', 'TRANSFER', 'DISPOSAL'] as const;
const STOCK_ACTIONS = [
  { id: 'IN' as const, label: 'Stock IN' },
  { id: 'OUT' as const, label: 'Stock OUT' },
  { id: 'TRANSFER' as const, label: 'Transfer' },
  { id: 'DISPOSAL' as const, label: 'Disposal' },
];

export default function InventoryLogsScreen() {
  const { hasPermission } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [logs, setLogs] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<(typeof ACTION_FILTERS)[number]>('ALL');
  const [loading, setLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');
  const [selectedChemical, setSelectedChemical] = useState<any | null>(null);
  const [action, setAction] = useState<'IN' | 'OUT' | 'TRANSFER' | 'DISPOSAL'>('IN');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    quantity: '1',
    unit: 'L',
    notes: '',
    reason: '',
  });

  const canStock = hasPermission('update_stock');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inventory/logs');
      setLogs(asList(data, ['logs', 'data']));
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChemicals = useCallback(async () => {
    try {
      const { data } = await api.get('/inventory/chemicals');
      setChemicals(asList(data, ['data']));
    } catch {
      setChemicals([]);
    }
  }, []);

  useEffect(() => {
    void load();
    if (canStock) void loadChemicals();
  }, [load, loadChemicals, canStock]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const matchesSearch =
        !q ||
        [
          log.chemical_name,
          log.chemical_id,
          log.user_name,
          log.batch_number,
          log.reason,
          log.notes,
          log.action,
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      const act = String(log.action || log.type || '').toUpperCase();
      const matchesFilter = filter === 'ALL' || act === filter;
      return matchesSearch && matchesFilter;
    });
  }, [logs, search, filter]);

  const filteredChemicals = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    if (!q) return chemicals.slice(0, 30);
    return chemicals
      .filter((c) =>
        [c.name, c.id, c.cas_number].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [chemicals, pickerSearch]);

  const startTransaction = (a: typeof action) => {
    setAction(a);
    setSelectedChemical(null);
    setForm({ quantity: '1', unit: 'L', notes: '', reason: '' });
    setMsg('');
    setPickerSearch('');
    setPickerOpen(true);
  };

  const pickChemical = (chem: any) => {
    setSelectedChemical(chem);
    setForm((f) => ({ ...f, unit: chem.unit || 'L' }));
    setPickerOpen(false);
    setModalOpen(true);
  };

  const submit = async () => {
    if (!selectedChemical?.id && !selectedChemical?._id) {
      setMsg('Select a chemical first.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await api.post('/inventory/transaction', {
        chemical_id: selectedChemical.id || selectedChemical._id,
        quantity: Number(form.quantity) || 0,
        unit: form.unit.trim() || 'L',
        action,
        notes: form.notes.trim() || form.reason.trim() || `Mobile ${action}`,
        reason: form.reason.trim() || undefined,
      });
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setMsg(e.response?.data?.error || e.response?.data?.message || 'Transaction failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <Title>Master Ledger</Title>
      <Subtitle>Active audit trail · {logs.length} events recorded</Subtitle>

      {canStock ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actionScroll}>
          {STOCK_ACTIONS.map((a) => (
            <Pressable key={a.id} onPress={() => startTransaction(a.id)} style={styles.actionBtn}>
              <Text style={styles.actionBtnText}>{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Input
        placeholder="Search chemical, LOT, ID, personnel…"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {ACTION_FILTERS.map((f) => {
          const on = filter === f;
          return (
            <Pressable key={f} onPress={() => setFilter(f)} style={[styles.chip, on && styles.chipOn]}>
              <Text style={[styles.chipText, on && styles.chipTextOn]}>{f}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item._id || `${item.action}-${item.createdAt}`}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState title="No records found" body="Initialize a transaction to begin the audit chain." />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.chemical_name || item.chemical_id || item.action || 'Log'}</Text>
              <Text style={styles.meta}>
                {item.chemical_id}
                {item.batch_number ? ` · LOT ${item.batch_number}` : ''}
              </Text>
              <Text style={styles.meta}>
                {[
                  item.action || item.type,
                  item.quantity != null ? `${item.quantity} ${item.unit || ''}`.trim() : null,
                  item.user_name || item.performed_by,
                  item.user_role,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              <Text style={styles.meta}>
                {item.createdAt ? new Date(item.createdAt).toLocaleString() : ''}
              </Text>
              {item.location || item.from_location || item.to_location ? (
                <Text style={styles.meta}>
                  Location: {item.location || item.from_location}
                  {item.to_location ? ` → ${item.to_location}` : ''}
                </Text>
              ) : null}
              {item.notes || item.reason ? (
                <Text style={styles.meta}>{item.notes || item.reason}</Text>
              ) : null}
            </View>
            <Badge label={item.action || item.type || '—'} tone={toneForStatus(item.action || item.type)} />
          </View>
        )}
      />

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Select chemical — {action}</Text>
            <Input
              placeholder="Search chemicals…"
              value={pickerSearch}
              onChangeText={setPickerSearch}
              autoCapitalize="none"
            />
            <ScrollView style={{ maxHeight: 360 }}>
              {filteredChemicals.map((c) => (
                <Pressable key={c.id || c._id} onPress={() => pickChemical(c)} style={styles.pickRow}>
                  <Text style={styles.name}>{c.name}</Text>
                  <Text style={styles.meta}>
                    {c.id} · {c.quantity} {c.unit}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <Button label="Cancel" variant="ghost" onPress={() => setPickerOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {action} — {selectedChemical?.name || 'Chemical'}
            </Text>
            <Input
              placeholder="Quantity"
              value={form.quantity}
              onChangeText={(v) => setForm((f) => ({ ...f, quantity: v }))}
              keyboardType="decimal-pad"
            />
            <Input placeholder="Unit" value={form.unit} onChangeText={(v) => setForm((f) => ({ ...f, unit: v }))} />
            <Input
              placeholder="Reason / audit notes"
              value={form.reason}
              onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))}
            />
            <Input
              placeholder="Additional notes"
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            />
            {msg ? <Text style={styles.msg}>{msg}</Text> : null}
            <Button label={`Post ${action}`} onPress={() => void submit()} loading={saving} />
            <Button label="Cancel" variant="ghost" onPress={() => setModalOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    actionScroll: { marginBottom: 10, maxHeight: 44 },
    actionBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginRight: 8,
    },
    actionBtnText: { color: colors.btnText, fontWeight: '900', fontSize: 12 },
    chipScroll: { marginBottom: 10, maxHeight: 40 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      marginRight: 8,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    chipTextOn: { color: colors.btnText },
    row: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    name: { fontWeight: '800', fontSize: 15, color: colors.text },
    meta: { fontSize: 12, marginTop: 4, color: colors.muted, lineHeight: 16 },
    pickRow: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 12 },
    msg: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
  });
}
