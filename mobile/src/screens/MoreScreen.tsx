import React from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleMatches, isAdmin } from '../utils/roles';
import { Screen, SectionLabel, Subtitle, Title } from '../components/ui';

type Item = {
  title: string;
  subtitle: string;
  screen: string;
  icon: keyof typeof Ionicons.glyphMap;
  roles?: string[];
};

/** Exact order + roles from frontend/src/layout/Sidebar.jsx */
const SIDEBAR_ITEMS: Item[] = [
  {
    title: 'Dashboard',
    subtitle: 'Lab overview & quick actions',
    screen: 'HomeTab',
    icon: 'home-outline',
  },
  {
    title: 'Security & Backup',
    subtitle: 'Backups, MFA, restore',
    screen: 'Security',
    icon: 'lock-closed-outline',
    roles: ['Admin'],
  },
  {
    title: 'Support Inbox',
    subtitle: 'Public contact tickets',
    screen: 'SupportInbox',
    icon: 'mail-outline',
    roles: ['Admin'],
  },
  {
    title: 'Inventory',
    subtitle: 'Chemical Repository',
    screen: 'ChemicalsTab',
    icon: 'flask-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Fast Check-In/Out',
    subtitle: 'Scan & stock movements',
    screen: 'Transactions',
    icon: 'flash-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Alerts Center',
    subtitle: 'Notifications & warnings',
    screen: 'Notifications',
    icon: 'notifications-outline',
    roles: ['Admin', 'Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Containers',
    subtitle: 'Container Mastery',
    screen: 'Containers',
    icon: 'cube-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Batches',
    subtitle: 'Batch Master / lots',
    screen: 'Batches',
    icon: 'pricetag-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Expiry Intelligence',
    subtitle: 'Near-expiry & expired',
    screen: 'Expiry',
    icon: 'time-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Master Ledger',
    subtitle: 'Stock IN / OUT / Transfer / Disposal',
    screen: 'InventoryLogs',
    icon: 'clipboard-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Requests',
    subtitle: 'Request & approval system',
    screen: 'RequestsTab',
    icon: 'checkmark-circle-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Transfers',
    subtitle: 'Chemical requisitions',
    screen: 'Transfers',
    icon: 'swap-horizontal-outline',
    roles: ['Lab Manager', 'Safety Officer'],
  },
  {
    title: 'Connectivity',
    subtitle: 'Integrations & cloud sync',
    screen: 'Connectivity',
    icon: 'git-network-outline',
    roles: ['Lab Manager'],
  },
  {
    title: 'Compliance',
    subtitle: 'Intelligence & analytics',
    screen: 'Compliance',
    icon: 'bar-chart-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Viewer / Auditor'],
  },
  {
    title: 'Master Audit',
    subtitle: 'Security ledger',
    screen: 'Audit',
    icon: 'document-text-outline',
    roles: ['Admin'],
  },
  {
    title: 'Role Manager',
    subtitle: 'Users & authority levels',
    screen: 'RoleManager',
    icon: 'people-outline',
    roles: ['Admin'],
  },
  {
    title: 'Locations',
    subtitle: 'Building → Room → Cabinet → Shelf',
    screen: 'Locations',
    icon: 'location-outline',
    roles: ['Lab Manager', 'Viewer / Auditor'],
  },
  {
    title: 'Procurement',
    subtitle: 'POs, suppliers, tracking, vendors',
    screen: 'ProcurementHub',
    icon: 'cart-outline',
    roles: ['Lab Manager'],
  },
  {
    title: 'Safety Command',
    subtitle: 'Hazards & risk profile',
    screen: 'Safety',
    icon: 'shield-checkmark-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Viewer / Auditor'],
  },
  {
    title: 'Waste & Disposal',
    subtitle: 'Disposal & regulatory logs',
    screen: 'Waste',
    icon: 'trash-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Labs & Depts',
    subtitle: 'Facilities & Facility Access',
    screen: 'LabManagement',
    icon: 'business-outline',
    roles: ['Admin'],
  },
  {
    title: 'System Settings',
    subtitle: 'Branding, units, thresholds',
    screen: 'SystemSettings',
    icon: 'settings-outline',
    roles: ['Admin'],
  },
];

export default function MoreScreen() {
  const navigation = useNavigation<any>();
  const { user, refreshUser } = useAuth();
  const { colors, theme, toggleTheme } = useTheme();
  const adminUser = isAdmin(user?.role);

  React.useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const go = (screen: string) => {
    if (screen === 'HomeTab') {
      navigation.navigate('Home');
      return;
    }
    if (screen === 'ChemicalsTab') {
      navigation.navigate('Chemicals');
      return;
    }
    if (screen === 'RequestsTab') {
      navigation.navigate('Requests');
      return;
    }
    if (screen === 'RoleManager' && adminUser) {
      navigation.getParent()?.navigate('RoleManager');
      return;
    }
    navigation.getParent()?.navigate(screen);
  };

  const navItems = SIDEBAR_ITEMS.filter((i) => roleMatches(user?.role, i.roles));

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>Core Navigation</Title>
        <Subtitle>
          {user?.role || 'User'} · same modules as the website for your role
        </Subtitle>

        <SectionLabel>Core Navigation</SectionLabel>
        {navItems.map((m) => (
          <MenuRow key={m.screen + m.title} item={m} onPress={() => go(m.screen)} colors={colors} />
        ))}

        <SectionLabel>Appearance</SectionLabel>
        <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.iconWrap, { backgroundColor: colors.accentSoft }]}>
            <Ionicons
              name={theme === 'ink' ? 'moon-outline' : 'sunny-outline'}
              size={22}
              color={colors.accent}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>Theme</Text>
            <Text style={[styles.sub, { color: colors.muted }]}>
              {theme === 'ink' ? 'Ink (dark)' : 'Paper (light)'}
            </Text>
          </View>
          <Switch
            value={theme === 'ink'}
            onValueChange={toggleTheme}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
          />
        </View>

        <SectionLabel>Your account</SectionLabel>
        <MenuRow
          item={{
            title: 'Profile & settings',
            subtitle: 'Name, photo, MFA, lab switch',
            screen: 'Profile',
            icon: 'person-circle-outline',
          }}
          onPress={() => go('Profile')}
          colors={colors}
        />

        <SectionLabel>Resources</SectionLabel>
        {[
          { title: 'Help Center', subtitle: 'FAQs and user guides', screen: 'HelpCenter', icon: 'help-circle-outline' as const },
          { title: 'Documentation', subtitle: 'Getting started & API reference', screen: 'Documentation', icon: 'book-outline' as const },
          { title: 'Contact Support', subtitle: 'Submit a support request', screen: 'Support', icon: 'mail-outline' as const },
        ].map((m) => (
          <MenuRow key={m.screen} item={m} onPress={() => go(m.screen)} colors={colors} />
        ))}
      </ScrollView>
    </Screen>
  );
}

function MenuRow({
  item,
  onPress,
  colors,
}: {
  item: Item;
  onPress: () => void;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: colors.surface2 }]}>
        <Ionicons name={item.icon} size={22} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.sub, { color: colors.muted }]}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontWeight: '800', fontSize: 15 },
  sub: { fontSize: 12, marginTop: 2 },
});
