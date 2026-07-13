import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleMatches } from '../utils/roles';
import { Card, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

const QUICK: {
  title: string;
  screen: string;
  icon: keyof typeof Ionicons.glyphMap;
  roles?: string[];
}[] = [
  {
    title: 'Scan',
    screen: 'Scan',
    icon: 'qr-code-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Chemicals',
    screen: 'Chemicals',
    icon: 'flask-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Containers',
    screen: 'Containers',
    icon: 'cube-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    title: 'Expiry',
    screen: 'Expiry',
    icon: 'time-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Transfers',
    screen: 'Transfers',
    icon: 'git-compare-outline',
    roles: ['Lab Manager', 'Safety Officer'],
  },
  {
    title: 'Waste',
    screen: 'Waste',
    icon: 'trash-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Safety',
    screen: 'Safety',
    icon: 'shield-checkmark-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Viewer / Auditor'],
  },
  {
    title: 'Alerts',
    screen: 'Notifications',
    icon: 'notifications-outline',
    roles: ['Admin', 'Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    title: 'Procurement',
    screen: 'ProcurementHub',
    icon: 'cart-outline',
    roles: ['Admin', 'Lab Manager'],
  },
  {
    title: 'Roles',
    screen: 'RoleManager',
    icon: 'people-outline',
    roles: ['Admin'],
  },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const navigation = useNavigation<any>();
  const [stats, setStats] = useState<any>(null);
  const [unread, setUnread] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [statsRes, unreadRes] = await Promise.all([
        api.get('/chemicals/stats').catch(() => ({ data: null })),
        api.get('/notifications/unread').catch(() => ({ data: { count: 0 } })),
      ]);
      setStats(statsRes.data);
      setUnread(unreadRes.data?.count ?? unreadRes.data?.unread ?? 0);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, user?.active_lab]);

  const labLabel =
    typeof user?.active_lab === 'object' && user?.active_lab
      ? user.active_lab.name || user.active_lab._id
      : user?.active_lab || 'No lab';

  const quick = QUICK.filter((i) => roleMatches(user?.role, i.roles));

  const go = (screen: string) => {
    if (['Scan', 'Chemicals', 'Requests', 'More', 'Home'].includes(screen)) {
      navigation.navigate(screen);
    } else {
      navigation.getParent()?.navigate(screen);
    }
  };

  return (
    <Screen>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
            tintColor={colors.accent}
          />
        }
      >
        <Title>Welcome, {user?.name?.split(' ')[0] || 'User'}</Title>
        <Subtitle>
          {user?.role} · {String(labLabel)}
          {unread ? ` · ${unread} alerts` : ''}
        </Subtitle>

        <View style={styles.row}>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Chemicals</Text>
            <Text style={styles.statValue}>{stats?.total ?? stats?.totalChemicals ?? '—'}</Text>
          </Card>
          <Card style={styles.statCard}>
            <Text style={styles.statLabel}>Alerts</Text>
            <Text style={styles.statValue}>{unread}</Text>
          </Card>
        </View>

        <Text style={styles.section}>Quick access</Text>
        <View style={styles.grid}>
          {quick.map((item) => (
            <Pressable key={item.screen} onPress={() => go(item.screen)} style={styles.tile}>
              <Ionicons name={item.icon} size={22} color={colors.accent} />
              <Text style={styles.tileText}>{item.title}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={() => navigation.navigate('More')} style={styles.allModules}>
          <Text style={styles.allModulesText}>Open all modules</Text>
          <Ionicons name="arrow-forward" size={16} color={colors.btnText} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: { flexDirection: 'row', gap: 10 },
    statCard: { flex: 1 },
    statLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
    statValue: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 6 },
    section: {
      color: colors.muted,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontSize: 11,
      marginTop: 8,
      marginBottom: 8,
    },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    tile: {
      width: '47%',
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 8,
    },
    tileText: { color: colors.text, fontWeight: '800' },
    allModules: {
      marginTop: 16,
      marginBottom: 24,
      backgroundColor: colors.accent,
      borderRadius: 14,
      paddingVertical: 14,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    allModulesText: { color: colors.btnText, fontWeight: '900' },
  });
}
