import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { fmtQty } from '../../utils/formatQuantity';
import type { ThemeColors } from '../../theme/colors';
import { Button } from '../ui';

type ActionType = 'OUT' | 'IN' | 'TRANSFER' | 'DISPOSAL';

interface ChemicalRef {
  id: string;
  name: string;
  quantity?: number;
  unit?: string;
  state?: string;
  batch_number?: string;
  expiry_date?: string;
  container_type?: string;
  building?: string;
  room?: string;
  cabinet?: string;
  shelf?: string;
  supplier?: string;
  num_containers?: number;
  restricted_access?: boolean;
  training_required?: boolean;
  disposal_file_url?: string;
}

interface Props {
  chemical: ChemicalRef;
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  initialAction?: ActionType;
}

const DISPOSAL_REASONS = ['Expired', 'Contaminated', 'Damaged', 'Excess stock', 'Experimental waste', 'Other'];
const DISPOSAL_METHODS = [
  'Neutralization',
  'Incineration',
  'Chemical treatment',
  'Recycling',
  'Waste contractor pickup',
  'Secure hazardous storage',
];

export default function StockActionModal({
  chemical,
  visible,
  onClose,
  onSuccess,
  initialAction = 'OUT',
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [action, setAction] = useState<ActionType>(initialAction);
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState(chemical.unit || 'L');
  const [reason, setReason] = useState('');
  const [batch, setBatch] = useState(chemical.batch_number || '');
  const [expiry, setExpiry] = useState(chemical.expiry_date?.split('T')[0] || '');
  const [numContainers, setNumContainers] = useState('1');
  const [qtyPerContainer, setQtyPerContainer] = useState('');
  const [containerType, setContainerType] = useState(chemical.container_type || 'Plastic Bottle');
  const [containerId, setContainerId] = useState('');
  const [building, setBuilding] = useState(chemical.building || '');
  const [room, setRoom] = useState(chemical.room || '');
  const [cabinet, setCabinet] = useState(chemical.cabinet || '');
  const [shelf, setShelf] = useState(chemical.shelf || '');
  const [supplier, setSupplier] = useState(chemical.supplier || '');
  const [experimentName, setExperimentName] = useState('');
  const [department, setDepartment] = useState('');
  const [toBuilding, setToBuilding] = useState('');
  const [toRoom, setToRoom] = useState('');
  const [toCabinet, setToCabinet] = useState('');
  const [toShelf, setToShelf] = useState('');
  const [numContainersMoved, setNumContainersMoved] = useState('1');
  const [transferApprovedBy, setTransferApprovedBy] = useState('');
  const [disposalMethod, setDisposalMethod] = useState('');
  const [disposalApprovedBy, setDisposalApprovedBy] = useState('');
  const [disposalApprovedRole, setDisposalApprovedRole] = useState('safety_officer');
  const [complianceNotes, setComplianceNotes] = useState('');
  const [disposalChecklist, setDisposalChecklist] = useState([false, false]);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [incompatibilityWarning, setIncompatibilityWarning] = useState<any>(null);
  const [availableContainers, setAvailableContainers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) return;
    setAction(initialAction);
    setUnit(chemical.unit || 'L');
    setBatch(chemical.batch_number || '');
  }, [visible, initialAction, chemical]);

  useEffect(() => {
    if (!visible) return;
    api
      .get(`/containers/chemical/${chemical.id}`)
      .then(({ data }) => setAvailableContainers((Array.isArray(data) ? data : []).filter((c) => c.status !== 'Empty')))
      .catch(() => setAvailableContainers([]));
  }, [visible, chemical.id]);

  useEffect(() => {
    if (action === 'IN') {
      const total = (Number(numContainers) || 0) * (Number(qtyPerContainer) || 0);
      if (total > 0) setAmount(String(total));
    }
  }, [action, numContainers, qtyPerContainer]);

  useEffect(() => {
    const target =
      action === 'TRANSFER' && toBuilding && toRoom && toCabinet && toShelf
        ? `${toBuilding}-${toRoom}-${toCabinet}-${toShelf}`
        : action === 'IN' && building && room && cabinet && shelf
          ? `${building}-${room}-${cabinet}-${shelf}`
          : null;
    if (!target) {
      setIncompatibilityWarning(null);
      return;
    }
    api
      .get(`/safety/check-incompatibility/${encodeURIComponent(target)}`, {
        params: { chemicalId: chemical.id },
      })
      .then(({ data }) => setIncompatibilityWarning(data.incompatible ? data : null))
      .catch(() => setIncompatibilityWarning(null));
  }, [action, building, room, cabinet, shelf, toBuilding, toRoom, toCabinet, toShelf, chemical.id]);

  const reset = () => {
    setAmount('');
    setReason('');
    setError('');
    setSafetyAcknowledged(false);
    setDisposalChecklist([false, false]);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleContainerSelect = (id: string) => {
    const selected = availableContainers.find((c) => c.container_id === id);
    setContainerId(id);
    if (!selected) return;
    setBatch(selected.batch_number || '');
    setBuilding(selected.building || '');
    setRoom(selected.room || '');
    setCabinet(selected.cabinet || '');
    setShelf(selected.shelf || '');
    setExpiry(selected.expiry_date ? String(selected.expiry_date).split('T')[0] : '');
    setUnit(selected.unit || chemical.unit || 'L');
    if (action !== 'IN') setAmount(String(selected.quantity || ''));
  };

  const submit = async () => {
    setLoading(true);
    setError('');

    const requestedAmount = Number(amount);
    if (['OUT', 'DISPOSAL', 'TRANSFER'].includes(action)) {
      if (containerId) {
        const selected = availableContainers.find((c) => c.container_id === containerId);
        if (selected && requestedAmount > selected.quantity) {
          setError(`Insufficient stock in ${containerId}. Available: ${fmtQty(selected.quantity, selected.unit)}`);
          setLoading(false);
          return;
        }
      } else if (requestedAmount > (chemical.quantity || 0)) {
        setError(`Insufficient total stock. Available: ${fmtQty(chemical.quantity, chemical.unit)}`);
        setLoading(false);
        return;
      }
    }

    if (action === 'TRANSFER' && Number(numContainersMoved) > (chemical.num_containers || 1)) {
      setError(`Insufficient containers. Only ${chemical.num_containers || 1} vessels available.`);
      setLoading(false);
      return;
    }

    if ((chemical.restricted_access || chemical.training_required) && !safetyAcknowledged) {
      setError('Acknowledge safety training and access protocols for this restricted material.');
      setLoading(false);
      return;
    }

    try {
      await api.post('/inventory/transaction', {
        chemical_id: chemical.id,
        action,
        quantity_change: requestedAmount,
        unit,
        reason: action === 'IN' ? reason : reason,
        batch,
        batch_number: batch,
        expiry,
        numContainers,
        qtyPerContainer,
        containerType,
        containerId,
        building,
        room,
        cabinet,
        shelf,
        to_building: toBuilding,
        to_room: toRoom,
        to_cabinet: toCabinet,
        to_shelf: toShelf,
        num_containers_moved: action === 'TRANSFER' ? Number(numContainersMoved) : undefined,
        transfer_approved_by: transferApprovedBy,
        supplier,
        experiment_name: experimentName,
        department,
        disposal_method: disposalMethod,
        disposal_approved_by: disposalApprovedBy,
        disposal_approved_role: disposalApprovedRole,
        compliance_notes: complianceNotes,
      });
      onSuccess?.();
      close();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Transaction failed');
    } finally {
      setLoading(false);
    }
  };

  const actions: { id: ActionType; label: string }[] = [
    { id: 'OUT', label: 'Stock Out' },
    { id: 'IN', label: 'Stock In' },
    { id: 'TRANSFER', label: 'Transfer' },
    { id: 'DISPOSAL', label: 'Disposal' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.title}>Inventory Operation</Text>
                <Text style={styles.sub}>
                  {chemical.name} · {chemical.id}
                </Text>
              </View>
              <Pressable onPress={close}>
                <Text style={styles.close}>✕</Text>
              </Pressable>
            </View>

            <Text style={styles.label}>Transaction type</Text>
            <View style={styles.actionRow}>
              {actions.map((a) => (
                <Pressable
                  key={a.id}
                  onPress={() => setAction(a.id)}
                  style={[styles.actionChip, action === a.id && styles.actionChipOn]}
                >
                  <Text style={[styles.actionText, action === a.id && styles.actionTextOn]}>{a.label}</Text>
                </Pressable>
              ))}
            </View>

            <Field label={`Quantity ${action === 'TRANSFER' ? 'moved' : action === 'OUT' ? 'removed' : 'added'}`} styles={styles}>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={colors.muted}
              />
            </Field>

            <Field label="Unit" styles={styles}>
              <TextInput style={styles.input} value={unit} onChangeText={setUnit} placeholderTextColor={colors.muted} />
            </Field>

            {action === 'IN' ? (
              <>
                <Field label="Batch / lot *" styles={styles}>
                  <TextInput style={styles.input} value={batch} onChangeText={setBatch} placeholderTextColor={colors.muted} />
                </Field>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="Container count" styles={styles}>
                      <TextInput style={styles.input} value={numContainers} onChangeText={setNumContainers} keyboardType="number-pad" placeholderTextColor={colors.muted} />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="Qty / container *" styles={styles}>
                      <TextInput style={styles.input} value={qtyPerContainer} onChangeText={setQtyPerContainer} keyboardType="decimal-pad" placeholderTextColor={colors.muted} />
                    </Field>
                  </View>
                </View>
                <Field label="Container type" styles={styles}>
                  <TextInput style={styles.input} value={containerType} onChangeText={setContainerType} placeholderTextColor={colors.muted} />
                </Field>
                <Field label="Expiry date *" styles={styles}>
                  <TextInput style={styles.input} value={expiry} onChangeText={setExpiry} placeholder="YYYY-MM-DD" placeholderTextColor={colors.muted} />
                </Field>
                <Field label="Supplier" styles={styles}>
                  <TextInput style={styles.input} value={supplier} onChangeText={setSupplier} placeholderTextColor={colors.muted} />
                </Field>
              </>
            ) : null}

            {action !== 'IN' && action !== 'DISPOSAL' ? (
              <Field label="Target container" styles={styles}>
                <View style={styles.pickerWrap}>
                  {availableContainers.map((c) => (
                    <Pressable
                      key={c._id || c.container_id}
                      onPress={() => handleContainerSelect(c.container_id)}
                      style={[styles.pickItem, containerId === c.container_id && styles.pickItemOn]}
                    >
                      <Text style={styles.pickText}>
                        {c.container_id} ({fmtQty(c.quantity, c.unit)}) · {c.status}
                      </Text>
                    </Pressable>
                  ))}
                  {!availableContainers.length ? (
                    <Text style={styles.hint}>No non-empty containers</Text>
                  ) : null}
                </View>
              </Field>
            ) : null}

            {action === 'IN' ? (
              <Field label="Container ID" styles={styles}>
                <TextInput style={styles.input} value={containerId} onChangeText={setContainerId} placeholderTextColor={colors.muted} />
              </Field>
            ) : null}

            <Field label="Batch reference" styles={styles}>
              <TextInput
                style={styles.input}
                value={batch}
                onChangeText={setBatch}
                editable={action === 'IN'}
                placeholderTextColor={colors.muted}
              />
            </Field>

            <View style={styles.row2}>
              {(['building', 'room', 'cabinet', 'shelf'] as const).map((field) => (
                <View key={field} style={{ flex: 1, minWidth: '45%' }}>
                  <Field label={field} styles={styles}>
                    <TextInput
                      style={styles.input}
                      value={field === 'building' ? building : field === 'room' ? room : field === 'cabinet' ? cabinet : shelf}
                      onChangeText={
                        field === 'building'
                          ? setBuilding
                          : field === 'room'
                            ? setRoom
                            : field === 'cabinet'
                              ? setCabinet
                              : setShelf
                      }
                      placeholderTextColor={colors.muted}
                    />
                  </Field>
                </View>
              ))}
            </View>

            {action === 'TRANSFER' ? (
              <>
                <Text style={styles.section}>Destination (TO)</Text>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="To building" styles={styles}>
                      <TextInput style={styles.input} value={toBuilding} onChangeText={setToBuilding} placeholderTextColor={colors.muted} />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="To room" styles={styles}>
                      <TextInput style={styles.input} value={toRoom} onChangeText={setToRoom} placeholderTextColor={colors.muted} />
                    </Field>
                  </View>
                </View>
                <View style={styles.row2}>
                  <View style={{ flex: 1 }}>
                    <Field label="To cabinet" styles={styles}>
                      <TextInput style={styles.input} value={toCabinet} onChangeText={setToCabinet} placeholderTextColor={colors.muted} />
                    </Field>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Field label="To shelf" styles={styles}>
                      <TextInput style={styles.input} value={toShelf} onChangeText={setToShelf} placeholderTextColor={colors.muted} />
                    </Field>
                  </View>
                </View>
                <Field label="Containers moved" styles={styles}>
                  <TextInput style={styles.input} value={numContainersMoved} onChangeText={setNumContainersMoved} keyboardType="number-pad" placeholderTextColor={colors.muted} />
                </Field>
                <Field label="Transfer approved by" styles={styles}>
                  <TextInput style={styles.input} value={transferApprovedBy} onChangeText={setTransferApprovedBy} placeholderTextColor={colors.muted} />
                </Field>
              </>
            ) : null}

            {action === 'OUT' ? (
              <>
                <Field label="Experiment name" styles={styles}>
                  <TextInput style={styles.input} value={experimentName} onChangeText={setExperimentName} placeholderTextColor={colors.muted} />
                </Field>
                <Field label="Department" styles={styles}>
                  <TextInput style={styles.input} value={department} onChangeText={setDepartment} placeholderTextColor={colors.muted} />
                </Field>
              </>
            ) : null}

            {action === 'DISPOSAL' ? (
              <>
                <Field label="Disposal reason *" styles={styles}>
                  <View style={styles.pickerWrap}>
                    {DISPOSAL_REASONS.map((r) => (
                      <Pressable key={r} onPress={() => setReason(r)} style={[styles.pickItem, reason === r && styles.pickItemOn]}>
                        <Text style={styles.pickText}>{r}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Field>
                <Field label="Disposal method *" styles={styles}>
                  <View style={styles.pickerWrap}>
                    {DISPOSAL_METHODS.map((m) => (
                      <Pressable key={m} onPress={() => setDisposalMethod(m)} style={[styles.pickItem, disposalMethod === m && styles.pickItemOn]}>
                        <Text style={styles.pickText}>{m}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Field>
                <Field label="Approved by *" styles={styles}>
                  <TextInput style={styles.input} value={disposalApprovedBy} onChangeText={setDisposalApprovedBy} placeholderTextColor={colors.muted} />
                </Field>
                <Field label="Role" styles={styles}>
                  <View style={styles.pickerWrap}>
                    {['safety_officer', 'lab_manager'].map((r) => (
                      <Pressable
                        key={r}
                        onPress={() => setDisposalApprovedRole(r)}
                        style={[styles.pickItem, disposalApprovedRole === r && styles.pickItemOn]}
                      >
                        <Text style={styles.pickText}>{r.replace('_', ' ')}</Text>
                      </Pressable>
                    ))}
                  </View>
                </Field>
                <Field label="Compliance notes" styles={styles}>
                  <TextInput
                    style={[styles.input, styles.textarea]}
                    value={complianceNotes}
                    onChangeText={setComplianceNotes}
                    multiline
                    placeholderTextColor={colors.muted}
                  />
                </Field>
                <Pressable
                  onPress={() => setDisposalChecklist([!disposalChecklist[0], disposalChecklist[1]])}
                  style={styles.checkRow}
                >
                  <Text style={styles.checkMark}>{disposalChecklist[0] ? '☑' : '☐'}</Text>
                  <Text style={styles.checkText}>I have read the designated protocol</Text>
                </Pressable>
                <Pressable
                  onPress={() => setDisposalChecklist([disposalChecklist[0], !disposalChecklist[1]])}
                  style={styles.checkRow}
                >
                  <Text style={styles.checkMark}>{disposalChecklist[1] ? '☑' : '☐'}</Text>
                  <Text style={styles.checkText}>Waste container is verified compatible</Text>
                </Pressable>
              </>
            ) : (
              <Field label="Reason / purpose *" styles={styles}>
                <TextInput
                  style={[styles.input, styles.textarea]}
                  value={reason}
                  onChangeText={setReason}
                  multiline
                  placeholderTextColor={colors.muted}
                />
              </Field>
            )}

            {incompatibilityWarning ? (
              <View style={styles.warnBox}>
                <Text style={styles.warnTitle}>Incompatible storage warning</Text>
                <Text style={styles.warnBody}>
                  Location contains {incompatibilityWarning.conflicting_chemical}. Storing {chemical.name} here is
                  dangerous.
                </Text>
              </View>
            ) : null}

            {(chemical.restricted_access || chemical.training_required) && (
              <View style={styles.complianceBox}>
                <Text style={styles.warnTitle}>Compliance acknowledgment</Text>
                <Text style={styles.hint}>
                  Confirm required safety training and authorization for this restricted material.
                </Text>
                <View style={styles.switchRow}>
                  <Text style={styles.checkText}>I confirm safety training compliance</Text>
                  <Switch value={safetyAcknowledged} onValueChange={setSafetyAcknowledged} />
                </View>
              </View>
            )}

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Button
              label={`Confirm ${action} operation`}
              onPress={() => void submit()}
              loading={loading}
              disabled={action === 'DISPOSAL' && (!disposalChecklist[0] || !disposalChecklist[1])}
            />
            <Button label="Cancel" variant="ghost" onPress={close} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  children,
  styles,
}: {
  label: string;
  children: React.ReactNode;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    card: {
      maxHeight: '92%',
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    header: { flexDirection: 'row', marginBottom: 8 },
    title: { color: colors.text, fontWeight: '900', fontSize: 20 },
    sub: { color: colors.muted, fontSize: 12, marginTop: 4 },
    close: { color: colors.muted, fontSize: 22 },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 8,
    },
    section: { color: colors.text, fontWeight: '800', marginTop: 12, marginBottom: 4 },
    input: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.text,
      marginBottom: 4,
    },
    textarea: { minHeight: 72, textAlignVertical: 'top' },
    actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    actionChip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.surface,
    },
    actionChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    actionText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    actionTextOn: { color: colors.btnText },
    row2: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    pickerWrap: { gap: 6, marginBottom: 6 },
    pickItem: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 10,
      backgroundColor: colors.surface,
    },
    pickItemOn: { borderColor: colors.accent, backgroundColor: colors.surface2 },
    pickText: { color: colors.text, fontSize: 12, fontWeight: '600' },
    hint: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
    warnBox: {
      borderWidth: 1,
      borderColor: colors.warn,
      backgroundColor: colors.surface2,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    warnTitle: { color: colors.warn, fontWeight: '900', marginBottom: 4 },
    warnBody: { color: colors.text, fontSize: 13 },
    complianceBox: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 12,
      marginTop: 8,
    },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
    checkMark: { fontSize: 18, color: colors.text },
    checkText: { color: colors.text, flex: 1, fontSize: 13 },
    error: { color: colors.danger, fontWeight: '700', marginVertical: 8 },
  });
}
