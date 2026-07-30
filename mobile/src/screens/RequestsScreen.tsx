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
import { useRoute, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { normalizeRole } from '../utils/roles';
import type { UsageRequest } from '../types';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';

const UNIT_RATES: Record<string, number> = {
  kg: 1,
  g: 0.001,
  mg: 0.000001,
  mcg: 0.000000001,
  L: 1,
  l: 1,
  mL: 0.001,
  ml: 0.001,
  ul: 0.000001,
  nl: 0.000000001,
};

/**
 * Request & Approval System — parity with web Requests.jsx
 */
export default function RequestsScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { user, hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const role = String(normalizeRole(user?.role) || user?.role || '');
  const isManager = role === 'Lab Manager';
  const isSafety = role === 'Safety Officer';
  const canApprove = hasPermission('approve_request');
  const showSubmit =
    hasPermission('submit_request') && !isManager && role !== 'Admin' && !isSafety;

  const [activeTab, setActiveTab] = useState<'standard' | 'inventory'>('standard');
  const [items, setItems] = useState<UsageRequest[]>([]);
  const [inventoryRequests, setInventoryRequests] = useState<any[]>([]);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [containers, setContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showNewChemModal, setShowNewChemModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [processingReqId, setProcessingReqId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [otherLabs, setOtherLabs] = useState<any[]>([]);
  const [otherLabChemicals, setOtherLabChemicals] = useState<any[]>([]);
  const [selectedTargetLab, setSelectedTargetLab] = useState('');
  const [selectedTransferChem, setSelectedTransferChem] = useState('');

  const [selectedChem, setSelectedChem] = useState(String(route.params?.chemical_id || ''));
  const [selectedContainer, setSelectedContainer] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('L');
  const [reason, setReason] = useState('');
  const [fifoContainer, setFifoContainer] = useState<any>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [newChemForm, setNewChemForm] = useState({
    chemical_name: '',
    cas_number: '',
    quantity: '',
    unit: 'kg',
    reason: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, invRes] = await Promise.all([
        api.get('/requests'),
        api.get('/requests/inventory-request'),
      ]);
      setItems(asList(reqRes.data, ['requests', 'data']) as UsageRequest[]);
      setInventoryRequests(asList(invRes.data, ['data']));
    } catch {
      setItems([]);
      setInventoryRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadChemicals = useCallback(async () => {
    if (!showSubmit) return;
    try {
      const { data } = await api.get('/chemicals');
      setChemicals(asList(data, ['data']));
    } catch {
      setChemicals([]);
    }
  }, [showSubmit]);

  const fetchContainers = useCallback(
    async (chemId: string) => {
      if (!chemId) {
        setContainers([]);
        setFifoContainer(null);
        return;
      }
      try {
        const { data: containerData } = await api.get('/containers', {
          params: { chemical_id: chemId },
        });
        const { data: requestData } = await api.get('/requests');
        const pending = asList(requestData, ['data']).filter(
          (r: any) => r.status === 'Pending'
        );

        const adjusted = asList(containerData, ['data'])
          .filter((c: any) => c.status !== 'Empty' && c.status !== 'Disposed')
          .map((container: any) => {
            const containerPending = pending.filter(
              (r: any) =>
                r.container_id?._id === container._id || r.container_id === container._id
            );
            let pendingTotalBase = 0;
            containerPending.forEach((pr: any) => {
              pendingTotalBase += Number(pr.quantity) * (UNIT_RATES[pr.unit] || 1);
            });
            const currentInBase = container.quantity * (UNIT_RATES[container.unit] || 1);
            const adjustedInBase = Math.max(0, currentInBase - pendingTotalBase);
            return {
              ...container,
              available_quantity: (
                adjustedInBase / (UNIT_RATES[container.unit] || 1)
              ).toFixed(3),
            };
          });

        setContainers(adjusted);
        try {
          const { data: fifo } = await api.get('/requests/fifo-container', {
            params: { chemical_id: chemId },
          });
          setFifoContainer(fifo);
          setSelectedContainer(fifo.fifo_container_id);
        } catch {
          setFifoContainer(null);
        }
      } catch {
        setContainers([]);
      }
    },
    []
  );

  useEffect(() => {
    void load();
    void loadChemicals();
  }, [load, loadChemicals]);

  useEffect(() => {
    if (route.params?.chemical_id) {
      setSelectedChem(String(route.params.chemical_id));
      setShowRequestModal(true);
    }
  }, [route.params?.chemical_id]);

  useEffect(() => {
    if (selectedChem) {
      const chem = chemicals.find((c) => c._id === selectedChem);
      if (chem) {
        setUnit(chem.unit || 'L');
        setSubmitError(null);
        void fetchContainers(selectedChem);
      }
    } else {
      setContainers([]);
      setSelectedContainer('');
      setFifoContainer(null);
    }
  }, [selectedChem, chemicals, fetchContainers]);

  const submit = async () => {
    setSubmitError(null);
    if (!selectedChem || !selectedContainer || !quantity || !reason.trim()) {
      setSubmitError('Please fill in all required fields.');
      return;
    }

    const container = containers.find((c) => c._id === selectedContainer);
    if (container) {
      const requestedInBase = Number(quantity) * (UNIT_RATES[unit] || 1);
      const availableInBase =
        Number(container.available_quantity) * (UNIT_RATES[container.unit] || 1);
      if (requestedInBase > availableInBase + 0.000001) {
        const availableInRequestedUnit = (availableInBase / (UNIT_RATES[unit] || 1)).toFixed(2);
        setSubmitError(
          `Insufficient amount! This container only has ${availableInRequestedUnit} ${unit} available.`
        );
        return;
      }
    }

    setSubmitting(true);
    try {
      await api.post('/requests', {
        chemical_id: selectedChem,
        container_id: selectedContainer,
        quantity: Number(quantity),
        unit,
        reason: reason.trim(),
      });
      setSelectedChem('');
      setSelectedContainer('');
      setQuantity('');
      setReason('');
      setFifoContainer(null);
      setShowRequestModal(false);
      setMessage('Request submitted and pending approval.');
      await load();
    } catch (e: any) {
      setSubmitError(e.response?.data?.error || 'Error submitting request');
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (id: string, decision: 'approve' | 'reject') => {
    const notes = decisionNotes[id] || '';
    const ok = await dialog.confirm({
      title: decision === 'approve' ? 'Approve request' : 'Reject request',
      message:
        decision === 'approve'
          ? 'Approve this usage request? Stock will be reduced.'
          : 'Reject this request?',
      confirmLabel: decision === 'approve' ? 'Approve' : 'Reject',
      danger: decision === 'reject',
    });
    if (!ok) return;
    setActing(id);
    try {
      await api.patch(`/requests/${id}/${decision}`, { notes });
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || `${decision} failed`);
    } finally {
      setActing(null);
    }
  };

  const cancelRequest = async (id: string) => {
    const ok = await dialog.confirm({
      title: 'Cancel request',
      message: 'Are you sure you want to cancel this request?',
      confirmLabel: 'Cancel request',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/requests/${id}/cancel`);
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Cancel failed');
    }
  };

  const submitInventoryRequest = async () => {
    setSubmitting(true);
    try {
      await api.post('/requests/inventory-request', newChemForm);
      setNewChemForm({ chemical_name: '', cas_number: '', quantity: '', unit: 'kg', reason: '' });
      setShowNewChemModal(false);
      setMessage('New chemical request submitted.');
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Error submitting inventory request');
    } finally {
      setSubmitting(false);
    }
  };

  const inventoryReject = async () => {
    if (!processingReqId || !rejectNotes.trim()) return;
    try {
      await api.patch(`/requests/inventory-request/${processingReqId}/reject`, {
        notes: rejectNotes,
      });
      setShowRejectModal(false);
      setRejectNotes('');
      await load();
    } catch {
      await dialog.alert('Error', 'Failed to reject request');
    }
  };

  const inventoryEnroll = (req: any) => {
    navigation.navigate('ChemicalForm', {
      chemical: {
        name: req.chemical_name,
        cas_number: req.cas_number,
        quantity: req.quantity,
        unit: req.unit,
      },
    });
  };

  const fetchOtherLabs = async () => {
    try {
      const { data } = await api.get('/labs', { params: { all: true } });
      const currentLabId = String(user?.active_lab || '');
      setOtherLabs(asList(data, ['data']).filter((l: any) => String(l._id) !== currentLabId));
    } catch {
      setOtherLabs([]);
    }
  };

  const inventoryTransfer = async () => {
    if (!selectedTargetLab || !selectedTransferChem || !processingReqId) {
      setMessage('Select lab and chemical');
      return;
    }
    try {
      await api.patch(`/requests/inventory-request/${processingReqId}/transfer`, {
        target_lab_id: selectedTargetLab,
        chemical_id: selectedTransferChem,
      });
      setShowTransferModal(false);
      await load();
    } catch {
      setMessage('Failed to send transfer request');
    }
  };

  useEffect(() => {
    if (selectedTargetLab) {
      api
        .get(`/transfers/lab-chemicals/${selectedTargetLab}`)
        .then((res) => setOtherLabChemicals(asList(res.data, ['data'])))
        .catch(() => setOtherLabChemicals([]));
    }
  }, [selectedTargetLab]);

  const cancelInventoryRequest = async (id: string) => {
    const ok = await dialog.confirm({
      title: 'Cancel request',
      message: 'Cancel this new chemical request?',
      confirmLabel: 'Cancel',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.patch(`/requests/inventory-request/${id}/cancel`);
      await load();
    } catch (e: any) {
      setMessage(e.response?.data?.error || 'Cancel failed');
    }
  };

  const myId = String(user?.id || (user as any)?._id || '');
  const selectedChemicalObj = chemicals.find((c) => c._id === selectedChem);
  const liquidUnits =
    selectedChemicalObj?.state?.toLowerCase() === 'liquid' ||
    selectedChemicalObj?.unit === 'L' ||
    selectedChemicalObj?.unit === 'mL';

  const renderRequestForm = () => (
    <ScrollView keyboardShouldPersistTaps="handled">
      <Text style={styles.label}>Select chemical</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
        {chemicals.map((c) => (
          <Pressable
            key={c._id}
            onPress={() => setSelectedChem(c._id)}
            style={[styles.chip, selectedChem === c._id && styles.chipOn]}
          >
            <Text style={[styles.chipText, selectedChem === c._id && styles.chipTextOn]}>
              {c.name}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedChem ? (
        <>
          <Text style={styles.label}>
            Select container {fifoContainer ? '(FIFO auto-selected)' : ''}
          </Text>
          {containers.map((c) => {
            const isFifo = fifoContainer && c._id === fifoContainer.fifo_container_id;
            return (
              <Pressable
                key={c._id}
                onPress={() => {
                  setSelectedContainer(c._id);
                  setSubmitError(null);
                }}
                style={[
                  styles.containerPick,
                  selectedContainer === c._id && styles.containerPickOn,
                ]}
              >
                <Text style={styles.containerPickText}>
                  {isFifo ? '[FIFO] ' : ''}
                  {c.container_id} — {c.available_quantity} {c.unit}
                  {c.location ? ` · ${c.location}` : ''}
                </Text>
              </Pressable>
            );
          })}
          {fifoContainer &&
          selectedContainer &&
          selectedContainer !== fifoContainer.fifo_container_id ? (
            <View style={styles.fifoWarn}>
              <Text style={styles.fifoWarnTitle}>FIFO order warning</Text>
              <Text style={styles.meta}>
                Finish {fifoContainer.container_id} first (
                {fifoContainer.available_quantity} {fifoContainer.unit} left).
              </Text>
              <Pressable onPress={() => setSelectedContainer(fifoContainer.fifo_container_id)}>
                <Text style={styles.link}>Switch to FIFO container</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      ) : null}

      <Input
        placeholder="Quantity"
        value={quantity}
        onChangeText={setQuantity}
        keyboardType="decimal-pad"
      />
      <Text style={styles.label}>Unit</Text>
      <View style={styles.chipRow}>
        {(liquidUnits ? ['L', 'mL', 'ul'] : ['kg', 'g', 'mg']).map((u) => (
          <Pressable
            key={u}
            onPress={() => setUnit(u)}
            style={[styles.chip, unit === u && styles.chipOn]}
          >
            <Text style={[styles.chipText, unit === u && styles.chipTextOn]}>{u}</Text>
          </Pressable>
        ))}
      </View>
      <Input
        placeholder="Reason (experiment / project) *"
        value={reason}
        onChangeText={setReason}
        multiline
      />
      {submitError ? <Text style={styles.err}>{submitError}</Text> : null}
      <Button
        label={submitting ? 'Submitting…' : 'Submit request'}
        onPress={() => void submit()}
        loading={submitting}
      />
    </ScrollView>
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Title>Requests</Title>
          <Subtitle>Every usage must go through request → approval.</Subtitle>
        </View>
        {showSubmit ? (
          <View style={styles.headerActions}>
            <Pressable style={styles.headerBtn} onPress={() => setShowRequestModal(true)}>
              <Text style={styles.headerBtnText}>Usage</Text>
            </Pressable>
            <Pressable style={[styles.headerBtn, styles.headerBtnAlt]} onPress={() => setShowNewChemModal(true)}>
              <Text style={styles.headerBtnTextAlt}>New chem</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {(
          [
            ['standard', 'Standard usage'],
            ['inventory', 'New chemical requests'],
          ] as const
        ).map(([id, label]) => (
          <Pressable
            key={id}
            onPress={() => setActiveTab(id)}
            style={[styles.tab, activeTab === id && styles.tabOn]}
          >
            <Text style={[styles.tabText, activeTab === id && styles.tabTextOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {message ? <Text style={styles.ok}>{message}</Text> : null}

      <FlatList
        data={activeTab === 'standard' ? items : inventoryRequests}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              title={activeTab === 'standard' ? 'No requests in queue' : 'No new chemical requests'}
              body={showSubmit ? 'Tap Usage to start a request.' : undefined}
            />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={({ item }) => {
          if (activeTab === 'inventory') {
            const req = item as any;
            const pending = req.status === 'Pending';
            const isMine = req.requester?._id === myId;
            return (
              <View style={[styles.row, styles.invRow]}>
                <Text style={styles.name}>
                  {req.chemical_name} {req.cas_number ? `(${req.cas_number})` : ''}
                </Text>
                <Badge label={req.status} tone={toneForStatus(req.status)} />
                <Text style={styles.meta}>
                  {req.quantity} {req.unit} · {req.action_taken || '—'}
                </Text>
                <Text style={styles.meta}>"{req.reason}"</Text>
                {req.manager_notes ? (
                  <Text style={styles.meta}>Notes: {req.manager_notes}</Text>
                ) : null}
                {pending && canApprove ? (
                  <View style={styles.actions}>
                    {isMine ? (
                      <Button label="Cancel" variant="ghost" onPress={() => cancelInventoryRequest(req._id)} />
                    ) : null}
                    <Button
                      label="Reject"
                      variant="danger"
                      onPress={() => {
                        setProcessingReqId(req._id);
                        setShowRejectModal(true);
                      }}
                    />
                    <Button label="Enroll" onPress={() => inventoryEnroll(req)} />
                    <Button
                      label="Ask lab"
                      variant="ghost"
                      onPress={() => {
                        setProcessingReqId(req._id);
                        void fetchOtherLabs();
                        setShowTransferModal(true);
                      }}
                    />
                  </View>
                ) : null}
              </View>
            );
          }

          const status = String(item.status || 'pending');
          const pending = status.toLowerCase() === 'pending';
          const requesterId = String(
            (item as any).user_id?._id || (item as any).user_id || ''
          );
          const isMine = requesterId === myId;

          return (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>
                  {(item as any).chemical_id?.name || item.chemical_name || item.chemical_id || 'Request'}
                </Text>
                <Text style={styles.meta}>
                  {item.quantity ?? '—'} {item.unit || ''} · Container:{' '}
                  {(item as any).container_id?.container_id || 'N/A'}
                </Text>
                <Text style={styles.meta}>
                  Requester: {(item as any).user_id?.name || item.requester_name || 'Unknown'}
                </Text>
                {item.reason ? <Text style={styles.meta}>"{item.reason}"</Text> : null}
                {(item as any).notes ? (
                  <Text style={styles.meta}>Decision: {(item as any).notes}</Text>
                ) : null}
                {pending && isMine ? (
                  <Button label="Cancel request" variant="ghost" onPress={() => cancelRequest(item._id)} />
                ) : null}
                {canApprove && pending ? (
                  <>
                    <Input
                      placeholder="Decision notes…"
                      value={decisionNotes[item._id] || ''}
                      onChangeText={(v) =>
                        setDecisionNotes((prev) => ({ ...prev, [item._id]: v }))
                      }
                    />
                    <View style={styles.actions}>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Approve"
                          onPress={() => void decide(item._id, 'approve')}
                          loading={acting === item._id}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          label="Reject"
                          variant="danger"
                          onPress={() => void decide(item._id, 'reject')}
                          loading={acting === item._id}
                        />
                      </View>
                    </View>
                  </>
                ) : null}
              </View>
              <Badge
                label={status}
                tone={
                  status.toLowerCase() === 'approved'
                    ? 'ok'
                    : status.toLowerCase() === 'rejected'
                      ? 'danger'
                      : toneForStatus(status)
                }
              />
            </View>
          );
        }}
      />

      <Modal visible={showRequestModal} animationType="slide" transparent onRequestClose={() => setShowRequestModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Submit usage request</Text>
            {renderRequestForm()}
            <Button label="Close" variant="ghost" onPress={() => setShowRequestModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showNewChemModal} animationType="slide" transparent onRequestClose={() => setShowNewChemModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request new chemical</Text>
            <Input
              placeholder="Chemical name *"
              value={newChemForm.chemical_name}
              onChangeText={(v) => setNewChemForm((f) => ({ ...f, chemical_name: v }))}
            />
            <Input
              placeholder="CAS number"
              value={newChemForm.cas_number}
              onChangeText={(v) => setNewChemForm((f) => ({ ...f, cas_number: v }))}
            />
            <Input
              placeholder="Quantity *"
              value={newChemForm.quantity}
              onChangeText={(v) => setNewChemForm((f) => ({ ...f, quantity: v }))}
              keyboardType="decimal-pad"
            />
            <Input
              placeholder="Unit"
              value={newChemForm.unit}
              onChangeText={(v) => setNewChemForm((f) => ({ ...f, unit: v }))}
            />
            <Input
              placeholder="Reason *"
              value={newChemForm.reason}
              onChangeText={(v) => setNewChemForm((f) => ({ ...f, reason: v }))}
              multiline
            />
            <Button label="Submit request" onPress={() => void submitInventoryRequest()} loading={submitting} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowNewChemModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showRejectModal} transparent animationType="fade" onRequestClose={() => setShowRejectModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reject request</Text>
            <Input
              placeholder="Rejection reason *"
              value={rejectNotes}
              onChangeText={setRejectNotes}
              multiline
            />
            <Button label="Reject & notify" variant="danger" onPress={() => void inventoryReject()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowRejectModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={showTransferModal} transparent animationType="slide" onRequestClose={() => setShowTransferModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Request transfer from another lab</Text>
            <Text style={styles.label}>Target lab</Text>
            {otherLabs.map((l) => (
              <Pressable
                key={l._id}
                onPress={() => setSelectedTargetLab(l._id)}
                style={[styles.containerPick, selectedTargetLab === l._id && styles.containerPickOn]}
              >
                <Text style={styles.containerPickText}>{l.name}</Text>
              </Pressable>
            ))}
            {selectedTargetLab ? (
              <>
                <Text style={styles.label}>Available chemicals</Text>
                {otherLabChemicals.map((c) => (
                  <Pressable
                    key={c._id}
                    onPress={() => setSelectedTransferChem(c._id)}
                    style={[
                      styles.containerPick,
                      selectedTransferChem === c._id && styles.containerPickOn,
                    ]}
                  >
                    <Text style={styles.containerPickText}>
                      {c.name} ({c.quantity} {c.unit})
                    </Text>
                  </Pressable>
                ))}
              </>
            ) : null}
            <Button label="Send transfer request" onPress={() => void inventoryTransfer()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowTransferModal(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    headerActions: { flexDirection: 'row', gap: 6, marginTop: 4 },
    headerBtn: {
      backgroundColor: colors.accent,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    headerBtnAlt: { backgroundColor: colors.surface2, borderWidth: 1, borderColor: colors.border },
    headerBtnText: { color: colors.btnText, fontWeight: '800', fontSize: 11 },
    headerBtnTextAlt: { color: colors.text, fontWeight: '800', fontSize: 11 },
    tabs: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 12,
      backgroundColor: colors.surface2,
      borderRadius: 999,
      padding: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    tab: { flex: 1, paddingVertical: 10, borderRadius: 999, alignItems: 'center' },
    tabOn: { backgroundColor: colors.accent },
    tabText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    tabTextOn: { color: colors.btnText },
    ok: { color: colors.success, fontWeight: '700', marginBottom: 8 },
    err: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
    row: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 10,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      alignItems: 'flex-start',
    },
    invRow: { borderLeftWidth: 4, borderLeftColor: '#8b5cf6' },
    name: { color: colors.text, fontWeight: '800', fontSize: 15, width: '100%' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 3, width: '100%' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, width: '100%' },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 8,
    },
    chipScroll: { maxHeight: 44, marginBottom: 8 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
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
    containerPick: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    containerPickOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    containerPickText: { color: colors.text, fontSize: 13, fontWeight: '600' },
    fifoWarn: {
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
      borderWidth: 1,
      borderColor: colors.warn,
    },
    fifoWarnTitle: { color: colors.warn, fontWeight: '900', fontSize: 12 },
    link: { color: colors.accent, fontWeight: '800', marginTop: 6 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
      maxHeight: '90%',
    },
    modalTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 12 },
  });
}
