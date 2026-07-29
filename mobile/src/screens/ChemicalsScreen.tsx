import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { FILTER_HAZARD_LEVELS, STATUS_FILTERS } from '../constants/hazards';
import ChemicalHistoryModal from '../components/chemicals/ChemicalHistoryModal';
import FIFOUsageModal from '../components/chemicals/FIFOUsageModal';
import HazardBadges from '../components/chemicals/HazardBadges';
import { asList, toneForStatus } from '../utils/apiHelpers';
import { fmtQty } from '../utils/formatQuantity';
import type { Chemical } from '../types';
import type { ThemeColors } from '../theme/colors';
import { Badge, Button, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';

const PAGE_SIZE = 10;

interface Filters {
  hazard: string[];
  status: string[];
  building: string;
  room: string;
  expiryStatus: string;
}

export default function ChemicalsScreen() {
  const navigation = useNavigation<any>();
  const { hasPermission } = useAuth();
  const dialog = useDialog();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [items, setItems] = useState<Chemical[]>([]);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Filters>({
    hazard: [],
    status: [],
    building: '',
    room: '',
    expiryStatus: '',
  });
  const [buildings, setBuildings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [historyChemical, setHistoryChemical] = useState<Chemical | null>(null);
  const [fifoChemical, setFifoChemical] = useState<Chemical | null>(null);

  const canCreate = hasPermission('create_chemical');
  const canEdit = hasPermission('edit_chemical');
  const canDelete = hasPermission('delete_chemical');

  useEffect(() => {
    api.get('/locations/hierarchy').then(({ data }) => setBuildings(data.buildings || [])).catch(() => {});
  }, []);

  const fetchChemicals = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const { data } = await api.get('/chemicals', {
          params: {
            page,
            limit: PAGE_SIZE,
            search,
            hazard: filters.hazard,
            status: filters.status,
            building: filters.building,
            room: filters.room,
            expiryStatus: filters.expiryStatus,
            archived: showArchived,
          },
        });
        setItems(asList(data, ['data']));
        setPagination({
          page: data.page || page,
          total: data.total || 0,
          totalPages: data.totalPages || 0,
        });
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [search, filters, showArchived]
  );

  useEffect(() => {
    const t = setTimeout(() => void fetchChemicals(1), 400);
    return () => clearTimeout(t);
  }, [fetchChemicals]);

  useFocusEffect(
    useCallback(() => {
      void fetchChemicals(pagination.page);
    }, [fetchChemicals, pagination.page])
  );

  useEffect(() => {
    if (search.startsWith('CIMS:')) {
      try {
        const parts = search.split('|');
        const idPart = parts[0];
        const extractedId = idPart.split(':')[1];
        if (extractedId) setSearch(extractedId);
      } catch {
        /* ignore scanner parse errors */
      }
    }
  }, [search]);

  const toggleFilterList = (key: 'hazard' | 'status', value: string) => {
    setFilters((f) => {
      const list = f[key];
      return {
        ...f,
        [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value],
      };
    });
  };

  const clearFilters = () => {
    setSearch('');
    setFilters({ hazard: [], status: [], building: '', room: '', expiryStatus: '' });
  };

  const toggleArchive = async (item: Chemical) => {
    const archived = Boolean((item as any).archived);
    const ok = await dialog.confirm({
      title: archived ? 'Restore chemical?' : 'Archive chemical?',
      message: archived
        ? 'Restore this chemical to active inventory?'
        : 'Archive this chemical for compliance? (Soft delete)',
      confirmLabel: archived ? 'Restore' : 'Archive',
      danger: !archived,
    });
    if (!ok) return;
    try {
      if (archived) await api.put(`/chemicals/${item.id}/restore`);
      else await api.delete(`/chemicals/${item.id}`);
      await fetchChemicals(pagination.page);
    } catch {
      await dialog.alert('Error', 'Error updating chemical state.');
    }
  };

  const activeFilterCount =
    filters.hazard.length +
    filters.status.length +
    (filters.building ? 1 : 0) +
    (filters.room ? 1 : 0) +
    (filters.expiryStatus ? 1 : 0);

  const renderItem = ({ item }: { item: Chemical }) => (
    <View style={styles.row}>
      <Pressable
        style={{ flex: 1 }}
        onPress={() => navigation.navigate('ChemicalDetail', { id: item.id || item._id })}
      >
        <View style={styles.idBadge}>
          <Text style={styles.idBadgeText}>{item.id}</Text>
        </View>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.metaRow}>
          {item.cas_number ? <Text style={styles.metaChip}>CAS: {item.cas_number}</Text> : null}
          {item.formula ? <Text style={styles.metaChip}>{item.formula}</Text> : null}
        </View>
        <View style={styles.statusRow}>
          <Badge label={item.status || 'Unknown'} tone={toneForStatus(item.status)} />
          <HazardBadges hazards={(item as any).ghs_classes} showLabels={false} />
        </View>
        <Text style={styles.meta}>
          [{item.location || '—'}] · {fmtQty(item.quantity, item.unit)}
          {(item as any).batch_number ? ` · Batch: ${(item as any).batch_number}` : ''}
        </Text>
      </Pressable>

      <View style={styles.actions}>
        {hasPermission('update_stock') ? (
          <ActionBtn label="FIFO" onPress={() => setFifoChemical(item)} color={colors.accent} />
        ) : null}
        {hasPermission('submit_request') ? (
          <ActionBtn
            label="Req"
            onPress={() => navigation.navigate('Requests', { chemical_id: (item as any)._id || item.id })}
            color="#8b5cf6"
          />
        ) : null}
        {canEdit ? (
          <ActionBtn
            label="Edit"
            onPress={() => navigation.navigate('ChemicalForm', { chemical: item })}
            color={colors.warn}
          />
        ) : null}
        <ActionBtn label="Hist" onPress={() => setHistoryChemical(item)} color={colors.muted} />
        <ActionBtn
          label="View"
          onPress={() => navigation.navigate('ChemicalDetail', { id: item.id || item._id })}
          color={colors.success}
        />
        {canDelete ? (
          <ActionBtn
            label={(item as any).archived ? 'Restore' : 'Archive'}
            onPress={() => toggleArchive(item)}
            color={colors.danger}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Title>Chemical Repository</Title>
          <Subtitle>Precision search & lifecycle management</Subtitle>
        </View>
        <View style={styles.headerActions}>
          {canDelete ? (
            <Pressable
              style={[styles.archiveToggle, showArchived && styles.archiveToggleOn]}
              onPress={() => setShowArchived((v) => !v)}
            >
              <Text style={[styles.archiveText, showArchived && styles.archiveTextOn]}>
                {showArchived ? 'Active' : 'Archive'}
              </Text>
            </Pressable>
          ) : null}
          {canCreate ? (
            <Pressable
              style={styles.enrollBtn}
              onPress={() => navigation.navigate('ChemicalForm', {})}
            >
              <Text style={styles.enrollText}>+ Enroll</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <Input
        placeholder="Deep search by Name, CAS, or Barcode/ID…"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />

      <Pressable style={styles.filterToggle} onPress={() => setFiltersOpen((v) => !v)}>
        <Text style={styles.filterToggleText}>
          Filters{activeFilterCount ? ` (${activeFilterCount})` : ''} {filtersOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {filtersOpen ? (
        <ScrollView style={styles.filterPanel} nestedScrollEnabled>
          <Text style={styles.filterLabel}>Hazard classes</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {FILTER_HAZARD_LEVELS.map((h) => {
              const on = filters.hazard.includes(h);
              return (
                <Pressable
                  key={h}
                  onPress={() => toggleFilterList('hazard', h)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{h}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Inventory status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {STATUS_FILTERS.map((s) => {
              const on = filters.status.includes(s);
              return (
                <Pressable
                  key={s}
                  onPress={() => toggleFilterList('status', s)}
                  style={[styles.chip, on && styles.chipOn]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.filterLabel}>Building</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            <Pressable
              onPress={() => setFilters((f) => ({ ...f, building: '' }))}
              style={[styles.chip, !filters.building && styles.chipOn]}
            >
              <Text style={[styles.chipText, !filters.building && styles.chipTextOn]}>All</Text>
            </Pressable>
            {buildings.map((b) => (
              <Pressable
                key={b}
                onPress={() => setFilters((f) => ({ ...f, building: b }))}
                style={[styles.chip, filters.building === b && styles.chipOn]}
              >
                <Text style={[styles.chipText, filters.building === b && styles.chipTextOn]}>{b}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.filterLabel}>Room</Text>
          <Input
            placeholder="e.g. 101"
            value={filters.room}
            onChangeText={(v) => setFilters((f) => ({ ...f, room: v }))}
            autoCapitalize="none"
          />

          <Text style={styles.filterLabel}>Expiry status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
            {['', 'Near Expiry', 'Expired'].map((e) => (
              <Pressable
                key={e || 'all'}
                onPress={() => setFilters((f) => ({ ...f, expiryStatus: e }))}
                style={[styles.chip, filters.expiryStatus === e && styles.chipOn]}
              >
                <Text style={[styles.chipText, filters.expiryStatus === e && styles.chipTextOn]}>
                  {e || 'All'}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Button label="Clear all filters" variant="ghost" onPress={clearFilters} />
        </ScrollView>
      ) : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item._id || item.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => fetchChemicals(pagination.page)} tintColor={colors.accent} />}
        ListEmptyComponent={
          !loading ? (
            <EmptyState title="No chemicals found" body="Try adjusting your filters or search terms." />
          ) : null
        }
        contentContainerStyle={{ paddingBottom: 32 }}
        renderItem={renderItem}
        ListFooterComponent={
          pagination.totalPages > 1 ? (
            <View style={styles.pagination}>
              <Text style={styles.pageInfo}>
                Showing {(pagination.page - 1) * PAGE_SIZE + 1}–
                {Math.min(pagination.page * PAGE_SIZE, pagination.total)} of {pagination.total}
              </Text>
              <View style={styles.pageBtns}>
                <Button
                  label="Prev"
                  variant="ghost"
                  disabled={pagination.page <= 1}
                  onPress={() => void fetchChemicals(pagination.page - 1)}
                />
                <Text style={styles.pageNum}>
                  {pagination.page} / {pagination.totalPages}
                </Text>
                <Button
                  label="Next"
                  variant="ghost"
                  disabled={pagination.page >= pagination.totalPages}
                  onPress={() => void fetchChemicals(pagination.page + 1)}
                />
              </View>
            </View>
          ) : null
        }
      />

      {historyChemical ? (
        <ChemicalHistoryModal
          chemical={{ id: historyChemical.id, name: historyChemical.name }}
          visible={Boolean(historyChemical)}
          onClose={() => setHistoryChemical(null)}
        />
      ) : null}

      {fifoChemical ? (
        <FIFOUsageModal
          chemical={fifoChemical}
          visible={Boolean(fifoChemical)}
          onClose={() => setFifoChemical(null)}
          onSuccess={() => void fetchChemicals(pagination.page)}
        />
      ) : null}
    </Screen>
  );
}

function ActionBtn({ label, onPress, color }: { label: string; onPress: () => void; color: string }) {
  return (
    <Pressable onPress={onPress} style={[actionStyles.btn, { borderColor: color }]}>
      <Text style={[actionStyles.text, { color }]}>{label}</Text>
    </Pressable>
  );
}

const actionStyles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    minWidth: 44,
    alignItems: 'center',
  },
  text: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase' },
});

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 4 },
    headerActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
    enrollBtn: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    enrollText: { color: colors.btnText, fontWeight: '900', fontSize: 12 },
    archiveToggle: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      backgroundColor: colors.surface,
    },
    archiveToggleOn: { borderColor: colors.warn, backgroundColor: colors.surface2 },
    archiveText: { color: colors.muted, fontWeight: '800', fontSize: 11 },
    archiveTextOn: { color: colors.warn },
    filterToggle: {
      marginBottom: 8,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    filterToggleText: { color: colors.text, fontWeight: '800', fontSize: 12 },
    filterPanel: { maxHeight: 280, marginBottom: 8 },
    filterLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 4,
    },
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
    },
    idBadge: {
      alignSelf: 'flex-start',
      backgroundColor: colors.surface2,
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginBottom: 6,
    },
    idBadgeText: { color: colors.accent, fontWeight: '900', fontSize: 11 },
    name: { fontWeight: '800', fontSize: 16, color: colors.text },
    metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
    metaChip: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.muted,
      backgroundColor: colors.surface2,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
    },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' },
    meta: { fontSize: 12, marginTop: 6, color: colors.muted },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
    pagination: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border },
    pageInfo: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: 8 },
    pageBtns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    pageNum: { color: colors.text, fontWeight: '800' },
  });
}
