import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Warehouse</Text>
        <Text style={styles.subGreeting}>Inventory Logistics</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>1,284</Text>
          <Text style={styles.statLabel}>Total Assets</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#ef4444' }]}>12</Text>
          <Text style={styles.statLabel}>Expired</Text>
        </View>
      </View>

      <View style={styles.menuGrid}>
        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/scanner')}>
          <View style={[styles.iconCircle, { backgroundColor: '#eef2ff' }]}>
            <IconSymbol name="qrcode.viewfinder" size={32} color="#6366f1" />
          </View>
          <Text style={styles.menuText}>Start Scanning</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/history')}>
          <View style={[styles.iconCircle, { backgroundColor: '#f0fdf4' }]}>
            <IconSymbol name="clock.fill" size={32} color="#10b981" />
          </View>
          <Text style={styles.menuText}>Scan History</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.quickAction}>
        <Text style={styles.sectionTitle}>Pending Operations</Text>
        <View style={styles.actionCard}>
           <IconSymbol name="paperplane.fill" size={24} color="#64748b" />
           <View>
             <Text style={styles.actionTitle}>Sync Required</Text>
             <Text style={styles.actionDesc}>5 scans pending synchronization</Text>
           </View>
           <TouchableOpacity style={styles.goButton} onPress={() => router.push('/history')}>
             <Text style={styles.goText}>View</Text>
           </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    paddingTop: 80,
    backgroundColor: 'white',
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  subGreeting: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  statLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 5,
  },
  menuGrid: {
    flexDirection: 'row',
    padding: 15,
    gap: 15,
  },
  menuItem: {
    flex: 1,
    backgroundColor: 'white',
    padding: 25,
    borderRadius: 25,
    alignItems: 'center',
    gap: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  quickAction: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 15,
    gap: 15,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  actionDesc: {
    fontSize: 14,
    color: '#64748b',
  },
  goButton: {
    marginLeft: 'auto',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  goText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e293b',
  },
});
