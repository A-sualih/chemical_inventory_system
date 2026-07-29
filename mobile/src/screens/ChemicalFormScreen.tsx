import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import {
  CHEMICAL_FAMILIES,
  EXPOSURE_RISK_TAGS,
  HAZARD_CLASSES,
  NFPA_RATINGS,
  PPE_OPTIONS,
} from '../constants/hazards';
import HazardBadges from '../components/chemicals/HazardBadges';
import { EnrollBarcodeScanner } from '../components/EnrollBarcodeScanner';
import { DateField } from '../components/DateField';
import { resolveAssetUrl } from '../utils/assets';
import type { ThemeColors } from '../theme/colors';
import { Button, Card, Input, Screen, SectionLabel, Subtitle, Title } from '../components/ui';

type FormState = Record<string, any>;

type PickedDoc = {
  uri: string;
  name: string;
  mimeType: string;
};

function defaultForm(initial?: any): FormState {
  const d = initial || {};
  return {
    name: d.name || '',
    iupac_name: d.iupac_name || '',
    cas_number: d.cas_number || '',
    formula: d.formula || '',
    quantity: d.quantity ?? '',
    unit: d.unit || 'L',
    threshold: d.threshold ?? 5,
    purity: d.purity || '99%',
    concentration: d.concentration || 'Default',
    location: d.location || '',
    building: d.building || '',
    room: d.room || '',
    cabinet: d.cabinet || '',
    shelf: d.shelf || '',
    state: d.state || 'Liquid',
    storage_temp: d.storage_temp || '20',
    storage_humidity: d.storage_humidity || '45',
    supplier: d.supplier || '',
    batch_number: d.batch_number || '',
    manufacturing_date: d.manufacturing_date?.split?.('T')?.[0] || d.manufacturing_date || '',
    purchase_date: d.purchase_date?.split?.('T')?.[0] || d.purchase_date || '',
    expiry_date: d.expiry_date?.split?.('T')?.[0] || d.expiry_date || '',
    num_containers: d.num_containers ?? 1,
    quantity_per_container: d.quantity_per_container || '',
    container_type: d.container_type || 'Plastic Bottle',
    container_id_series: d.container_id_series || '',
    barcode: d.barcode || '',
    remarks: d.remarks || '',
    chemical_family: d.chemical_family || 'General',
    spill_instructions: d.spill_instructions || '',
    emergency_instructions: d.emergency_instructions || '',
    exposure_risks: d.exposure_risks || [],
    ghs_classes: d.ghs_classes || [],
    sds_attached: d.sds_attached === 1 || d.sds_attached === true,
    sds_file_name: d.sds_file_name || '',
    sds_file_url: d.sds_file_url || '',
    disposal_file_name: d.disposal_file_name || '',
    disposal_file_url: d.disposal_file_url || '',
    ghs_hazards: d.ghs_hazards || { categories: [], signal_word: 'None', h_codes: [], p_codes: [], pictograms: [] },
    nfpa_rating: d.nfpa_rating || { health: 0, flammability: 0, reactivity: 0, special: '' },
    ppe_requirements: d.ppe_requirements || [],
    restricted_access: d.restricted_access || false,
    training_required: d.training_required || false,
  };
}

