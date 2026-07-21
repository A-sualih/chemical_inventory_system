import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { Screen, Subtitle, Title } from '../components/ui';

export default function ProcurementHubScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();

  const items = [
    { title: 'Suppliers', screen: 'Suppliers', icon: 'business-outline' as const, sub: 'Vendor directory' },
    { title: 'Purchase Orders', screen: 'Orders', icon: 'receipt-outline' as const, sub: 'PO tracking' },
  ];

  return (
    <Screen>
      <Title>Procurement</Title>
      <Subtitle>Admin & Lab Manager</Subtitle>
      {items.map((item) => (
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
