import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApi } from '@/services/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

export default function HistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const saved = await AsyncStorage.getItem('scanHistory');
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  };

  const syncHistory = async () => {
    const pending = history.filter(h => !h.synced);
    if (pending.length === 0) return;

    setSyncing(true);
    const result = await mobileApi.syncHistory(pending);
    if (result.success) {
      const updated = history.map(h => ({ ...h, synced: true }));
      await AsyncStorage.setItem('scanHistory', JSON.stringify(updated));
      setHistory(updated);
    }
    setSyncing(false);
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={styles.item}>
      <View style={styles.itemInfo}>
        <Text style={styles.barcodeText}>{item.barcode}</Text>
        <Text style={styles.dateText}>{new Date(item.timestamp).toLocaleString()}</Text>
      </View>
      <View style={styles.statusContainer}>
        {item.synced ? (
          <IconSymbol name="chevron.right" size={20} color="#10b981" />
        ) : (
          <IconSymbol name="paperplane.fill" size={20} color="#f59e0b" />
        )}
        <Text style={[styles.statusText, { color: item.synced ? '#10b981' : '#f59e0b' }]}>
          {item.synced ? 'Synced' : 'Pending'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <TouchableOpacity 
          style={[styles.syncButton, syncing && styles.disabledButton]} 
          onPress={syncHistory}
          disabled={syncing}
        >
          {syncing ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={history}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No recent scans found.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  syncButton: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  syncButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    padding: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  itemInfo: {
    flex: 1,
  },
  barcodeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  statusContainer: {
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontStyle: 'italic',
  },
});
