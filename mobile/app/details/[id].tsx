import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function DetailScreen() {
  const { id, scanResult } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const router = useRouter();
  
  const data = scanResult ? JSON.parse(scanResult as string) : null;
  const chemical = data?.chemical;
  const container = data?.container;

  if (!chemical) {
    return (
      <View style={styles.container}>
        <Text>Chemical not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colorScheme === 'dark' ? '#0f172a' : '#f8fafc' }]}>
      <Stack.Screen options={{ title: chemical.name, headerRight: () => <IconSymbol name="paperplane.fill" color={Colors[colorScheme ?? 'light'].tint} /> }} />
      
      {/* Header Info */}
      <View style={styles.headerCard}>
        <Text style={styles.chemicalName}>{chemical.name}</Text>
        <Text style={styles.casNumber}>CAS: {chemical.cas}</Text>
        {container && (
          <View style={styles.badgeContainer}>
             <View style={[styles.statusBadge, { backgroundColor: container.status === 'Expired' ? '#ef4444' : '#10b981' }]}>
               <Text style={styles.statusText}>{container.status}</Text>
             </View>
             <Text style={styles.locationText}>{container.location}</Text>
          </View>
        )}
      </View>

      {/* Hazard Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hazards & Safety</Text>
        <View style={styles.hazardGrid}>
           {chemical.hazards?.pictograms?.map((p: string, i: number) => (
             <View key={i} style={styles.hazardItem}>
                <IconSymbol name="exclamationmark.triangle.fill" size={24} color="#f59e0b" />
                <Text style={styles.hazardText}>{p}</Text>
             </View>
           ))}
        </View>
        <Text style={styles.ppeTitle}>Required PPE:</Text>
        <View style={styles.ppeList}>
          {chemical.ppe?.map((p: string, i: number) => (
            <View key={i} style={styles.ppeBadge}>
              <Text style={styles.ppeText}>{p}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Stock Details */}
      {container && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Container ID:</Text>
            <Text style={styles.value}>{container.id}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Quantity:</Text>
            <Text style={styles.value}>{container.quantity} {container.unit}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Expiry:</Text>
            <Text style={[styles.value, { color: chemical.expiry && new Date(chemical.expiry) < new Date() ? '#ef4444' : '#64748b' }]}>
              {chemical.expiry ? new Date(chemical.expiry).toLocaleDateString() : 'N/A'}
            </Text>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#6366f1' }]}>
          <IconSymbol name="paperplane.fill" size={20} color="white" />
          <Text style={styles.actionButtonText}>Quick Check-Out</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10b981' }]}>
          <IconSymbol name="house.fill" size={20} color="white" />
          <Text style={styles.actionButtonText}>Relocate</Text>
        </TouchableOpacity>
      </View>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerCard: {
    padding: 20,
    backgroundColor: 'white',
    margin: 10,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chemicalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  casNumber: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 5,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  locationText: {
    color: '#64748b',
    fontSize: 14,
  },
  section: {
    padding: 20,
    backgroundColor: 'white',
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 15,
  },
  hazardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 15,
  },
  hazardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#fffbeb',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fef3c7',
  },
  hazardText: {
    fontSize: 12,
    color: '#92400e',
  },
  ppeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 10,
  },
  ppeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ppeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  ppeText: {
    fontSize: 12,
    color: '#475569',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  label: {
    color: '#64748b',
    fontSize: 14,
  },
  value: {
    color: '#1e293b',
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 15,
    borderRadius: 12,
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
