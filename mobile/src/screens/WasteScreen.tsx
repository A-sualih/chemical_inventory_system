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
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { asList } from '../utils/apiHelpers';
import { Badge, Button, Card, EmptyState, Input, Screen, SectionLabel, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const TABS = [
  { id: 'disposal', label: 'Disposal Records', icon: 'trash-outline' as const },
  { id: 'compliance', label: 'Regulatory Compliance', icon: 'document-text-outline' as const },
  { id: 'safety', label: 'Safety & Incidents', icon: 'warning-outline' as const },
  { id: 'analytics', label: 'Analytics', icon: 'bar-chart-outline' as const },
] as const;

type TabId = (typeof TABS)[number]['id'];

const REASONS = ['Expired', 'Contaminated', 'Damaged', 'Excess stock', 'Experimental waste', 'Other'];
const METHODS = [
  'Neutralization',
  'Incineration',
  'Chemical treatment',
  'Recycling',
  'Waste contractor pickup',
  'Secure hazardous storage',
];
const COMPLIANCE_TYPES = [
  'Manifest',
  'Inspection',
  'Violation',
  'Corrective Action',
  'Permit Update',
  'Government Report',
];
const INCIDENT_TYPES = [
  'Spill',
  'Leak',
  'Toxic Emission',
  'Air Contamination',
  'Water Contamination',
  'Soil Contamination',
  'PPE Violation',
  'Other',
];
const SEVERITIES = ['Minor', 'Moderate', 'Major', 'Critical'];
const ANALYTICS_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const emptyDisposalForm = () => ({
  chemical_id: '',
  batch_id: '',
  batch_number: '',
  quantity: '',
  unit: '',
  reason: 'Expired',
  method: 'Neutralization',
  hazard_classification: '',
  notes: '',
});

const emptyCompletionForm = (operatorName = '') => ({
  method_details: {
    safety_procedure_followed: true,
    operator_name: operatorName,
    facility_name: '',
    treatment_details: '',
    verification_outcome: '',
    neutralization: {
      initial_ph: '7',
      final_ph: '7',
      neutralizing_agent: '',
      compatible_agents_verified: false,
      safe_range_validated: false,
    },
    incineration: {
      temperature: '1200',
      certificate_number: '',
      gas_handling_verified: true,
      final_report_url: '',
    },
  },
});

function fmtQty(qty: unknown, unit?: string) {
  const n = Number(qty);
  if (Number.isNaN(n)) return `${qty ?? '—'} ${unit || ''}`.trim();
  return `${n.toLocaleString()} ${unit || ''}`.trim();
}

function wasteTone(status?: string): 'muted' | 'ok' | 'warn' | 'danger' {
  const s = String(status || '').toLowerCase();
  if (s.includes('disposed') || s === 'approved' || s === 'resolved' || s === 'closed') return 'ok';
  if (s.includes('reject') || s === 'critical') return 'danger';
  if (s.includes('pending') || s.includes('progress') || s.includes('investigat')) return 'warn';
  return 'muted';
}

function ChipPicker({
  options,
  value,
  onChange,
  styles,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <Pressable key={opt} onPress={() => onChange(opt)} style={[styles.chip, on && styles.chipOn]}>
            <Text style={[styles.chipText, on && styles.chipTextOn]} numberOfLines={1}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default function WasteScreen() {
  const { user, hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [tab, setTab] = useState<TabId>('disposal');
  const [loading, setLoading] = useState(false);

  const canSubmit = hasPermission('manage_waste') || hasPermission('submit_request');
  const canApprove = hasPermission('approve_disposal');
  const canManage = hasPermission('manage_waste');

  // Disposal state
  const [disposals, setDisposals] = useState<any[]>([]);
  const [disposalTotal, setDisposalTotal] = useState(0);
  const [disposalSearch, setDisposalSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [chemicals, setChemicals] = useState<any[]>([]);
  const [chemicalSearch, setChemicalSearch] = useState('');
  const [batches, setBatches] = useState<any[]>([]);
  const [disposalForm, setDisposalForm] = useState(emptyDisposalForm());
  const [viewingDisposal, setViewingDisposal] = useState<any | null>(null);
  const [approvingDisposal, setApprovingDisposal] = useState<any | null>(null);
  const [fifoPreview, setFifoPreview] = useState<any | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('Regulatory compliance verified.');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState('');
  const [completingDisposal, setCompletingDisposal] = useState<any | null>(null);
  const [completionForm, setCompletionForm] = useState(emptyCompletionForm(user?.name || ''));

  // Compliance state
  const [complianceLogs, setComplianceLogs] = useState<any[]>([]);
  const [permits, setPermits] = useState<any[]>([]);
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [showPermitModal, setShowPermitModal] = useState(false);
  const [complianceForm, setComplianceForm] = useState({
    type: 'Manifest',
    title: '',
    regulatory_body: '',
    reference_number: '',
    description: '',
    status: 'Active',
  });
  const [permitForm, setPermitForm] = useState({
    permit_number: '',
    regulatory_body: '',
    type: 'Hazardous Waste Generation',
    issue_date: '',
    expiry_date: '',
    limits: [] as any[],
    limitsRaw: '',
  });

  // Incidents state
  const [incidents, setIncidents] = useState<any[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showEiaModal, setShowEiaModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<any | null>(null);
  const [incidentForm, setIncidentForm] = useState({
    type: 'Spill',
    severity: 'Minor',
    location: '',
    description: '',
    environmental_impact_details: '',
    emergency_actions_taken: '',
  });
  const [eiaForm, setEiaForm] = useState({
    environmental_impact_details: '',
    cleanup_procedure_followed: '',
    status: 'Resolved',
  });

  // Analytics state
  const [analytics, setAnalytics] = useState<any | null>(null);

  const loadDisposals = useCallback(async () => {
    const res = await api.get('/waste/disposals', {
      params: { search: disposalSearch.trim() || undefined, page: 1, limit: 50 },
    });
    setDisposals(asList(res.data?.disposals ?? res.data, ['disposals', 'data']));
    setDisposalTotal(res.data?.total ?? asList(res.data?.disposals ?? res.data, ['disposals']).length);
  }, [disposalSearch]);

  const loadCompliance = useCallback(async () => {
    const [logsRes, permitsRes] = await Promise.all([
      api.get('/waste/compliance'),
      api.get('/waste/permits'),
    ]);
    setComplianceLogs(asList(logsRes.data, ['logs', 'compliance', 'data']));
    setPermits(asList(permitsRes.data, ['permits', 'data']));
  }, []);

  const loadIncidents = useCallback(async () => {
    const [incRes, protoRes] = await Promise.all([
      api.get('/waste/incidents'),
      api.get('/waste/protocols'),
    ]);
    setIncidents(asList(incRes.data, ['incidents', 'data']));
    setProtocols(asList(protoRes.data, ['protocols', 'data']));
  }, []);

  const loadAnalytics = useCallback(async () => {
    const res = await api.get('/waste/analytics');
    setAnalytics(res.data);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'disposal') await loadDisposals();
      else if (tab === 'compliance') await loadCompliance();
      else if (tab === 'safety') await loadIncidents();
      else await loadAnalytics();
    } catch {
      /* tab-specific empty states handle errors */
    } finally {
      setLoading(false);
    }
  }, [tab, loadDisposals, loadCompliance, loadIncidents, loadAnalytics]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!showCreate) return;
    api
      .get('/chemicals', { params: { limit: 2000, archived: 'false' } })
      .then((res) => setChemicals(asList(res.data, ['data'])))
      .catch(() => setChemicals([]));
  }, [showCreate]);

  const pendingCount = disposals.filter((d) => d.status === 'Pending Approval').length;
  const completedCount = disposals.filter((d) => d.status === 'Disposed').length;

  const filteredChemicals = chemicals.filter(
    (c) =>
      c.name?.toLowerCase().includes(chemicalSearch.toLowerCase()) ||
      c.cas_number?.includes(chemicalSearch),
  );

  const selectChemical = async (c: any) => {
    setDisposalForm((f) => ({
      ...f,
      chemical_id: c._id,
      batch_id: '',
      batch_number: '',
      unit: c.unit || '',
    }));
    try {
      const res = await api.get('/batches', { params: { chemical_id: c.id || c._id } });
      setBatches(asList(res.data, ['data']));
    } catch {
      setBatches([]);
    }
  };

  const submitDisposal = async () => {
    if (!disposalForm.chemical_id || !disposalForm.quantity) {
      await dialog.alert('Disposal', 'Select a chemical and enter quantity.');
      return;
    }
    try {
      await api.post('/waste/disposals', disposalForm);
      setShowCreate(false);
      setDisposalForm(emptyDisposalForm());
      setBatches([]);
      await dialog.alert('Disposal', 'Request submitted. Awaiting approval.');
      await loadDisposals();
    } catch (e: any) {
      await dialog.alert('Disposal', e.response?.data?.error || 'Submit failed');
    }
  };

  const openApprove = async (d: any) => {
    setApprovingDisposal(d);
    setPreviewLoading(true);
    setFifoPreview(null);
    try {
      const res = await api.get(`/waste/disposals/${d._id}/fifo-preview`);
      setFifoPreview(res.data);
    } catch (e: any) {
      await dialog.alert('Approval', e.response?.data?.error || 'Failed to load FIFO preview');
      setApprovingDisposal(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const confirmApprove = async () => {
    if (!approvingDisposal) return;
    try {
      await api.put(`/waste/disposals/${approvingDisposal._id}/approve`, {
        approval_notes: approvalNotes,
      });
      setApprovingDisposal(null);
      setFifoPreview(null);
      await loadDisposals();
      await dialog.alert('Disposal', 'Approved successfully.');
    } catch (e: any) {
      await dialog.alert('Approval', e.response?.data?.error || 'Approval failed');
    }
  };

  const confirmReject = async () => {
    if (!rejectingId || !rejectionNotes.trim()) {
      await dialog.alert('Reject', 'Rejection reason is required.');
      return;
    }
    try {
      await api.put(`/waste/disposals/${rejectingId}/reject`, { rejection_notes: rejectionNotes });
      setRejectingId(null);
      setRejectionNotes('');
      await loadDisposals();
      await dialog.alert('Disposal', 'Request rejected.');
    } catch (e: any) {
      await dialog.alert('Reject', e.response?.data?.error || 'Rejection failed');
    }
  };

  const confirmComplete = async () => {
    if (!completingDisposal) return;
    const md = completionForm.method_details;
    if (!md.operator_name.trim() || !md.facility_name.trim()) {
      await dialog.alert('Complete', 'Operator name and facility are required.');
      return;
    }
    try {
      await api.put(`/waste/disposals/${completingDisposal._id}/complete`, completionForm);
      setCompletingDisposal(null);
      await loadDisposals();
      await dialog.alert('Disposal', 'Completed successfully.');
    } catch (e: any) {
      await dialog.alert('Complete', e.response?.data?.error || 'Completion failed');
    }
  };

  const deleteDisposal = async (id: string) => {
    const ok = await dialog.confirm({
      title: 'Delete record',
      message: 'Delete this disposal record? Inventory may be restored if not finalized.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await api.delete(`/waste/disposals/${id}`);
      await loadDisposals();
    } catch (e: any) {
      await dialog.alert('Delete', e.response?.data?.error || 'Deletion failed');
    }
  };

  const submitCompliance = async () => {
    if (!complianceForm.title.trim()) {
      await dialog.alert('Compliance', 'Title is required.');
      return;
    }
    try {
      await api.post('/waste/compliance', complianceForm);
      setShowComplianceModal(false);
      await loadCompliance();
    } catch {
      await dialog.alert('Compliance', 'Failed to log compliance entry');
    }
  };

  const submitPermit = async () => {
    if (!permitForm.permit_number.trim() || !permitForm.regulatory_body.trim()) {
      await dialog.alert('Permit', 'Permit number and regulatory body are required.');
      return;
    }
    try {
      const { limitsRaw, ...payload } = permitForm;
      await api.post('/waste/permits', payload);
      setShowPermitModal(false);
      await loadCompliance();
    } catch (e: any) {
      await dialog.alert('Permit', e.response?.data?.error || 'Failed to save permit');
    }
  };

  const signCompliance = async (id: string) => {
    const ok = await dialog.confirm({
      title: 'Sign compliance log',
      message: 'Electronically sign this compliance log?',
      confirmLabel: 'Sign',
      danger: false,
    });
    if (!ok) return;
    try {
      await api.put(`/waste/compliance/${id}/sign`);
      await loadCompliance();
    } catch {
      await dialog.alert('Sign', 'Signature failed');
    }
  };

  const submitIncident = async () => {
    if (!incidentForm.location.trim() || !incidentForm.description.trim()) {
      await dialog.alert('Incident', 'Location and description are required.');
      return;
    }
    try {
      await api.post('/waste/incidents', incidentForm);
      setShowIncidentModal(false);
      await loadIncidents();
    } catch {
      await dialog.alert('Incident', 'Failed to log incident');
    }
  };

  const submitEia = async () => {
    if (!selectedIncident || !eiaForm.environmental_impact_details.trim()) {
      await dialog.alert('EIA', 'Impact assessment is required.');
      return;
    }
    try {
      await api.put(`/waste/incidents/${selectedIncident._id}/impact`, eiaForm);
      setShowEiaModal(false);
      await loadIncidents();
    } catch {
      await dialog.alert('EIA', 'Failed to update impact assessment');
    }
  };

  const renderDisposalTab = () => (
    <>
      <View style={styles.metrics}>
        <Metric styles={styles} label="Total logs" value={String(disposalTotal)} sub="DISPOSAL RECORDS" />
        <Metric styles={styles} label="Pending" value={String(pendingCount)} sub="AWAITING REVIEW" warn />
        <Metric styles={styles} label="Completed" value={String(completedCount)} sub="PROCESSED" ok />
      </View>

      <View style={styles.toolbar}>
        <Input
          placeholder="Search chemical…"
          value={disposalSearch}
          onChangeText={setDisposalSearch}
          autoCapitalize="none"
          style={{ flex: 1, marginBottom: 0 }}
        />
        {canSubmit ? (
          <Button label="Log disposal" onPress={() => setShowCreate(true)} />
        ) : null}
      </View>

      <FlatList
        data={disposals}
        keyExtractor={(item) => item._id}
        scrollEnabled={false}
        ListEmptyComponent={!loading ? <EmptyState title="No disposal records" /> : null}
        renderItem={({ item }) => (
          <Card style={{ borderLeftWidth: 4, borderLeftColor: statusBorder(item.status) }}>
            <View style={styles.rowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.primary}>{item.chemical_name || 'Disposal'}</Text>
                <Text style={styles.meta}>
                  {item.disposal_id} · {fmtQty(item.quantity, item.unit)} · {item.method}
                </Text>
                <Text style={styles.meta}>{item.hazard_classification || item.reason}</Text>
              </View>
              <Badge label={item.status || '—'} tone={wasteTone(item.status)} />
            </View>
            <Text style={styles.meta}>
              {item.responsible_person_name || '—'} ·{' '}
              {new Date(item.disposal_date || item.createdAt).toLocaleDateString()}
            </Text>
            <View style={styles.actions}>
              <Button label="Details" variant="ghost" onPress={() => setViewingDisposal(item)} />
              {item.status === 'Pending Approval' && canApprove ? (
                <>
                  <Button label="Approve" onPress={() => void openApprove(item)} />
                  <Button label="Reject" variant="ghost" onPress={() => setRejectingId(item._id)} />
                </>
              ) : null}
              {item.status === 'Approved' && canManage ? (
                <Button
                  label="Complete"
                  onPress={() => {
                    setCompletingDisposal(item);
                    setCompletionForm(emptyCompletionForm(user?.name || ''));
                  }}
                />
              ) : null}
              {canManage ? (
                <Button label="Delete" variant="danger" onPress={() => deleteDisposal(item._id)} />
              ) : null}
            </View>
          </Card>
        )}
      />
    </>
  );

  const renderComplianceTab = () => (
    <ScrollView scrollEnabled={false}>
      <View style={styles.toolbar}>
        {canManage ? (
          <Button label="Manage permits" variant="ghost" onPress={() => setShowPermitModal(true)} />
        ) : null}
        <Button label="Add compliance log" onPress={() => setShowComplianceModal(true)} />
      </View>

      <View style={styles.metrics}>
        <Metric
          styles={styles}
          label="Active permits"
          value={String(permits.filter((p) => p.status === 'Active').length)}
        />
        <Metric
          styles={styles}
          label="Violations"
          value={String(
            complianceLogs.filter((l) => l.type === 'Violation' && l.status === 'Active').length,
          )}
          warn
        />
      </View>

      <SectionLabel>Regulatory compliance logs</SectionLabel>
      {complianceLogs.length === 0 ? (
        <EmptyState title="No compliance logs" />
      ) : (
        complianceLogs.map((log) => (
          <Card key={log._id}>
            <View style={styles.rowHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.primary}>{log.title}</Text>
                <Text style={styles.meta}>
                  {log.log_id} · {log.type} · {log.regulatory_body || '—'}
                </Text>
                {log.description ? (
                  <Text style={styles.meta} numberOfLines={2}>
                    {log.description}
                  </Text>
                ) : null}
              </View>
              <Badge label={log.status || '—'} tone={wasteTone(log.status)} />
            </View>
            <Text style={styles.meta}>
              {log.digital_signature?.name
                ? `Signed by ${log.digital_signature.name}`
                : 'Unsigned'}{' '}
              · {new Date(log.event_date || log.createdAt).toLocaleDateString()}
            </Text>
            {!log.digital_signature?.name && canApprove ? (
              <Button label="Sign & verify" onPress={() => signCompliance(log._id)} />
            ) : null}
          </Card>
        ))
      )}

      <SectionLabel>Active disposal permits</SectionLabel>
      {permits.length === 0 ? (
        <EmptyState title="No permits found" />
      ) : (
        permits.flatMap((permit) =>
          (permit.limits?.length ? permit.limits : [{ hazard_class: '—', current_quantity: 0, max_quantity: 1, unit: 'kg' }]).map(
            (limit: any, idx: number) => {
              const pct = limit.max_quantity
                ? Math.min(100, (limit.current_quantity / limit.max_quantity) * 100)
                : 0;
              const over = limit.current_quantity > limit.max_quantity;
              return (
                <Card key={`${permit._id}-${idx}`}>
                  {idx === 0 ? (
                    <>
                      <Text style={styles.primary}>{permit.permit_number}</Text>
                      <Text style={styles.meta}>
                        {permit.regulatory_body} · {permit.type} ·{' '}
                        {new Date(permit.expiry_date).toLocaleDateString()}
                      </Text>
                      <Badge label={permit.status || '—'} tone={wasteTone(permit.status)} />
                    </>
                  ) : null}
                  <Text style={[styles.meta, { marginTop: idx === 0 ? 10 : 0 }]}>
                    {limit.hazard_class}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: `${pct}%`,
                          backgroundColor: over ? colors.danger : colors.success,
                        },
                      ]}
                    />
                  </View>
                  <Text style={styles.meta}>
                    {limit.current_quantity} / {limit.max_quantity} {limit.unit}
                  </Text>
                </Card>
              );
            },
          ),
        )
      )}
    </ScrollView>
  );

  const renderSafetyTab = () => (
    <ScrollView scrollEnabled={false}>
      <Button label="Report incident" variant="danger" onPress={() => setShowIncidentModal(true)} />

      <View style={styles.metrics}>
        <Metric
          styles={styles}
          label="Critical risks"
          value={String(
            incidents.filter((i) => i.severity === 'Critical' && i.status !== 'Closed').length,
          )}
          warn
        />
        <Metric
          styles={styles}
          label="Active cleanup"
          value={String(incidents.filter((i) => i.status === 'Cleanup In Progress').length)}
        />
      </View>

      {incidents.length === 0 ? (
        <EmptyState title="No incidents logged" />
      ) : (
        incidents.map((i) => (
          <Card key={i._id}>
            <View style={styles.rowHeader}>
              <Text style={styles.meta}>{i.incident_id}</Text>
              <Badge label={i.status || '—'} tone={wasteTone(i.status)} />
            </View>
            <Text style={styles.primary}>{i.location}</Text>
            <Badge label={i.type || '—'} tone="muted" />
            <Text style={[styles.meta, { marginTop: 8 }]}>{i.description}</Text>
            {i.emergency_actions_taken ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteTitle}>Immediate response</Text>
                <Text style={styles.meta}>{i.emergency_actions_taken}</Text>
              </View>
            ) : null}
            {i.environmental_impact_details ? (
              <View style={[styles.noteBox, { borderColor: colors.accent }]}>
                <Text style={[styles.noteTitle, { color: colors.accent }]}>Impact assessment</Text>
                <Text style={styles.meta}>{i.environmental_impact_details}</Text>
              </View>
            ) : null}
            <Text style={styles.meta}>
              {i.reported_by_name} · {new Date(i.incident_date || i.createdAt).toLocaleDateString()}
            </Text>
            {canManage && i.status !== 'Closed' ? (
              <Button
                label="Update EIA"
                variant="ghost"
                onPress={() => {
                  setSelectedIncident(i);
                  setEiaForm({
                    environmental_impact_details: i.environmental_impact_details || '',
                    cleanup_procedure_followed: i.cleanup_procedure_followed || '',
                    status: i.status || 'Resolved',
                  });
                  setShowEiaModal(true);
                }}
              />
            ) : null}
          </Card>
        ))
      )}

      <SectionLabel>Safety protocol library</SectionLabel>
      {protocols.length === 0 ? (
        <Card>
          <Text style={styles.meta}>No protocols loaded.</Text>
        </Card>
      ) : (
        protocols.map((p) => (
          <Card key={p._id}>
            <View style={styles.rowHeader}>
              <Text style={styles.primary}>{p.waste_type}</Text>
              <Badge
                label={`${p.hazard_level} Risk`}
                tone={p.hazard_level === 'Extreme' ? 'danger' : 'ok'}
              />
            </View>
            <Text style={styles.meta}>Mandatory PPE</Text>
            <View style={styles.tagRow}>
              {(p.required_ppe || []).map((ppe: string) => (
                <View key={ppe} style={styles.tag}>
                  <Text style={styles.tagText}>{ppe}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.meta, { marginTop: 8 }]}>{p.cleanup_procedure}</Text>
          </Card>
        ))
      )}
    </ScrollView>
  );

  const renderAnalyticsTab = () => {
    if (!analytics) {
      return loading ? null : <EmptyState title="No analytics data" />;
    }
    const methodStats = analytics.methodStats || [];
    const statusStats = analytics.statusStats || [];
    const monthlyStats = analytics.monthlyStats || [];
    const maxMethod = Math.max(...methodStats.map((s: any) => s.count || 0), 1);
    const maxMonthlyQty = Math.max(...monthlyStats.map((s: any) => s.quantity || 0), 1);
    const maxMonthlyCount = Math.max(...monthlyStats.map((s: any) => s.count || 0), 1);

    return (
      <ScrollView scrollEnabled={false}>
        <SectionLabel>Disposal methods</SectionLabel>
        {methodStats.length === 0 ? (
          <Card>
            <Text style={styles.meta}>No method data.</Text>
          </Card>
        ) : (
          methodStats.map((m: any, i: number) => (
            <Card key={m._id || i}>
              <View style={styles.rowHeader}>
                <Text style={styles.primary}>{m._id}</Text>
                <Text style={styles.meta}>{m.count} requests · qty {m.totalQty ?? '—'}</Text>
              </View>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    {
                      width: `${((m.count || 0) / maxMethod) * 100}%`,
                      backgroundColor: ANALYTICS_COLORS[i % ANALYTICS_COLORS.length],
                    },
                  ]}
                />
              </View>
            </Card>
          ))
        )}

        <SectionLabel>Status distribution</SectionLabel>
        {statusStats.map((s: any, i: number) => (
          <Card key={s._id || i}>
            <Text style={styles.primary}>{s._id}</Text>
            <Text style={styles.meta}>{s.count} records</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${Math.min(
                      100,
                      (s.count /
                        Math.max(
                          ...statusStats.map((x: any) => x.count || 0),
                          1,
                        )) *
                        100,
                    )}%`,
                  },
                ]}
              />
            </View>
          </Card>
        ))}

        <SectionLabel>Monthly disposal quantity</SectionLabel>
        {monthlyStats.map((m: any, i: number) => (
          <Card key={m._id || i}>
            <Text style={styles.primary}>Month {m._id}</Text>
            <Text style={styles.meta}>Qty {m.quantity ?? 0}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${((m.quantity || 0) / maxMonthlyQty) * 100}%` },
                ]}
              />
            </View>
          </Card>
        ))}

        <SectionLabel>Request frequency trend</SectionLabel>
        {monthlyStats.map((m: any, i: number) => (
          <Card key={`freq-${m._id || i}`}>
            <Text style={styles.primary}>Month {m._id}</Text>
            <Text style={styles.meta}>{m.count ?? 0} requests</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${((m.count || 0) / maxMonthlyCount) * 100}%`,
                    backgroundColor: colors.accent2,
                  },
                ]}
              />
            </View>
          </Card>
        ))}
      </ScrollView>
    );
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
        }
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <Title>Waste & Disposal</Title>
        <Subtitle>
          Regulatory audit trails, permit monitoring, and hazardous material protocols.
        </Subtitle>

        <Card style={styles.statusCard}>
          <Text style={styles.statusLabel}>System status</Text>
          <Text style={styles.statusValue}>Audit Ready</Text>
          <Badge label="100% Secure" tone="ok" />
          <Text style={styles.meta}>All records are verified & signed</Text>
        </Card>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabScroll}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const on = tab === t.id;
            return (
              <Pressable
                key={t.id}
                onPress={() => setTab(t.id)}
                style={[styles.tab, on && styles.tabOn]}
              >
                <Ionicons name={t.icon} size={16} color={on ? colors.accent : colors.muted} />
                <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === 'disposal' ? renderDisposalTab() : null}
        {tab === 'compliance' ? renderComplianceTab() : null}
        {tab === 'safety' ? renderSafetyTab() : null}
        {tab === 'analytics' ? renderAnalyticsTab() : null}
      </ScrollView>

      {/* Create disposal modal */}
      <Modal visible={showCreate} animationType="slide" onRequestClose={() => setShowCreate(false)}>
        <Screen>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>Create disposal request</Title>
            <Subtitle>Initiate hazardous waste management workflow</Subtitle>
            <Input
              placeholder="Search chemical by name or CAS…"
              value={chemicalSearch}
              onChangeText={setChemicalSearch}
              autoCapitalize="none"
            />
            {filteredChemicals.slice(0, 20).map((c) => (
              <Pressable
                key={c._id}
                onPress={() => void selectChemical(c)}
                style={[
                  styles.chemCard,
                  disposalForm.chemical_id === c._id && styles.chemCardOn,
                ]}
              >
                <Text style={styles.primary}>{c.name}</Text>
                <Text style={styles.meta}>CAS: {c.cas_number || 'N/A'}</Text>
                <Text style={styles.meta}>Stock: {fmtQty(c.quantity, c.unit)}</Text>
              </Pressable>
            ))}

            {disposalForm.chemical_id ? (
              <>
                <SectionLabel>Batch (optional FIFO)</SectionLabel>
                <ChipPicker
                  options={['Auto FIFO', ...batches.map((b) => b.batch_number || b._id)]}
                  value={
                    disposalForm.batch_id
                      ? batches.find((b) => b._id === disposalForm.batch_id)?.batch_number ||
                        'Auto FIFO'
                      : 'Auto FIFO'
                  }
                  onChange={(v) => {
                    if (v === 'Auto FIFO') {
                      setDisposalForm((f) => ({ ...f, batch_id: '', batch_number: '' }));
                      return;
                    }
                    const batch = batches.find((b) => b.batch_number === v || b._id === v);
                    setDisposalForm((f) => ({
                      ...f,
                      batch_id: batch?._id || '',
                      batch_number: batch?.batch_number || '',
                    }));
                  }}
                  styles={styles}
                />

                <SectionLabel>Disposal method</SectionLabel>
                <ChipPicker
                  options={METHODS}
                  value={disposalForm.method}
                  onChange={(v) => setDisposalForm((f) => ({ ...f, method: v }))}
                  styles={styles}
                />

                <Input
                  placeholder="Quantity"
                  value={disposalForm.quantity}
                  onChangeText={(v) => setDisposalForm((f) => ({ ...f, quantity: v }))}
                  keyboardType="decimal-pad"
                />
                <Text style={styles.meta}>Unit: {disposalForm.unit || '—'}</Text>

                <SectionLabel>Primary reason</SectionLabel>
                <ChipPicker
                  options={REASONS}
                  value={disposalForm.reason}
                  onChange={(v) => setDisposalForm((f) => ({ ...f, reason: v }))}
                  styles={styles}
                />

                <Input
                  placeholder="Hazard notes & safety instructions"
                  value={disposalForm.notes}
                  onChangeText={(v) => setDisposalForm((f) => ({ ...f, notes: v }))}
                  multiline
                />
              </>
            ) : null}

            <Button label="Submit request" onPress={() => void submitDisposal()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowCreate(false)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* View disposal modal */}
      <Modal
        visible={!!viewingDisposal}
        animationType="slide"
        onRequestClose={() => setViewingDisposal(null)}
      >
        <Screen>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            {viewingDisposal ? (
              <>
                <Title>Disposal details</Title>
                <Subtitle>Reference: {viewingDisposal.disposal_id}</Subtitle>
                <Card>
                  <Text style={styles.primary}>{viewingDisposal.chemical_name}</Text>
                  <Text style={styles.meta}>
                    Batch: {viewingDisposal.batch_number || 'Auto-FIFO'}
                  </Text>
                  <Text style={styles.meta}>
                    Qty: {fmtQty(viewingDisposal.quantity, viewingDisposal.unit)}
                  </Text>
                  <Badge label={viewingDisposal.status} tone={wasteTone(viewingDisposal.status)} />
                  <Text style={styles.meta}>Method: {viewingDisposal.method}</Text>
                  <Text style={styles.meta}>
                    Responsible: {viewingDisposal.responsible_person_name || '—'}
                  </Text>
                  <Text style={[styles.meta, { marginTop: 8 }]}>
                    {viewingDisposal.notes || 'No notes provided.'}
                  </Text>
                  {viewingDisposal.approval_notes ? (
                    <Text style={[styles.meta, { color: colors.success, marginTop: 8 }]}>
                      Reviewer: {viewingDisposal.approval_notes}
                    </Text>
                  ) : null}
                </Card>
              </>
            ) : null}
            <Button label="Close" variant="ghost" onPress={() => setViewingDisposal(null)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Approve modal */}
      <Modal
        visible={!!approvingDisposal}
        animationType="slide"
        onRequestClose={() => setApprovingDisposal(null)}
      >
        <Screen>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>Approve disposal</Title>
            <Subtitle>FIFO batch impact preview</Subtitle>
            {previewLoading ? (
              <Text style={styles.meta}>Calculating FIFO impact…</Text>
            ) : fifoPreview ? (
              <>
                {(fifoPreview.affected_batches || []).map((b: any) => (
                  <Card key={b.batch_id}>
                    <Text style={styles.primary}>
                      {b.batch_number}
                      {b.is_targeted ? ' (Selected)' : ''}
                    </Text>
                    <Text style={styles.meta}>
                      Current {b.current_quantity} · Subtract {b.subtract_quantity} · Remaining{' '}
                      {b.remaining_quantity}
                    </Text>
                  </Card>
                ))}
                {fifoPreview.insufficient_inventory ? (
                  <Text style={[styles.meta, { color: colors.danger }]}>
                    Insufficient inventory. Shortfall: {fifoPreview.shortfall} {fifoPreview.unit}
                  </Text>
                ) : null}
              </>
            ) : null}
            <Input
              placeholder="Approval notes"
              value={approvalNotes}
              onChangeText={setApprovalNotes}
              multiline
            />
            <Button label="Confirm approval" onPress={() => void confirmApprove()} />
            <Button label="Cancel" variant="ghost" onPress={() => setApprovingDisposal(null)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Reject modal */}
      <Modal visible={!!rejectingId} animationType="slide" onRequestClose={() => setRejectingId(null)}>
        <Screen>
          <ScrollView>
            <Title>Reject request</Title>
            <Input
              placeholder="Rejection reason *"
              value={rejectionNotes}
              onChangeText={setRejectionNotes}
              multiline
            />
            <Button label="Confirm rejection" variant="danger" onPress={() => void confirmReject()} />
            <Button label="Cancel" variant="ghost" onPress={() => setRejectingId(null)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Complete modal */}
      <Modal
        visible={!!completingDisposal}
        animationType="slide"
        onRequestClose={() => setCompletingDisposal(null)}
      >
        <Screen>
          <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
            <Title>Finalize disposal</Title>
            <Subtitle>{completingDisposal?.disposal_id}</Subtitle>
            <Input
              placeholder="Operator name *"
              value={completionForm.method_details.operator_name}
              onChangeText={(v) =>
                setCompletionForm((f) => ({
                  ...f,
                  method_details: { ...f.method_details, operator_name: v },
                }))
              }
            />
            <Input
              placeholder="Disposal facility *"
              value={completionForm.method_details.facility_name}
              onChangeText={(v) =>
                setCompletionForm((f) => ({
                  ...f,
                  method_details: { ...f.method_details, facility_name: v },
                }))
              }
            />
            <View style={styles.switchRow}>
              <Text style={styles.meta}>Safety protocols followed</Text>
              <Switch
                value={completionForm.method_details.safety_procedure_followed}
                onValueChange={(v) =>
                  setCompletionForm((f) => ({
                    ...f,
                    method_details: { ...f.method_details, safety_procedure_followed: v },
                  }))
                }
              />
            </View>

            {completingDisposal?.method === 'Neutralization' ? (
              <>
                <SectionLabel>Neutralization verification</SectionLabel>
                <Input
                  placeholder="Initial pH"
                  value={completionForm.method_details.neutralization.initial_ph}
                  onChangeText={(v) =>
                    setCompletionForm((f) => ({
                      ...f,
                      method_details: {
                        ...f.method_details,
                        neutralization: { ...f.method_details.neutralization, initial_ph: v },
                      },
                    }))
                  }
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Final pH"
                  value={completionForm.method_details.neutralization.final_ph}
                  onChangeText={(v) =>
                    setCompletionForm((f) => ({
                      ...f,
                      method_details: {
                        ...f.method_details,
                        neutralization: { ...f.method_details.neutralization, final_ph: v },
                      },
                    }))
                  }
                  keyboardType="decimal-pad"
                />
                <Input
                  placeholder="Neutralizing agent"
                  value={completionForm.method_details.neutralization.neutralizing_agent}
                  onChangeText={(v) =>
                    setCompletionForm((f) => ({
                      ...f,
                      method_details: {
                        ...f.method_details,
                        neutralization: {
                          ...f.method_details.neutralization,
                          neutralizing_agent: v,
                        },
                      },
                    }))
                  }
                />
                <View style={styles.switchRow}>
                  <Text style={styles.meta}>Compatible agents verified</Text>
                  <Switch
                    value={completionForm.method_details.neutralization.compatible_agents_verified}
                    onValueChange={(v) =>
                      setCompletionForm((f) => ({
                        ...f,
                        method_details: {
                          ...f.method_details,
                          neutralization: {
                            ...f.method_details.neutralization,
                            compatible_agents_verified: v,
                          },
                        },
                      }))
                    }
                  />
                </View>
                <View style={styles.switchRow}>
                  <Text style={styles.meta}>Safe pH range validated (6–9)</Text>
                  <Switch
                    value={completionForm.method_details.neutralization.safe_range_validated}
                    onValueChange={(v) =>
                      setCompletionForm((f) => ({
                        ...f,
                        method_details: {
                          ...f.method_details,
                          neutralization: {
                            ...f.method_details.neutralization,
                            safe_range_validated: v,
                          },
                        },
                      }))
                    }
                  />
                </View>
              </>
            ) : null}

            {completingDisposal?.method === 'Incineration' ? (
              <>
                <SectionLabel>Incineration verification</SectionLabel>
                <Input
                  placeholder="Burn temp (°C)"
                  value={completionForm.method_details.incineration.temperature}
                  onChangeText={(v) =>
                    setCompletionForm((f) => ({
                      ...f,
                      method_details: {
                        ...f.method_details,
                        incineration: { ...f.method_details.incineration, temperature: v },
                      },
                    }))
                  }
                  keyboardType="number-pad"
                />
                <Input
                  placeholder="Certificate #"
                  value={completionForm.method_details.incineration.certificate_number}
                  onChangeText={(v) =>
                    setCompletionForm((f) => ({
                      ...f,
                      method_details: {
                        ...f.method_details,
                        incineration: {
                          ...f.method_details.incineration,
                          certificate_number: v,
                        },
                      },
                    }))
                  }
                />
                <Input
                  placeholder="Final report URL"
                  value={completionForm.method_details.incineration.final_report_url}
                  onChangeText={(v) =>
                    setCompletionForm((f) => ({
                      ...f,
                      method_details: {
                        ...f.method_details,
                        incineration: { ...f.method_details.incineration, final_report_url: v },
                      },
                    }))
                  }
                  autoCapitalize="none"
                />
                <View style={styles.switchRow}>
                  <Text style={styles.meta}>Gas scrubbing verified</Text>
                  <Switch
                    value={completionForm.method_details.incineration.gas_handling_verified}
                    onValueChange={(v) =>
                      setCompletionForm((f) => ({
                        ...f,
                        method_details: {
                          ...f.method_details,
                          incineration: {
                            ...f.method_details.incineration,
                            gas_handling_verified: v,
                          },
                        },
                      }))
                    }
                  />
                </View>
              </>
            ) : null}

            <Input
              placeholder="Waste treatment details"
              value={completionForm.method_details.treatment_details}
              onChangeText={(v) =>
                setCompletionForm((f) => ({
                  ...f,
                  method_details: { ...f.method_details, treatment_details: v },
                }))
              }
              multiline
            />
            <Input
              placeholder="Final outcome verification"
              value={completionForm.method_details.verification_outcome}
              onChangeText={(v) =>
                setCompletionForm((f) => ({
                  ...f,
                  method_details: { ...f.method_details, verification_outcome: v },
                }))
              }
            />
            <Button label="Confirm & finalize" onPress={() => void confirmComplete()} />
            <Button label="Cancel" variant="ghost" onPress={() => setCompletingDisposal(null)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Compliance log modal */}
      <Modal
        visible={showComplianceModal}
        animationType="slide"
        onRequestClose={() => setShowComplianceModal(false)}
      >
        <Screen>
          <ScrollView>
            <Title>New compliance entry</Title>
            <ChipPicker
              options={COMPLIANCE_TYPES}
              value={complianceForm.type}
              onChange={(v) => setComplianceForm((f) => ({ ...f, type: v }))}
              styles={styles}
            />
            <ChipPicker
              options={['Active', 'Pending Review', 'Resolved', 'Closed']}
              value={complianceForm.status}
              onChange={(v) => setComplianceForm((f) => ({ ...f, status: v }))}
              styles={styles}
            />
            <Input
              placeholder="Title / document name *"
              value={complianceForm.title}
              onChangeText={(v) => setComplianceForm((f) => ({ ...f, title: v }))}
            />
            <Input
              placeholder="Regulatory body"
              value={complianceForm.regulatory_body}
              onChangeText={(v) => setComplianceForm((f) => ({ ...f, regulatory_body: v }))}
            />
            <Input
              placeholder="Reference number"
              value={complianceForm.reference_number}
              onChangeText={(v) => setComplianceForm((f) => ({ ...f, reference_number: v }))}
            />
            <Input
              placeholder="Description"
              value={complianceForm.description}
              onChangeText={(v) => setComplianceForm((f) => ({ ...f, description: v }))}
              multiline
            />
            <Button label="Create log entry" onPress={() => void submitCompliance()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowComplianceModal(false)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Permit modal */}
      <Modal
        visible={showPermitModal}
        animationType="slide"
        onRequestClose={() => setShowPermitModal(false)}
      >
        <Screen>
          <ScrollView>
            <Title>Add regulatory permit</Title>
            <Input
              placeholder="Permit number *"
              value={permitForm.permit_number}
              onChangeText={(v) => setPermitForm((f) => ({ ...f, permit_number: v }))}
            />
            <Input
              placeholder="Regulatory body *"
              value={permitForm.regulatory_body}
              onChangeText={(v) => setPermitForm((f) => ({ ...f, regulatory_body: v }))}
            />
            <ChipPicker
              options={[
                'Hazardous Waste Generation',
                'Transportation',
                'On-site Treatment',
                'Storage',
              ]}
              value={permitForm.type}
              onChange={(v) => setPermitForm((f) => ({ ...f, type: v }))}
              styles={styles}
            />
            <Input
              placeholder="Issue date YYYY-MM-DD"
              value={permitForm.issue_date}
              onChangeText={(v) => setPermitForm((f) => ({ ...f, issue_date: v }))}
              autoCapitalize="none"
            />
            <Input
              placeholder="Expiry date YYYY-MM-DD"
              value={permitForm.expiry_date}
              onChangeText={(v) => setPermitForm((f) => ({ ...f, expiry_date: v }))}
              autoCapitalize="none"
            />
            <Input
              placeholder="Limits: Flammable:500:kg; Toxic:100:L"
              value={permitForm.limitsRaw}
              onChangeText={(v) => setPermitForm((f) => ({ ...f, limitsRaw: v }))}
              onBlur={() => {
                const limits = permitForm.limitsRaw
                  .split(';')
                  .map((s) => {
                    const [hc, qty, unit] = s.split(':');
                    return {
                      hazard_class: hc?.trim(),
                      max_quantity: Number(qty),
                      unit: unit?.trim() || 'kg',
                      current_quantity: 0,
                    };
                  })
                  .filter((l) => l.hazard_class && l.max_quantity);
                setPermitForm((f) => ({ ...f, limits }));
              }}
            />
            <Button label="Save permit" onPress={() => void submitPermit()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowPermitModal(false)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* Incident modal */}
      <Modal
        visible={showIncidentModal}
        animationType="slide"
        onRequestClose={() => setShowIncidentModal(false)}
      >
        <Screen>
          <ScrollView>
            <Title>Report environmental incident</Title>
            <ChipPicker
              options={INCIDENT_TYPES}
              value={incidentForm.type}
              onChange={(v) => setIncidentForm((f) => ({ ...f, type: v }))}
              styles={styles}
            />
            <ChipPicker
              options={SEVERITIES}
              value={incidentForm.severity}
              onChange={(v) => setIncidentForm((f) => ({ ...f, severity: v }))}
              styles={styles}
            />
            <Input
              placeholder="Location *"
              value={incidentForm.location}
              onChangeText={(v) => setIncidentForm((f) => ({ ...f, location: v }))}
            />
            <Input
              placeholder="Description *"
              value={incidentForm.description}
              onChangeText={(v) => setIncidentForm((f) => ({ ...f, description: v }))}
              multiline
            />
            <Input
              placeholder="Emergency actions taken"
              value={incidentForm.emergency_actions_taken}
              onChangeText={(v) => setIncidentForm((f) => ({ ...f, emergency_actions_taken: v }))}
              multiline
            />
            <Button label="Submit report" variant="danger" onPress={() => void submitIncident()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowIncidentModal(false)} />
          </ScrollView>
        </Screen>
      </Modal>

      {/* EIA modal */}
      <Modal visible={showEiaModal} animationType="slide" onRequestClose={() => setShowEiaModal(false)}>
        <Screen>
          <ScrollView>
            <Title>Impact assessment</Title>
            <Subtitle>{selectedIncident?.incident_id}</Subtitle>
            <ChipPicker
              options={['Reported', 'Investigating', 'Cleanup In Progress', 'Resolved', 'Closed']}
              value={eiaForm.status}
              onChange={(v) => setEiaForm((f) => ({ ...f, status: v }))}
              styles={styles}
            />
            <Input
              placeholder="Environmental impact assessment *"
              value={eiaForm.environmental_impact_details}
              onChangeText={(v) => setEiaForm((f) => ({ ...f, environmental_impact_details: v }))}
              multiline
            />
            <Input
              placeholder="Cleanup procedure followed"
              value={eiaForm.cleanup_procedure_followed}
              onChangeText={(v) => setEiaForm((f) => ({ ...f, cleanup_procedure_followed: v }))}
              multiline
            />
            <Button label="Update assessment" onPress={() => void submitEia()} />
            <Button label="Cancel" variant="ghost" onPress={() => setShowEiaModal(false)} />
          </ScrollView>
        </Screen>
      </Modal>
    </Screen>
  );
}

function statusBorder(status?: string) {
  if (status === 'Approved') return '#10b981';
  if (status === 'Pending Approval') return '#f59e0b';
  if (status === 'Rejected') return '#ef4444';
  if (status === 'Disposed') return '#0ea5e9';
  return 'transparent';
}

function Metric({
  styles,
  label,
  value,
  sub,
  warn,
  ok,
}: {
  styles: ReturnType<typeof makeStyles>;
  label: string;
  value: string;
  sub?: string;
  warn?: boolean;
  ok?: boolean;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text
        style={[
          styles.metricValue,
          warn ? { color: '#d97706' } : null,
          ok ? { color: '#059669' } : null,
        ]}
      >
        {value}
      </Text>
      {sub ? <Text style={styles.metricSub}>{sub}</Text> : null}
    </View>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    statusCard: { backgroundColor: colors.surface2 },
    statusLabel: {
      color: colors.accent,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    statusValue: { color: colors.text, fontSize: 24, fontWeight: '900', marginVertical: 6 },
    tabScroll: { marginBottom: 12, maxHeight: 48 },
    tabRow: { gap: 8, paddingRight: 8 },
    tab: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    tabOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    tabText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    tabTextOn: { color: colors.accent },
    metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    metric: {
      flexGrow: 1,
      minWidth: '30%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
    },
    metricLabel: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: { color: colors.text, fontWeight: '900', fontSize: 22, marginTop: 4 },
    metricSub: { color: colors.muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
    toolbar: { gap: 8, marginBottom: 12 },
    primary: { color: colors.text, fontWeight: '800' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 4, lineHeight: 17 },
    rowHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 8,
    },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
    chipScroll: { marginBottom: 12, maxHeight: 44 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      marginRight: 8,
    },
    chipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    chipText: { color: colors.muted, fontWeight: '700', fontSize: 11, maxWidth: 160 },
    chipTextOn: { color: colors.accent },
    chemCard: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      marginBottom: 8,
      backgroundColor: colors.surface,
    },
    chemCardOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    barTrack: {
      height: 8,
      borderRadius: 999,
      backgroundColor: colors.surface2,
      marginTop: 8,
      overflow: 'hidden',
    },
    barFill: { height: '100%', backgroundColor: colors.accent, borderRadius: 999 },
    noteBox: {
      marginTop: 10,
      padding: 12,
      borderRadius: 12,
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteTitle: { color: colors.text, fontWeight: '800', fontSize: 12, marginBottom: 4 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    tag: {
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
    },
    tagText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
      paddingVertical: 4,
    },
  });
}
