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
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const STATUSES = [
  'Draft',
  'Submitted',
  'Approved',
  'Rejected',
  'Ordered',
  'Partially Received',
  'Completed',
  'Cancelled',
];
const PRIORITIES = ['Low', 'Normal', 'High', 'Urgent'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CNY'];

type ItemRow = {
  chemical_name: string;
  quantity: string;
  unit: string;
  unit_price: string;
  total_price: string;
};

const emptyItem = (): ItemRow => ({
  chemical_name: '',
  quantity: '',
  unit: 'L',
  unit_price: '',
  total_price: '',
});

const emptyForm = () => ({
  supplier_id: '',
  priority: 'Normal',
  currency: 'USD',
  expected_delivery: '',
  notes: '',
  department: '',
  shipping_fee: '0',
  items: [emptyItem()],
});

function nextAction(status?: string): { label: string; status: string } | null {
  const map: Record<string, { label: string; status: string }> = {
    Draft: { label: 'Submit', status: 'Submitted' },
    Submitted: { label: 'Approve', status: 'Approved' },
    Approved: { label: 'Mark Ordered', status: 'Ordered' },
    Ordered: { label: 'Mark Shipped', status: 'Partially Received' },
    'Partially Received': { label: 'Complete', status: 'Completed' },
  };
  return map[status || ''] || null;
}

export default function OrdersScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [orders, setOrders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [detail, setDetail] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [oRes, sRes] = await Promise.all([
        api.get('/procurement/orders', {
          params: {
            status: filterStatus || undefined,
            priority: filterPriority || undefined,
            search: search.trim() || undefined,
            page: 1,
            limit: 50,
          },
        }),
        api.get('/procurement/suppliers', { params: { status: 'Active', limit: 100 } }),
      ]);
      setOrders(asList(oRes.data, ['orders', 'data']));
      setSuppliers(asList(sRes.data, ['suppliers', 'data']));
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const updateItem = (idx: number, field: keyof ItemRow, val: string) => {
    setForm((f) => {
      const items = [...f.items];
      items[idx] = { ...items[idx], [field]: val };
      if (field === 'quantity' || field === 'unit_price') {
        const q = parseFloat(items[idx].quantity) || 0;
        const p = parseFloat(items[idx].unit_price) || 0;
        items[idx].total_price = (q * p).toFixed(2);
      }
      return { ...f, items };
    });
  };

  const grandTotal =
    form.items.reduce((s, i) => s + (parseFloat(i.total_price) || 0), 0) +
    (parseFloat(form.shipping_fee) || 0);

  const create = async () => {
    if (!form.supplier_id) {
      await dialog.alert('Create PO', 'Select a supplier.');
      return;
    }
    if (!form.expected_delivery.trim()) {
      await dialog.alert('Create PO', 'Expected delivery date is required (YYYY-MM-DD).');
      return;
    }
    if (!form.items.some((i) => i.chemical_name && i.quantity)) {
      await dialog.alert('Create PO', 'Add at least one chemical item.');
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        supplier_id: form.supplier_id,
        priority: form.priority,
        currency: form.currency,
        expected_delivery: form.expected_delivery.trim(),
        notes: form.notes || undefined,
        department: form.department || undefined,
        shipping_fee: parseFloat(form.shipping_fee) || 0,
        items: form.items
          .filter((i) => i.chemical_name)
          .map((i) => ({
            chemical_name: i.chemical_name,
            quantity: parseFloat(i.quantity) || 0,
            unit: i.unit || 'L',
            unit_price: parseFloat(i.unit_price) || 0,
            total_price: parseFloat(i.total_price) || 0,
            tax_rate: 0,
          })),
        total_cost: grandTotal,
        subtotal: grandTotal - (parseFloat(form.shipping_fee) || 0),
      };
      Object.keys(payload).forEach((k) => {
        if (payload[k] === '' || payload[k] == null) delete payload[k];
      });
      await api.post('/procurement/orders', payload);
      setShowCreate(false);
      setForm(emptyForm());
      await load();
    } catch (e: any) {
      await dialog.alert('Create PO', e.response?.data?.error || 'Failed');
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (id: string, status: string, label?: string) => {
    const ok = await dialog.confirm({
      title: label || 'Update status',
      message: `Set order to ${status}?`,
      confirmLabel: label || 'Update',
      danger: false,
    });
    if (!ok) return;
    try {
      await api.put(`/procurement/orders/${id}/status`, { status });
      if (detail?._id === id) {
        const { data } = await api.get(`/procurement/orders/${id}`);
        setDetail(data?.po || data?.order || { ...detail, status });
      }
      await load();
    } catch (e: any) {
      await dialog.alert('Status', e.response?.data?.error || 'Failed');
    }
  };

  const openDetail = async (order: any) => {
    try {
      const { data } = await api.get(`/procurement/orders/${order._id}`);
      setDetail(data?.po || data?.order || data || order);
    } catch {
      setDetail(order);
    }
  };

  return (
    <Screen>
      <Title>Purchase Orders</Title>
      <Subtitle>Same create form and status workflow as the website</Subtitle>

      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search PO number…"
        onSubmitEditing={() => void load()}
        returnKeyType="search"
      />

      <Text style={styles.label}>Status</Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setFilterStatus('')}
          style={[styles.chip, !filterStatus && styles.chipOn]}
        >
          <Text style={[styles.chipText, !filterStatus && styles.chipTextOn]}>All</Text>
        </Pressable>
        {STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilterStatus(s)}
            style={[styles.chip, filterStatus === s && styles.chipOn]}
          >
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Priority</Text>
      <View style={styles.chips}>
        <Pressable
          onPress={() => setFilterPriority('')}
          style={[styles.chip, !filterPriority && styles.chipOn]}
        >
          <Text style={[styles.chipText, !filterPriority && styles.chipTextOn]}>All</Text>
        </Pressable>
        {PRIORITIES.map((p) => (
          <Pressable
            key={p}
            onPress={() => setFilterPriority(p)}
            style={[styles.chip, filterPriority === p && styles.chipOn]}
          >
            <Text style={[styles.chipText, filterPriority === p && styles.chipTextOn]}>{p}</Text>
          </Pressable>
        ))}
      </View>

      <Button label="+ Create PO" onPress={() => setShowCreate(true)} />

      <FlatList
        style={{ marginTop: 12 }}
        data={orders}
        keyExtractor={(item) => item._id || item.po_number}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No purchase orders found" /> : null}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => {
          const action = nextAction(item.status);
          return (
            <Pressable style={styles.card} onPress={() => void openDetail(item)}>
              <View style={styles.row}>
                <Text style={styles.primary}>{item.po_number || item._id}</Text>
                <Badge label={item.status || '—'} tone={toneForStatus(item.status)} />
              </View>
              <Text style={styles.meta}>
                {[
                  item.supplier_name || item.supplier?.name,
                  item.priority,
                  item.expected_delivery
                    ? `ETA ${new Date(item.expected_delivery).toLocaleDateString()}`
                    : null,
                  item.total_cost != null
                    ? `${item.currency || 'USD'} ${item.total_cost}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </Text>
              {action ? (
                <View style={{ marginTop: 10 }}>
                  <Button
                    label={action.label}
                    onPress={() => changeStatus(item._id, action.status, action.label)}
                  />
                </View>
              ) : null}
              {item.status !== 'Cancelled' && item.status !== 'Completed' ? (
                <Pressable
                  onPress={() => changeStatus(item._id, 'Cancelled', 'Cancel')}
                  style={{ marginTop: 8 }}
                >
                  <Text style={{ color: colors.danger, fontWeight: '800', textAlign: 'center' }}>
                    Cancel PO
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          );
        }}
      />

      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Screen>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>Create Purchase Order</Title>
            <Subtitle>Supplier, delivery, and chemical line items</Subtitle>

            <Text style={styles.label}>Supplier *</Text>
            <View style={styles.chips}>
              {suppliers.map((s) => (
                <Pressable
                  key={s._id}
                  onPress={() => setForm((f) => ({ ...f, supplier_id: s._id }))}
                  style={[styles.chip, form.supplier_id === s._id && styles.chipOn]}
                >
                  <Text style={[styles.chipText, form.supplier_id === s._id && styles.chipTextOn]}>
                    {s.name}
                  </Text>
                </Pressable>
              ))}
              {suppliers.length === 0 ? (
                <Text style={styles.meta}>No active suppliers — add one first.</Text>
              ) : null}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chips}>
              {PRIORITIES.map((p) => (
                <Pressable
                  key={p}
                  onPress={() => setForm((f) => ({ ...f, priority: p }))}
                  style={[styles.chip, form.priority === p && styles.chipOn]}
                >
                  <Text style={[styles.chipText, form.priority === p && styles.chipTextOn]}>{p}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Currency</Text>
            <View style={styles.chips}>
              {CURRENCIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setForm((f) => ({ ...f, currency: c }))}
                  style={[styles.chip, form.currency === c && styles.chipOn]}
                >
                  <Text style={[styles.chipText, form.currency === c && styles.chipTextOn]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.label}>Expected delivery * (YYYY-MM-DD)</Text>
            <Input
              placeholder="mm/dd/yyyy → use YYYY-MM-DD"
              value={form.expected_delivery}
              onChangeText={(v) => setForm((f) => ({ ...f, expected_delivery: v }))}
            />

            <Text style={styles.label}>Department</Text>
            <Input
              placeholder="e.g. Research Lab A"
              value={form.department}
              onChangeText={(v) => setForm((f) => ({ ...f, department: v }))}
            />

            <Text style={styles.label}>Notes</Text>
            <Input
              placeholder="Optional notes"
              value={form.notes}
              onChangeText={(v) => setForm((f) => ({ ...f, notes: v }))}
            />

            <Text style={styles.label}>Shipping fee</Text>
            <Input
              placeholder="0"
              value={form.shipping_fee}
              onChangeText={(v) => setForm((f) => ({ ...f, shipping_fee: v }))}
              keyboardType="decimal-pad"
            />

            <View style={styles.itemHeader}>
              <Text style={styles.label}>Chemical items *</Text>
              <Pressable
                onPress={() => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }))}
              >
                <Text style={{ color: colors.accent, fontWeight: '800' }}>+ Add item</Text>
              </Pressable>
            </View>

            {form.items.map((item, idx) => (
              <View key={idx} style={styles.itemBox}>
                <Text style={styles.meta}>Line {idx + 1}</Text>
                <Input
                  placeholder="Chemical name"
                  value={item.chemical_name}
                  onChangeText={(v) => updateItem(idx, 'chemical_name', v)}
                />
                <View style={styles.rowInputs}>
                  <View style={{ flex: 1 }}>
                    <Input
                      placeholder="Qty"
                      value={item.quantity}
                      onChangeText={(v) => updateItem(idx, 'quantity', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ width: 72, marginLeft: 8 }}>
                    <Input
                      placeholder="Unit"
                      value={item.unit}
                      onChangeText={(v) => updateItem(idx, 'unit', v)}
                    />
                  </View>
                </View>
                <Input
                  placeholder="Unit price"
                  value={item.unit_price}
                  onChangeText={(v) => updateItem(idx, 'unit_price', v)}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.meta}>Line total: {item.total_price || '0'}</Text>
                {form.items.length > 1 ? (
                  <Pressable
                    onPress={() =>
                      setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))
                    }
                  >
                    <Text style={{ color: colors.danger, fontWeight: '700', marginTop: 4 }}>
                      Remove line
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}

            <Text style={[styles.primary, { marginVertical: 10 }]}>
              Grand total: {form.currency} {grandTotal.toFixed(2)}
            </Text>
            <Button label="Create PO" onPress={() => void create()} loading={submitting} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowCreate(false)} />
          </ScrollView>
        </Screen>
      </Modal>

      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <Screen>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>{detail?.po_number || 'PO detail'}</Title>
            <Subtitle>{detail?.status}</Subtitle>
            <Text style={styles.meta}>
              {[
                detail?.supplier_name || detail?.supplier?.name,
                detail?.priority,
                detail?.currency,
                detail?.expected_delivery
                  ? `ETA ${new Date(detail.expected_delivery).toLocaleDateString()}`
                  : null,
                detail?.department,
              ]
                .filter(Boolean)
                .join(' · ')}
            </Text>
            {(detail?.items || []).map((it: any, i: number) => (
              <View key={i} style={styles.itemBox}>
                <Text style={styles.primary}>{it.chemical_name}</Text>
                <Text style={styles.meta}>
                  {it.quantity} {it.unit} · {it.unit_price} · total {it.total_price}
                </Text>
              </View>
            ))}
            {nextAction(detail?.status) ? (
              <Button
                label={nextAction(detail?.status)!.label}
                onPress={() => {
                  const a = nextAction(detail?.status)!;
                  changeStatus(detail._id, a.status, a.label);
                }}
              />
            ) : null}
            {detail?.status !== 'Cancelled' && detail?.status !== 'Completed' ? (
              <Button
                label="Cancel PO"
                variant="danger"
                onPress={() => changeStatus(detail._id, 'Cancelled', 'Cancel')}
              />
            ) : null}
            <Button label="Close" variant="ghost" onPress={() => setDetail(null)} />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    chip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    chipText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
    chipTextOn: { color: colors.accent },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
    rowInputs: { flexDirection: 'row', alignItems: 'flex-start' },
    primary: { color: colors.text, fontWeight: '800', fontSize: 15 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 4,
    },
    itemHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 8,
    },
    itemBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 10,
      backgroundColor: colors.surface2,
    },
  });
}
