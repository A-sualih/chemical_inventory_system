import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { normalizeRole } from '../utils/roles';
import { fmtQty } from '../utils/formatQuantity';
import type { ThemeColors } from '../theme/colors';
import type { LabRef } from '../types';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';

type Transfer = {
  _id: string;
  status: string;
  quantity_moved: number;
  unit: string;
  reason?: string;
  createdAt: string;
  source_lab?: { _id: string; name: string };
  requested_by?: { name: string };
  chemical_id?: { _id: string; id: string; name: string };
};

type LabChemical = {
  _id: string;
  id: string;
  name: string;
  cas_number?: string;
  formula?: string;
  quantity?: number;
  unit?: string;
  status?: string;
  batch_number?: string;
};

function activeLabId(user: { active_lab?: string | LabRef | null } | null) {
  const lab = user?.active_lab;
  if (!lab) return '';
  return typeof lab === 'object' ? String(lab._id) : String(lab);
}

export default function TransfersScreen() {
  const { user, hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [allLabs, setAllLabs] = useState<LabRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [form, setForm] = useState({
    source_lab: '',
    chemical_id: '',
    batch_number: '',
    container_id: '',
    quantity_moved: '',
    unit: 'ml',
    reason: '',
  });

  const [chemSearch, setChemSearch] = useState('');
  const [chemResults, setChemResults] = useState<LabChemical[]>([]);
  const [chemLoading, setChemLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedChem, setSelectedChem] = useState<LabChemical | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const role = String(normalizeRole(user?.role) || user?.role || '');
  const myLab = activeLabId(user);

  const loadTransfers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/transfers');
      setTransfers(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch transfers');
      setTransfers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLabs = useCallback(async () => {
    try {
      const { data } = await api.get('/labs?all=true');
      const list = Array.isArray(data) ? data : [];
      setAllLabs(list.filter((l: LabRef) => String(l._id) !== myLab));
    } catch {
      setAllLabs([]);
    }
  }, [myLab]);

  useEffect(() => {
    void loadTransfers();
    void loadLabs();
  }, [loadTransfers, loadLabs, myLab]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!form.source_lab || selectedChem) return;

    setChemLoading(true);
    timerRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/transfers/lab-chemicals/${form.source_lab}`, {
          params: { search: chemSearch.trim(), limit: 15 },
        });
        const list = data?.data ?? [];
        setChemResults(list);
        if (list.length > 0 || chemSearch.trim()) setDropdownOpen(true);
      } catch {
        setChemResults([]);
        setDropdownOpen(false);
      } finally {
        setChemLoading(false);
      }
    }, chemSearch.trim() ? 350 : 0);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [chemSearch, selectedChem, form.source_lab]);

  const pickChem = (chem: LabChemical) => {
    setSelectedChem(chem);
    setChemSearch('');
    setDropdownOpen(false);
    setChemResults([]);
    setForm((f) => ({
      ...f,
      chemical_id: chem._id,
      unit: chem.unit || f.unit,
      batch_number: chem.batch_number || '',
    }));
  };

  const clearChem = () => {
    setSelectedChem(null);
    setChemSearch('');
    setChemResults([]);
    setDropdownOpen(false);
    setForm((f) => ({ ...f, chemical_id: '', batch_number: '' }));
  };

  const resetModal = () => {
    setForm({
      source_lab: '',
      chemical_id: '',
      batch_number: '',
      container_id: '',
      quantity_moved: '',
      unit: 'ml',
      reason: '',
    });
    clearChem();
  };

  const isSourceLab = (t: Transfer) => String(t.source_lab?._id) === myLab;

  const canApproveTransfer = (t: Transfer) =>
    t.status === 'Pending' &&
    isSourceLab(t) &&
    (hasPermission('approve_cross_lab_transfer') ||
      hasPermission('approve_request') ||
      role === 'Admin' ||
      role === 'Lab Manager');

  const statusTone = (s: string): 'warn' | 'ok' | 'danger' => {
    if (s === 'Approved') return 'ok';
    if (s === 'Rejected') return 'danger';
    return 'warn';
  };

  const handleApprove = async (id: string) => {
    try {
      await api.put(`/transfers/${id}/approve`);
      await loadTransfers();
    } catch (e: any) {
      await dialog.alert('Approval failed', e.response?.data?.error || 'Approval failed');
    }
  };

  const submitReject = async () => {
    if (!rejectTargetId) return;
    const notes = rejectReason.trim() || 'No reason provided';
    try {
      await api.put(`/transfers/${rejectTargetId}/reject`, { notes });
      setRejectOpen(false);
      setRejectTargetId(null);
      setRejectReason('');
      await loadTransfers();
      await dialog.alert('Rejected', 'Requisition rejected successfully');
    } catch (e: any) {
      await dialog.alert('Rejection failed', e.response?.data?.error || 'Rejection failed');
    }
  };

  const handleSubmit = async () => {
    if (!form.source_lab) {
      await dialog.alert('Validation', 'Please select the provider lab.');
      return;
    }
    if (!form.chemical_id) {
      await dialog.alert('Validation', 'Please select a chemical from the list.');
      return;
    }
    if (!form.quantity_moved || Number(form.quantity_moved) <= 0) {
      await dialog.alert('Validation', 'Please enter a valid quantity.');
      return;
    }
    try {
      await api.post('/transfers', form);
      setModalOpen(false);
      resetModal();
      await dialog.alert('Success', 'Requisition submitted successfully');
      await loadTransfers();
    } catch (e: any) {
      await dialog.alert(
        'Transfer failed',
        e.response?.data?.message || e.response?.data?.error || 'Transfer request failed'
      );
    }
  };

  const selectedLabName = allLabs.find((l) => String(l._id) === form.source_lab)?.name;

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Title>Chemical Requisitions</Title>
          <Subtitle>Request chemicals from other labs. Provider lab approves and sends them.</Subtitle>
        </View>
        <Pressable style={styles.newBtn} onPress={() => { setModalOpen(true); resetModal(); }}>
          <Ionicons name="swap-horizontal" size={16} color={colors.btnText} />
          <Text style={styles.newBtnText}>New</Text>
        </Pressable>
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendItem}>
          <Ionicons name="cloud-upload-outline" size={12} color={colors.muted} /> Outgoing: another lab requested from you
        </Text>
        <Text style={styles.legendItem}>
          <Ionicons name="cloud-download-outline" size={12} color={colors.muted} /> Incoming: you requested from another lab
        </Text>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FlatList
        data={transfers}
        keyExtractor={(item) => item._id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadTransfers} tintColor={colors.accent} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title="No requisitions"
              body='Click "New Requisition" to request a chemical from another lab.'
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: t }) => {
          const borderColor =
            t.status === 'Approved'
              ? colors.success
              : t.status === 'Rejected'
                ? colors.danger
                : colors.warn;

          return (
            <View style={[styles.card, { borderLeftColor: borderColor }]}>
              <View style={styles.cardTop}>
                {isSourceLab(t) ? (
                  <View style={styles.dirBadge}>
                    <Ionicons name="cloud-upload-outline" size={12} color={colors.warn} />
                    <Text style={styles.dirText}>Outgoing</Text>
                  </View>
                ) : (
                  <View style={styles.dirBadge}>
                    <Ionicons name="cloud-download-outline" size={12} color={colors.accent} />
                    <Text style={styles.dirText}>Incoming</Text>
                  </View>
                )}
                <Text style={styles.qtyPill}>{fmtQty(t.quantity_moved, t.unit)}</Text>
              </View>

              <Text style={styles.chemName}>{t.chemical_id?.name || '—'}</Text>
              {t.chemical_id?.id ? <Text style={styles.chemId}>{t.chemical_id.id}</Text> : null}

              <Text style={styles.meta}>
                {new Date(t.createdAt).toLocaleDateString()} · From: {t.source_lab?.name || '—'} · By:{' '}
                {t.requested_by?.name || '—'}
              </Text>
              {t.reason ? <Text style={styles.reason}>"{t.reason}"</Text> : null}

              <View style={styles.cardFooter}>
                <Badge label={t.status} tone={statusTone(t.status)} />
                {canApproveTransfer(t) ? (
                  <View style={styles.actions}>
                    <Pressable style={styles.approveBtn} onPress={() => void handleApprove(t._id)}>
                      <Text style={styles.approveText}>Approve</Text>
                    </Pressable>
                    <Pressable
                      style={styles.rejectBtn}
                      onPress={() => {
                        setRejectTargetId(t._id);
                        setRejectReason('');
                        setRejectOpen(true);
                      }}
                    >
                      <Text style={styles.rejectText}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* New Requisition Modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Request Chemical</Text>
              <Text style={styles.modalDesc}>Request a chemical FROM another lab. Their manager will approve.</Text>

              <Text style={styles.label}>Provider Lab (has the chemical) *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                <View style={styles.labChips}>
                  {allLabs.map((l) => (
                    <Pressable
                      key={l._id}
                      onPress={() => {
                        setForm((f) => ({ ...f, source_lab: String(l._id) }));
                        clearChem();
                      }}
                      style={[styles.labChip, form.source_lab === String(l._id) && styles.labChipOn]}
                    >
                      <Text
                        style={[
                          styles.labChipText,
                          form.source_lab === String(l._id) && styles.labChipTextOn,
                        ]}
                      >
                        {l.name || l.lab_code || l._id}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              {!allLabs.length ? (
                <Text style={styles.hint}>No other labs available.</Text>
              ) : null}

              <Text style={styles.label}>Chemical *</Text>
              {!form.source_lab ? (
                <Text style={styles.hint}>First select a provider lab above</Text>
              ) : selectedChem ? (
                <View style={styles.selectedChem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.chemName}>{selectedChem.name}</Text>
                    <Text style={styles.meta}>
                      ID: {selectedChem.id}
                      {selectedChem.cas_number ? ` · CAS: ${selectedChem.cas_number}` : ''}
                      {selectedChem.quantity !== undefined
                        ? ` · ${fmtQty(selectedChem.quantity, selectedChem.unit)}`
                        : ''}
                    </Text>
                  </View>
                  <Pressable onPress={clearChem}>
                    <Ionicons name="close-circle" size={22} color={colors.muted} />
                  </Pressable>
                </View>
              ) : (
                <>
                  <Input
                    placeholder="Type chemical name or CAS…"
                    value={chemSearch}
                    onChangeText={setChemSearch}
                    autoCapitalize="none"
                  />
                  {dropdownOpen ? (
                    <View style={styles.dropdown}>
                      {chemResults.length > 0 ? (
                        chemResults.map((chem) => (
                          <Pressable key={chem._id} style={styles.dropdownItem} onPress={() => pickChem(chem)}>
                            <Text style={styles.chemName}>{chem.name}</Text>
                            <Text style={styles.meta}>
                              {chem.id}
                              {chem.cas_number ? ` · CAS ${chem.cas_number}` : ''}
                              {chem.quantity !== undefined ? ` · ${fmtQty(chem.quantity, chem.unit)}` : ''}
                              {chem.status ? ` · ${chem.status}` : ''}
                            </Text>
                          </Pressable>
                        ))
                      ) : (
                        <Text style={styles.hint}>
                          {chemLoading ? 'Searching…' : `No results${chemSearch ? ` for "${chemSearch}"` : ''}`}
                        </Text>
                      )}
                    </View>
                  ) : null}
                </>
              )}

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Batch Number</Text>
                  <Input
                    placeholder="Optional"
                    value={form.batch_number}
                    onChangeText={(v) => setForm((f) => ({ ...f, batch_number: v }))}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Container ID</Text>
                  <Input
                    placeholder="Optional"
                    value={form.container_id}
                    onChangeText={(v) => setForm((f) => ({ ...f, container_id: v }))}
                  />
                </View>
              </View>

              <View style={styles.row2}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Quantity *</Text>
                  <Input
                    placeholder="Amount"
                    value={form.quantity_moved}
                    onChangeText={(v) => setForm((f) => ({ ...f, quantity_moved: v }))}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>Unit *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.unitChips}>
                      {['ml', 'L', 'g', 'kg', 'mg', 'µL'].map((u) => (
                        <Pressable
                          key={u}
                          onPress={() => setForm((f) => ({ ...f, unit: u }))}
                          style={[styles.unitChip, form.unit === u && styles.unitChipOn]}
                        >
                          <Text style={[styles.unitText, form.unit === u && styles.unitTextOn]}>{u}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              </View>

              <Text style={styles.label}>Reason / Purpose</Text>
              <Input
                placeholder="e.g. Running low on stock for experiment #34…"
                value={form.reason}
                onChangeText={(v) => setForm((f) => ({ ...f, reason: v }))}
                multiline
              />

              {selectedLabName ? (
                <Text style={styles.hint}>Requesting from: {selectedLabName}</Text>
              ) : null}

              <Button label="Submit Requisition" onPress={() => void handleSubmit()} />
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => {
                  setModalOpen(false);
                  resetModal();
                }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Reject Modal */}
      <Modal visible={rejectOpen} animationType="slide" transparent onRequestClose={() => setRejectOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={[styles.modalTitle, { color: colors.danger }]}>Reject Requisition</Text>
            <Text style={styles.modalDesc}>Please provide a reason for rejecting this chemical request.</Text>
            <Text style={styles.label}>Reason for rejection (optional)</Text>
            <Input
              placeholder="e.g. Not enough stock available right now…"
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
            />
            <Button label="Reject Requisition" variant="danger" onPress={() => void submitReject()} />
            <Button label="Cancel" variant="ghost" onPress={() => setRejectOpen(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    newBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginTop: 6,
    },
    newBtnText: { color: colors.btnText, fontWeight: '900', fontSize: 13 },
    legend: { marginBottom: 10, gap: 4 },
    legendItem: { color: colors.muted, fontSize: 11 },
    error: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      borderLeftWidth: 4,
      padding: 14,
      marginBottom: 10,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    dirBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    dirText: { color: colors.muted, fontWeight: '800', fontSize: 11, textTransform: 'uppercase' },
    qtyPill: {
      backgroundColor: colors.surface2,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      fontWeight: '800',
      color: colors.text,
      fontSize: 12,
      overflow: 'hidden',
    },
    chemName: { color: colors.text, fontWeight: '900', fontSize: 16, marginTop: 8 },
    chemId: { color: colors.muted, fontSize: 12, marginTop: 2 },
    meta: { color: colors.muted, fontSize: 12, marginTop: 6 },
    reason: { color: colors.muted, fontSize: 12, fontStyle: 'italic', marginTop: 4 },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 12,
      flexWrap: 'wrap',
      gap: 8,
    },
    actions: { flexDirection: 'row', gap: 8 },
    approveBtn: {
      borderWidth: 1,
      borderColor: colors.success,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    approveText: { color: colors.success, fontWeight: '800', fontSize: 12 },
    rejectBtn: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 6,
    },
    rejectText: { color: colors.danger, fontWeight: '800', fontSize: 12 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '92%',
    },
    modalTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 4 },
    modalDesc: { color: colors.muted, fontSize: 13, marginBottom: 14 },
    label: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 6 },
    hint: { color: colors.muted, fontSize: 12, marginBottom: 12, fontStyle: 'italic' },
    labChips: { flexDirection: 'row', gap: 8 },
    labChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    labChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    labChipText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
    labChipTextOn: { color: colors.btnText },
    selectedChem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.surface2,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 12,
    },
    dropdown: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface,
      marginBottom: 12,
      maxHeight: 200,
    },
    dropdownItem: {
      padding: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    row2: { flexDirection: 'row', gap: 10 },
    unitChips: { flexDirection: 'row', gap: 6, marginBottom: 12 },
    unitChip: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    unitChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    unitText: { color: colors.muted, fontWeight: '700', fontSize: 12 },
    unitTextOn: { color: colors.btnText },
  });
}
