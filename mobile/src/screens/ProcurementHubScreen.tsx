import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Screen, Subtitle, Title } from '../components/ui';

const ITEMS = [
  {
    title: 'Purchase Orders',
    screen: 'Orders',
    icon: 'clipboard-outline' as const,
    sub: 'Create POs and advance status',
  },
  {
    title: 'Suppliers',
    screen: 'Suppliers',
    icon: 'business-outline' as const,
    sub: 'Vendor directory & blacklist',
  },
  {
    title: 'Order Tracking',
    screen: 'OrderTracking',
    icon: 'car-outline' as const,
    sub: 'Shipments and delivery updates',
  },
  {
    title: 'Analytics',
    screen: 'ProcurementAnalytics',
    icon: 'pie-chart-outline' as const,
    sub: 'Spend, status, top vendors',
  },
  {
    title: 'Vendor Performance',
    screen: 'VendorPerformance',
    icon: 'star-outline' as const,
    sub: 'Reviews and rankings',
  },
];

export default function ProcurementHubScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  return (
    <Screen>
      <Title>Procurement Hub</Title>
      <Subtitle>Modern supply chain & inventory acquisition</Subtitle>
      {ITEMS.map((item) => (
        <Pressable
          key={item.screen}
          onPress={() => navigation.navigate(item.screen)}
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        >
          <View style={[styles.icon, { backgroundColor: colors.surface2 }]}>
            <Ionicons name={item.icon} size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }}>{item.title}</Text>
            <Text style={{ color: colors.muted, marginTop: 2 }}>{item.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
