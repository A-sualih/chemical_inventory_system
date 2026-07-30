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

const emptyForm = () => ({
  name: '',
  contact_person: '',
  contact_email: '',
  contact_phone: '',
  address: '',
  country: '',
  website: '',
  category: '',
  status: 'Active',
  notes: '',
  is_preferred: false,
});

export default function SuppliersScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [detail, setDetail] = useState<any | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/procurement/suppliers', {
        params: { search: search.trim() || undefined, limit: 100 },
      });
      setSuppliers(asList(data, ['suppliers', 'data']));
    } catch {
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setForm({
      name: s.name || '',
      contact_person: s.contact_person || '',
      contact_email: s.contact_email || '',
      contact_phone: s.contact_phone || '',
      address: s.address || '',
      country: s.country || '',
      website: s.website || '',
      category: s.category || '',
      status: s.status || 'Active',
      notes: s.notes || '',
      is_preferred: !!s.is_preferred,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) {
      await dialog.alert('Supplier', 'Name is required.');
      return;
    }
    try {
      if (editing) {
        await api.put(`/procurement/suppliers/${editing._id}`, form);
      } else {
        await api.post('/procurement/suppliers', form);
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      await dialog.alert('Supplier', e.response?.data?.error || 'Save failed');
    }
  };

  const blacklist = async (s: any) => {
    const ok = await dialog.confirm({
      title: 'Blacklist supplier',
      message: `Blacklist ${s.name}?`,
      confirmLabel: 'Blacklist',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.put(`/procurement/suppliers/${s._id}/blacklist`, {
        reason: 'Blacklisted from mobile',
      });
      await load();
    } catch (e: any) {
      await dialog.alert('Blacklist', e.response?.data?.error || 'Failed');
    }
  };

  const remove = async (s: any) => {
    const ok = await dialog.confirm({
      title: 'Delete supplier',
      message: `Delete ${s.name}?`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/procurement/suppliers/${s._id}`);
      await load();
    } catch (e: any) {
      await dialog.alert('Delete', e.response?.data?.error || 'Failed');
    }
  };

  const openDetail = async (s: any) => {
    try {
      const { data } = await api.get(`/procurement/suppliers/${s._id}`);
      setDetail(data?.supplier ? data : { supplier: s, ...data });
    } catch {
      setDetail({ supplier: s });
    }
  };

  return (
    <Screen>
      <Title>Suppliers</Title>
      <Subtitle>Vendor directory — add, edit, blacklist</Subtitle>
      <Input
        value={search}
        onChangeText={setSearch}
        placeholder="Search suppliers…"
        onSubmitEditing={() => void load()}
        returnKeyType="search"
      />
      <Button label="+ Add supplier" onPress={openCreate} />

      <FlatList
        style={{ marginTop: 12 }}
        data={suppliers}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        ListEmptyComponent={!loading ? <EmptyState title="No suppliers" /> : null}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => void openDetail(item)}>
            <View style={styles.row}>
              <Text style={styles.primary}>{item.name}</Text>
              <Badge label={item.status || '—'} tone={toneForStatus(item.status)} />
            </View>
            <Text style={styles.meta}>
              {[item.contact_person, item.category, item.country].filter(Boolean).join(' · ')}
            </Text>
            <View style={styles.actions}>
              <Pressable onPress={() => openEdit(item)}>
                <Text style={styles.link}>Edit</Text>
              </Pressable>
              <Pressable onPress={() => blacklist(item)}>
                <Text style={[styles.link, { color: colors.warn }]}>Blacklist</Text>
              </Pressable>
              <Pressable onPress={() => remove(item)}>
                <Text style={[styles.link, { color: colors.danger }]}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        )}
      />

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <Screen>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>{editing ? 'Edit supplier' : 'Add supplier'}</Title>
            {(
              [
                ['name', 'Name'],
                ['contact_person', 'Contact person'],
                ['contact_email', 'Email'],
                ['contact_phone', 'Phone'],
                ['address', 'Address'],
                ['country', 'Country'],
                ['website', 'Website'],
                ['category', 'Category'],
                ['notes', 'Notes'],
              ] as const
            ).map(([key, label]) => (
              <View key={key}>
                <Text style={styles.label}>{label}</Text>
                <Input
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                  autoCapitalize={key.includes('email') || key === 'website' ? 'none' : 'sentences'}
                  keyboardType={key.includes('email') ? 'email-address' : 'default'}
                />
              </View>
            ))}
            <View style={styles.chips}>
              {['Active', 'Inactive', 'Blacklisted'].map((s) => (
                <Pressable
                  key={s}
                  onPress={() => setForm((f) => ({ ...f, status: s }))}
                  style={[styles.chip, form.status === s && styles.chipOn]}
                >
                  <Text style={[styles.chipText, form.status === s && styles.chipTextOn]}>{s}</Text>
                </Pressable>
              ))}
            </View>
            <Button label="Save supplier" onPress={() => void save()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowForm(false)} />
          </ScrollView>
        </Screen>
      </Modal>

      <Modal visible={!!detail} animationType="slide" onRequestClose={() => setDetail(null)}>
        <Screen>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>{detail?.supplier?.name || 'Supplier'}</Title>
            <Text style={styles.meta}>{detail?.supplier?.contact_email}</Text>
            <Text style={styles.meta}>{detail?.supplier?.contact_phone}</Text>
            <Text style={styles.label}>Recent orders</Text>
            {(detail?.recentOrders || []).slice(0, 5).map((o: any) => (
              <Text key={o._id} style={styles.meta}>
                {o.po_number || o._id} · {o.status}
              </Text>
            ))}
            <Text style={styles.label}>Reviews</Text>
            {(detail?.reviews || []).slice(0, 5).map((r: any, i: number) => (
              <Text key={r._id || i} style={styles.meta}>
                Score {(r.overall_rating || r.chemical_quality || '—')} · {r.comments || 'No comment'}
              </Text>
            ))}
            <Button label="Close" variant="ghost" onPress={() => setDetail(null)} />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center' },
    primary: { color: colors.text, fontWeight: '800', fontSize: 15, flex: 1 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    actions: { flexDirection: 'row', gap: 16, marginTop: 10 },
    link: { color: colors.accent, fontWeight: '800' },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
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
  });
}
