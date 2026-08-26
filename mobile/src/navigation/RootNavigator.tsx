import React, { useMemo } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { roleMatches } from '../utils/roles';

import LandingScreen from '../screens/LandingScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import TermsScreen from '../screens/TermsScreen';
import SupportScreen from '../screens/SupportScreen';
import LearnMoreScreen from '../screens/LearnMoreScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import DocumentationScreen from '../screens/DocumentationScreen';

import HomeScreen from '../screens/HomeScreen';
import ChemicalsScreen from '../screens/ChemicalsScreen';
import ChemicalDetailScreen from '../screens/ChemicalDetailScreen';
import ChemicalFormScreen from '../screens/ChemicalFormScreen';
import ScanScreen from '../screens/ScanScreen';
import RequestsScreen from '../screens/RequestsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MoreScreen from '../screens/MoreScreen';
import ContainersScreen from '../screens/ContainersScreen';
import BatchesScreen from '../screens/BatchesScreen';
import ExpiryScreen from '../screens/ExpiryScreen';
import TransactionsScreen from '../screens/TransactionsScreen';
import InventoryLogsScreen from '../screens/InventoryLogsScreen';
import TransfersScreen from '../screens/TransfersScreen';
import WasteScreen from '../screens/WasteScreen';
import SafetyScreen from '../screens/SafetyScreen';
import LocationsScreen from '../screens/LocationsScreen';
import SuppliersScreen from '../screens/SuppliersScreen';
import OrdersScreen from '../screens/OrdersScreen';
import SecurityScreen from '../screens/SecurityScreen';
import SupportInboxScreen from '../screens/SupportInboxScreen';
import AuditScreen from '../screens/AuditScreen';
import RoleManagerScreen from '../screens/RoleManagerScreen';
import LabManagementScreen from '../screens/LabManagementScreen';
import SystemSettingsScreen from '../screens/SystemSettingsScreen';
import ProcurementHubScreen from '../screens/ProcurementHubScreen';
import OrderTrackingScreen from '../screens/OrderTrackingScreen';
import ProcurementAnalyticsScreen from '../screens/ProcurementAnalyticsScreen';
import VendorPerformanceScreen from '../screens/VendorPerformanceScreen';
import ConnectivityScreen from '../screens/ConnectivityScreen';
import ComplianceScreen from '../screens/ComplianceScreen';
import { useLabManagerOnly } from '../hooks/useLabManagerOnly';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

/** Restrict Procurement Hub + nested screens to Lab Manager (matches web). */
function withLabManagerOnly<P extends object>(Screen: React.ComponentType<P>) {
  return function LabManagerGuarded(props: P) {
    const allowed = useLabManagerOnly();
    if (!allowed) return null;
    return <Screen {...props} />;
  };
}

type TabDef = {
  name: string;
  component: React.ComponentType<any>;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  roles?: string[];
};

const TAB_DEFS: TabDef[] = [
  {
    name: 'Home',
    component: HomeScreen,
    title: 'Dashboard',
    icon: 'home-outline',
  },
  {
    name: 'Chemicals',
    component: ChemicalsScreen,
    title: 'Inventory',
    icon: 'flask-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    name: 'Scan',
    component: ScanScreen,
    title: 'Check-In/Out',
    icon: 'flash-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    name: 'Requests',
    component: RequestsScreen,
    title: 'Requests',
    icon: 'checkmark-circle-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    name: 'Alerts',
    component: NotificationsScreen,
    title: 'Alerts',
    icon: 'notifications-outline',
    roles: ['Admin'],
  },
  {
    name: 'AdminHub',
    component: RoleManagerScreen,
    title: 'Roles',
    icon: 'people-outline',
    roles: ['Admin'],
  },
  {
    name: 'More',
    component: MoreScreen,
    title: 'Modules',
    icon: 'grid-outline',
  },
];

function MainTabs() {
  const { colors, theme } = useTheme();
  const { user } = useAuth();
  const role = user?.role;

  const tabs = useMemo(
    () => TAB_DEFS.filter((t) => roleMatches(role, t.roles)),
    [role]
  );

  return (
    <Tabs.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        // ── Header ──────────────────────────────────────────────────────
        headerStyle: {
          backgroundColor: colors.bgDeep,
          shadowColor: 'transparent',
          elevation: 0,
        },
        headerTintColor: colors.accent,
        headerTitleStyle: {
          fontWeight: '800',
          fontSize: 17,
          color: colors.text,
          letterSpacing: -0.3,
        },
        headerShadowVisible: false,
        headerBackTitleVisible: false,

        // ── Bottom Tab Bar ───────────────────────────────────────────────
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 10,
          paddingTop: 8,
          paddingHorizontal: 6,
          elevation: 16,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: theme === 'ink' ? 0.4 : 0.08,
          shadowRadius: 12,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 12,
          marginHorizontal: 2,
          paddingVertical: 4,
        },
        tabBarActiveBackgroundColor: colors.accentSoft,
        tabBarIcon: ({ color, size, focused }) => {
          const def = TAB_DEFS.find((t) => t.name === route.name);
          return (
            <Ionicons
              name={focused ? (def?.icon?.replace('-outline', '') as any) || 'ellipse' : def?.icon || 'ellipse'}
              size={focused ? size + 1 : size}
              color={color}
            />
          );
        },
      })}
    >
      {tabs.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          component={t.component}
          options={{ title: t.title }}
        />
      ))}
    </Tabs.Navigator>
  );
}