export default function ChemicalFormScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const dialog = useDialog();
  const initialData = route.params?.chemical as any | undefined;
  const isEdit = Boolean(initialData?.id);

  const { user, hasPermission } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const canSave = isEdit ? hasPermission('edit_chemical') : hasPermission('create_chemical');
  const readOnly = user?.role === 'Safety Officer';

  const [form, setForm] = useState<FormState>(() => defaultForm(initialData));
  const [locHierarchy, setLocHierarchy] = useState<{ buildings: string[]; rooms: string[]; cabinets: string[]; shelves: any[] }>({
    buildings: [],
    rooms: [],
    cabinets: [],
    shelves: [],
  });
  const [incompatibilityWarning, setIncompatibilityWarning] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [sdsFile, setSdsFile] = useState<PickedDoc | null>(null);
  const [disposalFile, setDisposalFile] = useState<PickedDoc | null>(null);

  const patch = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    api.get('/locations/hierarchy').then(({ data }) =>
      setLocHierarchy((prev) => ({ ...prev, buildings: data.buildings || [] }))
    );
  }, []);

  useEffect(() => {
    if (!form.building) {
      setLocHierarchy((prev) => ({ ...prev, rooms: [], cabinets: [], shelves: [] }));
      return;
    }
    api
      .get('/locations/hierarchy', { params: { building: form.building } })
      .then(({ data }) => setLocHierarchy((prev) => ({ ...prev, rooms: data.rooms || [], cabinets: [], shelves: [] })));
  }, [form.building]);

  useEffect(() => {
    if (!form.building || !form.room) {
      setLocHierarchy((prev) => ({ ...prev, cabinets: [], shelves: [] }));
      return;
    }
    api
      .get('/locations/hierarchy', { params: { building: form.building, room: form.room } })
      .then(({ data }) => setLocHierarchy((prev) => ({ ...prev, cabinets: data.cabinets || [], shelves: [] })));
  }, [form.building, form.room]);

  useEffect(() => {
    if (!form.building || !form.room || !form.cabinet) {
      setLocHierarchy((prev) => ({ ...prev, shelves: [] }));
      return;
    }
    api
      .get('/locations/hierarchy', {
        params: { building: form.building, room: form.room, cabinet: form.cabinet },
      })
      .then(({ data }) => setLocHierarchy((prev) => ({ ...prev, shelves: data.shelves || [] })));
  }, [form.building, form.room, form.cabinet]);

  useEffect(() => {
    if (form.building && form.room && form.cabinet && form.shelf) {
      const targetLoc = `${form.building}-${form.room}-${form.cabinet}-${form.shelf}`;
      api
        .get(`/safety/check-incompatibility/${encodeURIComponent(targetLoc)}`, {
          params: { chemicalId: initialData?.id },
        })
        .then(({ data }) => setIncompatibilityWarning(data.incompatible ? data : null))
        .catch(() => setIncompatibilityWarning(null));
    } else {
      setIncompatibilityWarning(null);
    }
  }, [form.building, form.room, form.cabinet, form.shelf, initialData?.id]);

  useEffect(() => {
    const total = (Number(form.num_containers) || 0) * (Number(form.quantity_per_container) || 0);
    if (total > 0) {
      setForm((f) => (f.quantity === total ? f : { ...f, quantity: total }));
    }
  }, [form.num_containers, form.quantity_per_container]);

  const combinedLocation = form.building
    ? `${form.building}-${form.room}-${form.cabinet}-${form.shelf}`.replace(/-+$/, '')
    : form.location;

  const toggleGhs = (id: string) => {
    const list: string[] = form.ghs_classes || [];
    patch(
      'ghs_classes',
      list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
    );
  };

  const toggleList = (key: string, value: string) => {
    const list: string[] = form[key] || [];
    patch(key, list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const validateCas = (val: string) => /^\d{2,7}-\d{2}-\d$/.test(val);

  const buildPayload = useCallback(() => {
    const payload = new FormData();
    const jsonKeys = [
      'ghs_classes',
      'exposure_risks',
      'ghs_hazards',
      'nfpa_rating',
      'ppe_requirements',
    ];
    const skipKeys = new Set([
      // File metadata is set by multer from the uploaded file; don't send stale URLs as text
      'sds_file_url',
      'disposal_file_url',
    ]);
    const dateKeys = new Set(['manufacturing_date', 'purchase_date', 'expiry_date']);

    Object.keys(form).forEach((k) => {
      if (skipKeys.has(k)) return;
      const val = form[k];
      if (val === undefined || val === null) return;
      if (dateKeys.has(k) && val === '') return;
      if (jsonKeys.includes(k)) {
        payload.append(k, JSON.stringify(val));
        return;
      }
      if (typeof val === 'boolean') {
        payload.append(k, val ? 'true' : 'false');
        return;
      }
      payload.append(k, String(val));
    });

    const appendFile = (field: string, file: PickedDoc) => {
      // Expo web provides a real File via uri fetch; native uses { uri, name, type }
      payload.append(field, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      } as any);
    };

    if (sdsFile) {
      appendFile('sds_file', sdsFile);
      payload.append('sds_attached', 'true');
    }
    if (disposalFile) {
      appendFile('disposal_file', disposalFile);
    }
    return payload;
  }, [form, sdsFile, disposalFile]);

  const pickDocument = async (kind: 'sds' | 'disposal') => {
    if (readOnly) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const name = asset.name || `${kind}.pdf`;
      const mimeType =
        asset.mimeType ||
        (name.toLowerCase().endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : name.toLowerCase().endsWith('.doc')
            ? 'application/msword'
            : 'application/pdf');
      const doc: PickedDoc = { uri: asset.uri, name, mimeType };
      if (kind === 'sds') {
        setSdsFile(doc);
        patch('sds_file_name', name);
        patch('sds_attached', true);
      } else {
        setDisposalFile(doc);
        patch('disposal_file_name', name);
      }
    } catch {
      await dialog.alert('Upload failed', 'Could not open the document picker.');
    }
  };

  const openStoredFile = async (url?: string) => {
    const resolved = resolveAssetUrl(url);
    if (!resolved) return;
    try {
      await Linking.openURL(resolved);
    } catch {
      await dialog.alert('Open failed', 'Could not open the stored document.');
    }
  };

  const save = async () => {
    if (!canSave || readOnly) return;
    if (!form.name.trim()) {
      setMsg('Name is required.');
      return;
    }
    if (form.cas_number && !validateCas(form.cas_number)) {
      setErrors({ cas_number: 'Invalid CAS format (e.g. 67-64-1)' });
      return;
    }
    if (!form.expiry_date) {
      setMsg('Expiry date is required.');
      return;
    }

    setSaving(true);
    setMsg('');
    try {
      const payload = buildPayload();
      const res = isEdit
        ? await api.put(`/chemicals/${initialData.id}`, payload)
        : await api.post('/chemicals', payload);

      if (res.data.safety_warnings?.length) {
        await dialog.alert(
          'Critical storage incompatibility',
          res.data.safety_warnings.join('\n\n') +
            '\n\nReview physical inventory placement immediately.'
        );
      }
      navigation.goBack();
    } catch (e: any) {
      setMsg(e.response?.data?.error || e.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const LocSelect = ({
    label,
    value,
    options,
    onChange,
    fallback,
  }: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
    fallback?: boolean;
  }) =>
    options.length && !fallback ? (
      <View style={styles.selectWrap}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['', ...options].map((opt) => (
            <Pressable
              key={`${label}-${opt || 'empty'}`}
              onPress={() => onChange(opt)}
              style={[styles.chip, value === opt && styles.chipOn]}
            >
              <Text style={[styles.chipText, value === opt && styles.chipTextOn]}>
                {opt || '-- Select --'}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    ) : (
      <>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Input value={value} onChangeText={onChange} />
      </>
    );

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <Title>{isEdit ? 'Edit Lifecycle' : 'Enroll Asset'}</Title>
        <Subtitle>
          {isEdit ? `Updating records for ${initialData.id}` : 'Systemize a new chemical into the repository.'}
        </Subtitle>

        {isEdit ? (
          <Card>
            <Text style={styles.idBadge}>CIMS-{initialData.id}</Text>
            <Text style={styles.hint}>QR label printing is available on the web portal.</Text>
          </Card>
        ) : null}

        <Card>
          <SectionLabel>Global hazard classification</SectionLabel>
          <View style={styles.ghsGrid}>
            {HAZARD_CLASSES.map((h) => {
              const on = (form.ghs_classes || []).includes(h.id);
              return (
                <Pressable key={h.id} onPress={() => !readOnly && toggleGhs(h.id)} style={[styles.ghsBtn, on && styles.ghsBtnOn]}>
                  <Text style={[styles.ghsBtnText, on && styles.chipTextOn]}>{h.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {(form.ghs_classes || []).length ? (
            <View style={{ marginTop: 10 }}>
              <HazardBadges hazards={form.ghs_classes} />
            </View>
          ) : null}
        </Card>

        <Card>
          <SectionLabel>Nomenclature & identity</SectionLabel>
          <Input placeholder="Common name *" value={form.name} onChangeText={(v) => patch('name', v)} editable={!readOnly} />
          <Input
            placeholder="CAS registry number *"
            value={form.cas_number}
            onChangeText={(v) => {
              patch('cas_number', v);
              if (v && !validateCas(v)) setErrors({ cas_number: 'Invalid CAS format' });
              else setErrors({});
            }}
            autoCapitalize="none"
            editable={!readOnly}
          />
          {errors.cas_number ? <Text style={styles.error}>{errors.cas_number}</Text> : null}
          <Input placeholder="IUPAC name" value={form.iupac_name} onChangeText={(v) => patch('iupac_name', v)} editable={!readOnly} />
          <Input placeholder="Formula" value={form.formula} onChangeText={(v) => patch('formula', v)} editable={!readOnly} />
        </Card>

        <Card>
          <SectionLabel>Physicality & containers</SectionLabel>
          <Text style={styles.fieldLabel}>State</Text>
          <View style={styles.chipRow}>
            {['Liquid', 'Solid', 'Gas'].map((s) => (
              <Pressable key={s} onPress={() => !readOnly && patch('state', s)} style={[styles.chip, form.state === s && styles.chipOn]}>
                <Text style={[styles.chipText, form.state === s && styles.chipTextOn]}>{s}</Text>
              </Pressable>
            ))}
          </View>
          <Input placeholder="Unit" value={String(form.unit)} onChangeText={(v) => patch('unit', v)} editable={!readOnly} />
          <Input placeholder="Total quantity" value={String(form.quantity)} onChangeText={(v) => patch('quantity', v)} keyboardType="decimal-pad" editable={!readOnly} />
          <Input placeholder="Purity" value={form.purity} onChangeText={(v) => patch('purity', v)} editable={!readOnly} />
          <Input placeholder="Alert threshold" value={String(form.threshold)} onChangeText={(v) => patch('threshold', v)} keyboardType="decimal-pad" editable={!readOnly} />
          <Input placeholder="Container count" value={String(form.num_containers)} onChangeText={(v) => patch('num_containers', v)} keyboardType="number-pad" editable={!readOnly} />
          <Input placeholder="Qty per container" value={String(form.quantity_per_container)} onChangeText={(v) => patch('quantity_per_container', v)} keyboardType="decimal-pad" editable={!readOnly} />
          <Input placeholder="Container type" value={form.container_type} onChangeText={(v) => patch('container_type', v)} editable={!readOnly} />
          <Input placeholder="Container ID series" value={form.container_id_series} onChangeText={(v) => patch('container_id_series', v)} editable={!readOnly} />
          <EnrollBarcodeScanner
            value={String(form.barcode || '')}
            onChange={(code) => patch('barcode', code)}
            editable={!readOnly}
          />
        </Card>

        <Card>
          <SectionLabel>Facility & storage</SectionLabel>
          <LocSelect
            label="Building"
            value={form.building}
            options={locHierarchy.buildings}
            onChange={(v) => {
              patch('building', v);
              patch('room', '');
              patch('cabinet', '');
              patch('shelf', '');
            }}
          />
          <LocSelect label="Room" value={form.room} options={locHierarchy.rooms} onChange={(v) => { patch('room', v); patch('cabinet', ''); patch('shelf', ''); }} fallback={!locHierarchy.rooms.length} />
          <LocSelect label="Cabinet" value={form.cabinet} options={locHierarchy.cabinets} onChange={(v) => { patch('cabinet', v); patch('shelf', ''); }} fallback={!locHierarchy.cabinets.length} />
          {locHierarchy.shelves.length ? (
            <View style={styles.selectWrap}>
              <Text style={styles.fieldLabel}>Shelf</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {['', ...locHierarchy.shelves.map((s: any) => s.shelf)].map((opt) => (
                  <Pressable key={String(opt)} onPress={() => patch('shelf', opt)} style={[styles.chip, form.shelf === opt && styles.chipOn]}>
                    <Text style={[styles.chipText, form.shelf === opt && styles.chipTextOn]}>
                      {opt ? `Shelf ${opt}` : '-- Select --'}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : (
            <>
              <Text style={styles.fieldLabel}>Shelf</Text>
              <Input value={form.shelf} onChangeText={(v) => patch('shelf', v)} editable={!readOnly} />
            </>
          )}
          {incompatibilityWarning ? (
            <View style={styles.warnBox}>
              <Text style={styles.warnTitle}>Incompatible storage conflict</Text>
              <Text style={styles.warnBody}>
                Shelf contains {incompatibilityWarning.conflicting_chemical}. Storing here is dangerous.
              </Text>
            </View>
          ) : null}
          <Text style={styles.fieldLabel}>Combined identifier (auto)</Text>
          <Input value={combinedLocation} editable={false} />
          <Input placeholder="Storage temp (°C)" value={String(form.storage_temp)} onChangeText={(v) => patch('storage_temp', v)} keyboardType="decimal-pad" editable={!readOnly} />
          <Input placeholder="Humidity (%)" value={String(form.storage_humidity)} onChangeText={(v) => patch('storage_humidity', v)} keyboardType="decimal-pad" editable={!readOnly} />
        </Card>

        <Card>
          <SectionLabel>Procurement & traceability</SectionLabel>
          <Input placeholder="Vendor name" value={form.supplier} onChangeText={(v) => patch('supplier', v)} editable={!readOnly} />
          <Input placeholder="Lot / batch number" value={form.batch_number} onChangeText={(v) => patch('batch_number', v)} editable={!readOnly} />
          <DateField
            label="Purchase date"
            value={String(form.purchase_date || '')}
            onChange={(v) => patch('purchase_date', v)}
            editable={!readOnly}
          />
          <DateField
            label="Manufacturing date"
            value={String(form.manufacturing_date || '')}
            onChange={(v) => patch('manufacturing_date', v)}
            editable={!readOnly}
          />
          <DateField
            label="Expiry date"
            value={String(form.expiry_date || '')}
            onChange={(v) => patch('expiry_date', v)}
            editable={!readOnly}
            required
          />
          <Input placeholder="Safety remarks" value={form.remarks} onChangeText={(v) => patch('remarks', v)} multiline editable={!readOnly} />
        </Card>

        <Card>
          <SectionLabel>Critical safety & hazard directives</SectionLabel>
          <Text style={styles.fieldLabel}>GHS signal word</Text>
          <View style={styles.chipRow}>
            {['None', 'Warning', 'Danger'].map((w) => (
              <Pressable
                key={w}
                onPress={() => !readOnly && patch('ghs_hazards', { ...form.ghs_hazards, signal_word: w })}
                style={[styles.chip, form.ghs_hazards?.signal_word === w && styles.chipOn]}
              >
                <Text style={[styles.chipText, form.ghs_hazards?.signal_word === w && styles.chipTextOn]}>{w}</Text>
              </Pressable>
            ))}
          </View>
          <Input
            placeholder="H-codes (comma separated)"
            value={(form.ghs_hazards?.h_codes || []).join(', ')}
            onChangeText={(v) =>
              patch('ghs_hazards', {
                ...form.ghs_hazards,
                h_codes: v.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            editable={!readOnly}
          />
          <Input
            placeholder="P-codes (comma separated)"
            value={(form.ghs_hazards?.p_codes || []).join(', ')}
            onChangeText={(v) =>
              patch('ghs_hazards', {
                ...form.ghs_hazards,
                p_codes: v.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            editable={!readOnly}
          />

          <Text style={styles.fieldLabel}>NFPA 704 ratings</Text>
          {NFPA_RATINGS.map((rating) =>
            rating.key === 'special' ? (
              <Input
                key={rating.label}
                placeholder={`NFPA ${rating.label}`}
                value={form.nfpa_rating?.special || ''}
                onChangeText={(v) => patch('nfpa_rating', { ...form.nfpa_rating, special: v })}
                editable={!readOnly}
              />
            ) : (
              <Input
                key={rating.label}
                placeholder={`${rating.label} (0-4)`}
                value={String(form.nfpa_rating?.[rating.key] ?? 0)}
                onChangeText={(v) =>
                  patch('nfpa_rating', { ...form.nfpa_rating, [rating.key]: Number(v) || 0 })
                }
                keyboardType="number-pad"
                editable={!readOnly}
              />
            )
          )}

          <Text style={styles.fieldLabel}>Mandatory PPE</Text>
          <View style={styles.chipRow}>
            {PPE_OPTIONS.map((ppe) => {
              const on = (form.ppe_requirements || []).includes(ppe);
              return (
                <Pressable key={ppe} onPress={() => !readOnly && toggleList('ppe_requirements', ppe)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{ppe}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Restricted access</Text>
            <Switch value={form.restricted_access} onValueChange={(v) => patch('restricted_access', v)} disabled={readOnly} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Safety training required</Text>
            <Switch value={form.training_required} onValueChange={(v) => patch('training_required', v)} disabled={readOnly} />
          </View>

          <Text style={styles.fieldLabel}>Exposure risks</Text>
          <View style={styles.chipRow}>
            {EXPOSURE_RISK_TAGS.map((risk) => {
              const on = (form.exposure_risks || []).includes(risk);
              return (
                <Pressable key={risk} onPress={() => !readOnly && toggleList('exposure_risks', risk)} style={[styles.chip, on && styles.chipOn]}>
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{risk}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.fieldLabel}>Chemical family</Text>
          <View style={styles.chipRow}>
            {CHEMICAL_FAMILIES.map((fam) => (
              <Pressable key={fam} onPress={() => !readOnly && patch('chemical_family', fam)} style={[styles.chip, form.chemical_family === fam && styles.chipOn]}>
                <Text style={[styles.chipText, form.chemical_family === fam && styles.chipTextOn]}>{fam}</Text>
              </Pressable>
            ))}
          </View>

          <Input placeholder="Emergency spill procedures" value={form.spill_instructions} onChangeText={(v) => patch('spill_instructions', v)} multiline editable={!readOnly} />
          <Input placeholder="Medical emergency instructions" value={form.emergency_instructions} onChangeText={(v) => patch('emergency_instructions', v)} multiline editable={!readOnly} />
        </Card>

        <Card>
          <SectionLabel>Documents</SectionLabel>
          <View style={styles.uploadRow}>
            <Pressable
              onPress={() => void pickDocument('sds')}
              disabled={readOnly}
              style={[
                styles.uploadBox,
                (sdsFile || form.sds_file_name) && styles.uploadBoxActive,
                readOnly && { opacity: 0.55 },
              ]}
            >
              <Ionicons
                name="cloud-upload-outline"
                size={22}
                color={(sdsFile || form.sds_file_name) ? colors.accent : colors.muted}
              />
              <Text
                style={[styles.uploadText, (sdsFile || form.sds_file_name) && styles.uploadTextActive]}
                numberOfLines={2}
              >
                {sdsFile
                  ? sdsFile.name
                  : form.sds_file_name
                    ? `Stored: ${form.sds_file_name}`
                    : 'Attach SDS file (.pdf)'}
              </Text>
            </Pressable>

            <Pressable
              onPress={() => void pickDocument('disposal')}
              disabled={readOnly}
              style={[
                styles.uploadBox,
                styles.uploadBoxDisposal,
                (disposalFile || form.disposal_file_name) && styles.uploadBoxDisposalActive,
                readOnly && { opacity: 0.55 },
              ]}
            >
              <Ionicons
                name="trash-outline"
                size={22}
                color={(disposalFile || form.disposal_file_name) ? colors.danger : '#f87171'}
              />
              <Text
                style={[
                  styles.uploadText,
                  styles.uploadTextDisposal,
                  (disposalFile || form.disposal_file_name) && { color: colors.danger },
                ]}
                numberOfLines={2}
              >
                {disposalFile
                  ? disposalFile.name
                  : form.disposal_file_name
                    ? `Protocol: ${form.disposal_file_name}`
                    : 'Disposal protocol (.pdf)'}
              </Text>
            </Pressable>
          </View>

          {form.sds_file_url && !sdsFile ? (
            <Pressable onPress={() => void openStoredFile(form.sds_file_url)} style={styles.viewLink}>
              <Ionicons name="eye-outline" size={16} color={colors.accent} />
              <Text style={styles.viewLinkText}>View stored SDS</Text>
            </Pressable>
          ) : null}
          {form.disposal_file_url && !disposalFile ? (
            <Pressable onPress={() => void openStoredFile(form.disposal_file_url)} style={styles.viewLink}>
              <Ionicons name="eye-outline" size={16} color={colors.danger} />
              <Text style={[styles.viewLinkText, { color: colors.danger }]}>View disposal protocol</Text>
            </Pressable>
          ) : null}
        </Card>

        {msg ? <Text style={styles.error}>{msg}</Text> : null}

        {canSave && !readOnly ? (
          <Button
            label={isEdit ? 'Apply lifecycle update' : 'Authorize system entry'}
            onPress={() => void save()}
            loading={saving}
          />
        ) : null}
        <Button label="Cancel" variant="ghost" onPress={() => navigation.goBack()} />
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    idBadge: { color: colors.accent, fontWeight: '900', fontSize: 18 },
    hint: { color: colors.muted, fontSize: 12, marginTop: 6 },
    fieldLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      marginBottom: 6,
      marginTop: 4,
    },
    ghsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    ghsBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
      backgroundColor: colors.surface2,
    },
    ghsBtnOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    ghsBtnText: { color: colors.text, fontSize: 11, fontWeight: '700' },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    chip: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 7,
      backgroundColor: colors.surface,
    },
    chipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
    chipText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    chipTextOn: { color: colors.btnText },
    selectWrap: { marginBottom: 8 },
    uploadRow: { flexDirection: 'row', gap: 10 },
    uploadBox: {
      flex: 1,
      minHeight: 96,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.border,
      borderRadius: 14,
      padding: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.surface2,
    },
    uploadBoxActive: {
      borderColor: colors.accent,
      backgroundColor: `${colors.accent}18`,
    },
    uploadBoxDisposal: {
      borderColor: '#7f1d1d',
    },
    uploadBoxDisposalActive: {
      borderColor: colors.danger,
      backgroundColor: `${colors.danger}14`,
    },
    uploadText: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textAlign: 'center',
      textTransform: 'uppercase',
    },
    uploadTextActive: { color: colors.accent },
    uploadTextDisposal: { color: '#f87171' },
    viewLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 10,
    },
    viewLinkText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    warnBox: {
      borderWidth: 1,
      borderColor: colors.danger,
      borderRadius: 12,
      padding: 12,
      marginVertical: 8,
      backgroundColor: colors.surface2,
    },
    warnTitle: { color: colors.danger, fontWeight: '900' },
    warnBody: { color: colors.text, marginTop: 4, fontSize: 13 },
    switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginVertical: 6 },
    switchLabel: { color: colors.text, fontWeight: '600', flex: 1, marginRight: 12 },
    error: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
  });
}
