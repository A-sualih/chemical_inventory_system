import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';
import { Button, Card, EmptyState, Input, Screen, Subtitle, Title } from '../components/ui';

type ModalType = 'block' | 'room' | 'cabinet' | 'shelf' | null;

type ShelfNode = {
  _id: string;
  name: string;
  current_load?: number;
  capacity_limit?: number;
};

type CabinetNode = {
  _id: string;
  name: string;
  children?: ShelfNode[];
};

type RoomNode = {
  _id: string;
  name: string;
  children?: CabinetNode[];
};

type BlockNode = {
  _id: string;
  name: string;
  children?: RoomNode[];
};

function getCapacityStyle(load: number, cap: number, colors: ThemeColors) {
  const pct = cap > 0 ? (load / cap) * 100 : 0;
  if (pct >= 90) return { bg: `${colors.danger}18`, text: colors.danger, bar: colors.danger };
  if (pct >= 70) return { bg: `${colors.warn}18`, text: colors.warn, bar: colors.warn };
  return { bg: `${colors.success}18`, text: colors.success, bar: colors.success };
}

export default function LocationsScreen() {
  const { hasPermission } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [hierarchy, setHierarchy] = useState<BlockNode[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [modalType, setModalType] = useState<ModalType>(null);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [shelfCapacity, setShelfCapacity] = useState('50');
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const canCreate = hasPermission('manage_locations');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/locations/hierarchy/full');
      setHierarchy(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setHierarchy([]);
      setError(e.response?.data?.error || 'Failed to load hierarchical locations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const openModal = (type: ModalType, parentId: string | null = null) => {
    setModalType(type);
    setTargetId(parentId);
    setBulkInput('');
    setShelfCapacity('50');
    setModalError('');
  };

  const handleBulkCreate = async () => {
    const names = bulkInput
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean);
    if (!names.length) {
      setModalError('Please enter at least one name.');
      return;
    }

    setSaving(true);
    setModalError('');
    try {
      if (modalType === 'block') {
        for (const name of names) {
          await api.post('/locations/blocks', { name });
        }
      } else if (modalType === 'room' && targetId) {
        await api.post('/locations/rooms/bulk', {
          blockId: targetId,
          rooms: names.map((name) => ({ name })),
        });
      } else if (modalType === 'cabinet' && targetId) {
        await api.post('/locations/cabinets/bulk', {
          roomId: targetId,
          cabinets: names.map((name) => ({ name })),
        });
      } else if (modalType === 'shelf' && targetId) {
        const capacity = parseInt(shelfCapacity, 10) || 50;
        await api.post('/locations/shelves/bulk', {
          cabinetId: targetId,
          shelves: names.map((name) => ({ name, capacity_limit: capacity })),
        });
      }
      setModalType(null);
      setSuccess(`${modalType!.charAt(0).toUpperCase()}${modalType!.slice(1)}s created successfully.`);
      setTimeout(() => setSuccess(''), 3000);
      await load();
    } catch (e: any) {
      setModalError(e.response?.data?.error || 'Failed to create items.');
    } finally {
      setSaving(false);
    }
  };

  const modalTitle =
    modalType === 'shelf'
      ? 'Add Shelves'
      : modalType
        ? `Bulk Add ${modalType.charAt(0).toUpperCase()}${modalType.slice(1)}s`
        : '';

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Title>Hierarchical Storage</Title>
          <Subtitle>Manage Building (Block) → Room → Cabinet → Shelf Hierarchy</Subtitle>
        </View>
        {canCreate ? (
          <Pressable style={styles.addBtn} onPress={() => openModal('block')}>
            <Text style={styles.addText}>+ Add Block</Text>
          </Pressable>
        ) : null}
      </View>

      {success ? <Text style={styles.success}>{success}</Text> : null}
      {error && !modalType ? <Text style={styles.error}>{error}</Text> : null}

      <ScrollView
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {hierarchy.length === 0 && !loading ? (
          <EmptyState
            title="No Blocks Configured"
            body="Begin by adding your first building block."
          />
        ) : (
          hierarchy.map((block) => (
            <Card key={block._id} style={{ marginBottom: 10 }}>
              <View style={styles.treeRow}>
                <Pressable style={styles.treeMain} onPress={() => toggle(block._id)}>
                  <Text style={styles.expand}>{expanded[block._id] ? '▼' : '▶'}</Text>
                  <Ionicons name="business-outline" size={16} color={colors.accent} />
                  <Text style={styles.itemName}>{block.name}</Text>
                </Pressable>
                {canCreate ? (
                  <Pressable style={styles.treeAddBtn} onPress={() => openModal('room', block._id)}>
                    <Text style={styles.treeAddText}>+ Add Room</Text>
                  </Pressable>
                ) : null}
              </View>

              {expanded[block._id] ? (
                <View style={styles.children}>
                  {!block.children?.length ? (
                    <Text style={styles.emptyChild}>No rooms</Text>
                  ) : (
                    block.children.map((room) => (
                      <View key={room._id} style={styles.nested}>
                        <View style={styles.treeRow}>
                          <Pressable style={styles.treeMain} onPress={() => toggle(room._id)}>
                            <Text style={styles.expand}>{expanded[room._id] ? '▼' : '▶'}</Text>
                            <Ionicons name="enter-outline" size={16} color={colors.accent} />
                            <Text style={styles.itemName}>{room.name}</Text>
                          </Pressable>
                          {canCreate ? (
                            <Pressable style={styles.treeAddBtn} onPress={() => openModal('cabinet', room._id)}>
                              <Text style={styles.treeAddText}>+ Add Cabinet</Text>
                            </Pressable>
                          ) : null}
                        </View>

                        {expanded[room._id] ? (
                          <View style={styles.children}>
                            {!room.children?.length ? (
                              <Text style={styles.emptyChild}>No cabinets</Text>
                            ) : (
                              room.children.map((cabinet) => (
                                <View key={cabinet._id} style={styles.nested}>
                                  <View style={styles.treeRow}>
                                    <Pressable style={styles.treeMain} onPress={() => toggle(cabinet._id)}>
                                      <Text style={styles.expand}>
                                        {expanded[cabinet._id] ? '▼' : '▶'}
                                      </Text>
                                      <Ionicons name="archive-outline" size={16} color={colors.accent} />
                                      <Text style={styles.itemName}>{cabinet.name}</Text>
                                    </Pressable>
                                    {canCreate ? (
                                      <Pressable style={styles.treeAddBtn} onPress={() => openModal('shelf', cabinet._id)}>
                                        <Text style={styles.treeAddText}>+ Add Shelf</Text>
                                      </Pressable>
                                    ) : null}
                                  </View>

                                  {expanded[cabinet._id] ? (
                                    <View style={styles.shelfGrid}>
                                      {!cabinet.children?.length ? (
                                        <Text style={styles.emptyChild}>No shelves</Text>
                                      ) : (
                                        cabinet.children.map((shelf) => {
                                          const load = shelf.current_load ?? 0;
                                          const cap = shelf.capacity_limit ?? 50;
                                          const pct =
                                            cap > 0 ? Math.round((load / cap) * 100) : 0;
                                          const capStyle = getCapacityStyle(load, cap, colors);
                                          return (
                                            <View
                                              key={shelf._id}
                                              style={[styles.shelfCard, { backgroundColor: capStyle.bg }]}
                                            >
                                              <View style={styles.shelfTop}>
                                                <Text style={[styles.shelfName, { color: capStyle.text }]}>
                                                  {shelf.name}
                                                </Text>
                                                <Text style={[styles.shelfLoad, { color: capStyle.text }]}>
                                                  {load} / {cap} max
                                                </Text>
                                              </View>
                                              <View style={styles.progressTrack}>
                                                <View
                                                  style={[
                                                    styles.progressFill,
                                                    { width: `${Math.min(pct, 100)}%`, backgroundColor: capStyle.bar },
                                                  ]}
                                                />
                                              </View>
                                              <Text style={[styles.shelfPct, { color: capStyle.text }]}>
                                                {pct}% full
                                              </Text>
                                            </View>
                                          );
                                        })
                                      )}
                                    </View>
                                  ) : null}
                                </View>
                              ))
                            )}
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              ) : null}
            </Card>
          ))
        )}
      </ScrollView>

      <Modal visible={!!modalType} animationType="slide" transparent onRequestClose={() => setModalType(null)}>
        <View style={styles.modalBackdrop}>
          <ScrollView contentContainerStyle={styles.modalScroll}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>{modalTitle}</Text>
              <Text style={styles.modalDesc}>Enter names separated by commas (e.g. A1, A2, A3)</Text>

              <Text style={styles.fieldLabel}>Names *</Text>
              <TextInput
                value={bulkInput}
                onChangeText={setBulkInput}
                multiline
                numberOfLines={3}
                placeholder="Alpha, Beta, Gamma..."
                placeholderTextColor={colors.muted}
                style={styles.textArea}
              />

              {modalType === 'shelf' ? (
                <>
                  <Text style={styles.fieldLabel}>Max Capacity per Shelf</Text>
                  <Input
                    value={shelfCapacity}
                    onChangeText={setShelfCapacity}
                    keyboardType="number-pad"
                    placeholder="50"
                  />
                  <Text style={styles.fieldNote}>
                    All shelves in this batch share this limit.
                  </Text>
                </>
              ) : null}

              {modalError ? <Text style={styles.error}>{modalError}</Text> : null}
              <Button label={saving ? 'Creating...' : 'Create Items'} onPress={() => void handleBulkCreate()} loading={saving} />
              <Button label="Cancel" variant="ghost" onPress={() => setModalType(null)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    addBtn: {
      marginTop: 6,
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    addText: { color: colors.btnText, fontWeight: '900', fontSize: 12 },
    success: { color: colors.success, fontWeight: '700', marginBottom: 8 },
    error: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
    treeRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    treeMain: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    expand: { color: colors.muted, width: 16, fontWeight: '800', fontSize: 12 },
    itemName: { flex: 1, color: colors.text, fontWeight: '800', fontSize: 14 },
    treeAddBtn: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: colors.surface2,
    },
    treeAddText: { color: colors.accent, fontWeight: '800', fontSize: 10 },
    children: { marginLeft: 16, borderLeftWidth: 1, borderLeftColor: colors.border, paddingLeft: 8 },
    nested: { marginTop: 4 },
    emptyChild: { color: colors.muted, fontStyle: 'italic', fontSize: 12, paddingVertical: 6, paddingLeft: 24 },
    shelfGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 8, paddingLeft: 8 },
    shelfCard: {
      width: '47%',
      flexGrow: 1,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shelfTop: { marginBottom: 6 },
    shelfName: { fontWeight: '800', fontSize: 13 },
    shelfLoad: { fontSize: 11, marginTop: 2, fontWeight: '600' },
    progressTrack: {
      height: 6,
      backgroundColor: colors.border,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressFill: { height: '100%', borderRadius: 3 },
    shelfPct: { fontSize: 10, fontWeight: '700', marginTop: 4 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
    modalScroll: { flexGrow: 1, justifyContent: 'flex-end' },
    modalCard: {
      backgroundColor: colors.bg,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    modalTitle: { color: colors.text, fontWeight: '900', fontSize: 20, marginBottom: 6 },
    modalDesc: { color: colors.muted, fontSize: 13, marginBottom: 14 },
    fieldLabel: { color: colors.text, fontWeight: '800', fontSize: 13, marginBottom: 6 },
    textArea: {
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 12,
      color: colors.text,
      fontSize: 15,
      minHeight: 80,
      textAlignVertical: 'top',
      marginBottom: 12,
    },
    fieldNote: { color: colors.muted, fontSize: 12, marginBottom: 12, marginTop: -6 },
  });
}