const appScreens: Array<{ name: string; component: React.ComponentType<any>; title: string }> = [
  { name: 'ChemicalDetail', component: ChemicalDetailScreen, title: 'Chemical' },
  { name: 'ChemicalForm', component: ChemicalFormScreen, title: 'Enroll / Edit' },
  { name: 'Notifications', component: NotificationsScreen, title: 'Alerts Center' },
  { name: 'Profile', component: ProfileScreen, title: 'Profile & settings' },
  { name: 'Containers', component: ContainersScreen, title: 'Containers' },
  { name: 'Batches', component: BatchesScreen, title: 'Batches' },
  { name: 'Expiry', component: ExpiryScreen, title: 'Expiry' },
  { name: 'Transactions', component: TransactionsScreen, title: 'Fast Check-In/Out' },
  { name: 'InventoryLogs', component: InventoryLogsScreen, title: 'Master Ledger' },
  { name: 'Transfers', component: TransfersScreen, title: 'Transfers' },
  { name: 'Waste', component: WasteScreen, title: 'Waste & Disposal' },
  { name: 'Safety', component: SafetyScreen, title: 'Safety Command' },
  { name: 'Locations', component: LocationsScreen, title: 'Locations' },
  { name: 'Connectivity', component: ConnectivityScreen, title: 'Connectivity' },
  { name: 'Compliance', component: ComplianceScreen, title: 'Compliance' },
  { name: 'Suppliers', component: withLabManagerOnly(SuppliersScreen), title: 'Suppliers' },
  { name: 'Orders', component: withLabManagerOnly(OrdersScreen), title: 'Purchase Orders' },
  { name: 'ProcurementHub', component: withLabManagerOnly(ProcurementHubScreen), title: 'Procurement' },
  { name: 'OrderTracking', component: withLabManagerOnly(OrderTrackingScreen), title: 'Order Tracking' },
  { name: 'ProcurementAnalytics', component: withLabManagerOnly(ProcurementAnalyticsScreen), title: 'Analytics' },
  { name: 'VendorPerformance', component: withLabManagerOnly(VendorPerformanceScreen), title: 'Vendor Performance' },
  { name: 'Security', component: SecurityScreen, title: 'Security & Backup' },
  { name: 'SupportInbox', component: SupportInboxScreen, title: 'Support Inbox' },
  { name: 'Audit', component: AuditScreen, title: 'Master Audit / Security Ledger' },
  { name: 'RoleManager', component: RoleManagerScreen, title: 'Role Manager' },
  { name: 'LabManagement', component: LabManagementScreen, title: 'Labs & Depts' },
  { name: 'SystemSettings', component: SystemSettingsScreen, title: 'System Settings' },
  { name: 'HelpCenter', component: HelpCenterScreen, title: 'Help Center' },
  { name: 'Documentation', component: DocumentationScreen, title: 'Documentation' },
  { name: 'Support', component: SupportScreen, title: 'Support' },
  { name: 'Privacy', component: PrivacyScreen, title: 'Privacy' },
  { name: 'Terms', component: TermsScreen, title: 'Terms' },
  { name: 'LearnMore', component: LearnMoreScreen, title: 'Learn More' },
];

export default function RootNavigator() {
  const { user, loading, refreshUser } = useAuth();
  const { colors, theme } = useTheme();

  React.useEffect(() => {
    if (!user) return;
    void refreshUser();
    // Refresh once after login / session restore so role changes by another Admin apply
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(user), refreshUser]);

  const navTheme = useMemo(
    () => ({
      ...(theme === 'ink' ? DarkTheme : DefaultTheme),
      colors: {
        ...(theme === 'ink' ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.bg,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
        primary: colors.accent,
      },
    }),
    [colors, theme]
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.bgDeep,
          },
          headerTintColor: colors.accent,
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 17,
            color: colors.text,
          },
          headerShadowVisible: false,
          headerBackTitle: '',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        {!user ? (
          <>
            <Stack.Screen name="Landing" component={LandingScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
            <Stack.Screen
              name="ForgotPassword"
              component={ForgotPasswordScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="ResetPassword"
              component={ResetPasswordScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="LearnMore" component={LearnMoreScreen} options={{ title: 'Learn More' }} />
            <Stack.Screen name="Privacy" component={PrivacyScreen} options={{ title: 'Privacy' }} />
            <Stack.Screen name="Terms" component={TermsScreen} options={{ title: 'Terms' }} />
            <Stack.Screen name="Support" component={SupportScreen} options={{ title: 'Support' }} />
            <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ title: 'Help Center' }} />
            <Stack.Screen name="Documentation" component={DocumentationScreen} options={{ title: 'Documentation' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
            {appScreens.map((s) => (
              <Stack.Screen
                key={s.name}
                name={s.name}
                component={s.component}
                options={{ title: s.title }}
              />
            ))}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
