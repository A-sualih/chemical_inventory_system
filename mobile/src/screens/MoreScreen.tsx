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

/** Mirrors web Sidebar.jsx role classification */
const OPS: Item[] = [
  {
    title: 'Inventory',
    subtitle: 'Chemicals repository',
    screen: 'ChemicalsTab',
    icon: 'flask-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Fast Check-In/Out',
    subtitle: 'Stock transactions',
    screen: 'Transactions',
    icon: 'swap-horizontal-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Alerts Center',
    subtitle: 'Lab notifications',
    screen: 'Notifications',
    icon: 'notifications-outline',
    roles: ['Admin', 'Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Containers',
    subtitle: 'Physical vessels',
    screen: 'Containers',
    icon: 'cube-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Batches',
    subtitle: 'Lot tracking',
    screen: 'Batches',
    icon: 'layers-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Expiry Intelligence',
    subtitle: 'Near-expiry assets',
    screen: 'Expiry',
    icon: 'time-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Master Ledger',
    subtitle: 'Inventory logs',
    screen: 'InventoryLogs',
    icon: 'list-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Requests',
    subtitle: 'Usage requests',
    screen: 'RequestsTab',
    icon: 'document-text-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Transfers',
    subtitle: 'Cross-lab requisitions',
    screen: 'Transfers',
    icon: 'git-compare-outline',
    roles: ['Lab Manager', 'Safety Officer'],
  },
  {
    title: 'Locations',
    subtitle: 'Storage hierarchy',
    screen: 'Locations',
    icon: 'map-outline',
    roles: ['Lab Manager', 'Viewer / Auditor'],
  },
  {
    title: 'Procurement',
    subtitle: 'Suppliers & purchase orders',
    screen: 'ProcurementHub',
    icon: 'cart-outline',
    roles: ['Admin', 'Lab Manager'],
  },
  {
    title: 'Safety Command',
    subtitle: 'Hazards & conflicts',
    screen: 'Safety',
    icon: 'shield-checkmark-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Viewer / Auditor'],
  },
  {
    title: 'Waste & Disposal',
    subtitle: 'Disposal workflow',
    screen: 'Waste',
    icon: 'trash-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
];

const ADMIN: Item[] = [
  {
    title: 'Security & Backup',
    subtitle: 'System security status',
    screen: 'Security',
    icon: 'lock-closed-outline',
    roles: ['Admin'],
  },
  {
    title: 'Support Inbox',
    subtitle: 'Public support tickets',
    screen: 'SupportInbox',
    icon: 'mail-outline',
    roles: ['Admin'],
  },
  {
    title: 'Master Audit',
    subtitle: 'Institutional audit trail',
    screen: 'Audit',
    icon: 'document-text-outline',
    roles: ['Admin'],
  },
  {
    title: 'Role Manager',
    subtitle: 'Users & role assignment',
    screen: 'RoleManager',
    icon: 'people-outline',
    roles: ['Admin'],
  },
  {
    title: 'Labs & Depts',
    subtitle: 'Laboratory management',
    screen: 'LabManagement',
    icon: 'business-outline',
    roles: ['Admin'],
  },
  {
    title: 'System Settings',
    subtitle: 'Org name, branding, units',
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
    if (screen === 'ChemicalsTab') {
      navigation.navigate('Chemicals');
      return;
    }
    if (screen === 'RequestsTab') {
      navigation.navigate('Requests');
      return;
    }
    if (screen === 'RoleManager' && adminUser) {
      // Prefer stack screen so header title is correct
      navigation.getParent()?.navigate('RoleManager');
      return;
    }
    navigation.getParent()?.navigate(screen);
  };

  const visible = (items: Item[]) => items.filter((i) => roleMatches(user?.role, i.roles));

  const ops = visible(OPS);
  const admin = visible(ADMIN);

  return (
    <Screen>
      <ScrollView>
        <Title>{adminUser ? 'Admin modules' : 'Modules'}</Title>
        <Subtitle>
          {user?.role || 'User'} · only your role’s tools are listed
        </Subtitle>

        {adminUser && admin.length > 0 ? (
          <>
            <SectionLabel>Administration (Admin only)</SectionLabel>
            {admin.map((m) => (
              <MenuRow key={m.screen} item={m} onPress={() => go(m.screen)} colors={colors} />
            ))}
          </>
        ) : null}

        <SectionLabel>Appearance</SectionLabel>
        <View
          style={[
            styles.row,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
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
            subtitle: 'Name, lab switch, password info, sign out',
            screen: 'Profile',
            icon: 'person-circle-outline',
          }}
          onPress={() => go('Profile')}
          colors={colors}
        />

        {ops.length > 0 ? (
          <>
            <SectionLabel>Lab operations</SectionLabel>
            {ops.map((m) => (
              <MenuRow key={m.screen} item={m} onPress={() => go(m.screen)} colors={colors} />
            ))}
          </>
        ) : null}

        {!adminUser && admin.length > 0 ? (
          <>
            <SectionLabel>Administration</SectionLabel>
            {admin.map((m) => (
              <MenuRow key={m.screen} item={m} onPress={() => go(m.screen)} colors={colors} />
            ))}
          </>
        ) : null}
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
