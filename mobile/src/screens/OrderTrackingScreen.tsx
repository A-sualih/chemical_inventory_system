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

const SHIP_STATUSES = [
  'Pending',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Delayed',
  'Returned',
];

export default function OrderTrackingScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDelayed, setShowDelayed] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [edit, setEdit] = useState<any | null>(null);
  const [form, setForm] = useState({
    status: 'In Transit',
    tracking_number: '',
    carrier: '',
    estimated_arrival: '',
    location: '',
    condition: '',
    description: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/procurement/shipments', {
        params: {
          status: filterStatus || undefined,
          delayed: showDelayed || undefined,
          limit: 50,
        },
      });
      setShipments(asList(data, ['shipments', 'data']));
    } catch {
      setShipments([]);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, showDelayed]);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (s: any) => {
    setEdit(s);
    setForm({
      status: s.status || s.shipment_status || 'In Transit',
      tracking_number: s.tracking_number || '',
      carrier: s.carrier || '',
      estimated_arrival: s.estimated_arrival
        ? String(s.estimated_arrival).slice(0, 10)
        : '',
      location: s.location || '',
      condition: s.condition || '',
      description: s.description || '',
    });
  };

  const save = async () => {
    const poId = edit?.purchase_order_id || edit?.po_id || edit?._id || edit?.order_id;
    if (!poId) {
      await dialog.alert('Update shipment', 'Missing purchase order id.');
      return;
    }
    try {
      await api.put(`/procurement/shipments/${poId}`, {
        ...form,
        estimated_arrival: form.estimated_arrival || undefined,
      });
      setEdit(null);
      await load();
    } catch (e: any) {
      await dialog.alert('Update shipment', e.response?.data?.error || 'Failed');
    }
  };

  return (
    <Screen>
      <Title>Order Tracking</Title>
      <Subtitle>Shipments and delivery updates</Subtitle>

      <View style={styles.chips}>
        <Pressable
          onPress={() => setShowDelayed((v) => !v)}
          style={[styles.chip, showDelayed && styles.chipOn]}
        >
          <Text style={[styles.chipText, showDelayed && styles.chipTextOn]}>Show delayed</Text>
        </Pressable>
        {SHIP_STATUSES.map((s) => (
          <Pressable
            key={s}
            onPress={() => setFilterStatus((prev) => (prev === s ? '' : s))}
            style={[styles.chip, filterStatus === s && styles.chipOn]}
          >
            <Text style={[styles.chipText, filterStatus === s && styles.chipTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={shipments}
        keyExtractor={(item, i) => item._id || item.tracking_number || String(i)}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No shipments" /> : null}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => openEdit(item)}>
            <View style={styles.row}>
              <Text style={styles.primary}>
                {item.po_number || item.purchase_order?.po_number || item._id}
              </Text>
              <Badge
                label={item.status || item.shipment_status || '—'}
                tone={toneForStatus(item.status || item.shipment_status)}
              />
            </View>
            <Text style={styles.meta}>
              {[item.carrier, item.tracking_number, item.location].filter(Boolean).join(' · ')}
            </Text>
          </Pressable>
        )}
      />

      <Modal visible={!!edit} animationType="slide" onRequestClose={() => setEdit(null)}>
        <Screen>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>Update shipment</Title>
            <Text style={styles.label}>Status</Text>
            <View style={styles.chips}>
              {SHIP_STATUSES.map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setForm((f) => ({ ...f, status: s }))}
                  style={[styles.chip, form.status === s && styles.chipOn]}
                >
                  <Text style={[styles.chipText, form.status === s && styles.chipTextOn]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Input
              placeholder="Tracking number"
              value={form.tracking_number}
              onChangeText={(v) => setForm((f) => ({ ...f, tracking_number: v }))}
            />
            <Input
              placeholder="Carrier"
              value={form.carrier}
              onChangeText={(v) => setForm((f) => ({ ...f, carrier: v }))}
            />
            <Input
              placeholder="ETA (YYYY-MM-DD)"
              value={form.estimated_arrival}
              onChangeText={(v) => setForm((f) => ({ ...f, estimated_arrival: v }))}
            />
            <Input
              placeholder="Location"
              value={form.location}
              onChangeText={(v) => setForm((f) => ({ ...f, location: v }))}
            />
            <Input
              placeholder="Condition"
              value={form.condition}
              onChangeText={(v) => setForm((f) => ({ ...f, condition: v }))}
            />
            <Input
              placeholder="Note"
              value={form.description}
              onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
            />
            <Button label="Save shipment" onPress={() => void save()} />
            <Button label="Cancel" variant="ghost" onPress={() => setEdit(null)} />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
    primary: { color: colors.text, fontWeight: '800', flex: 1 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
  });
}
