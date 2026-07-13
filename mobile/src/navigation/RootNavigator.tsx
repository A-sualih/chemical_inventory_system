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

import HomeScreen from '../screens/HomeScreen';
import ChemicalsScreen from '../screens/ChemicalsScreen';
import ChemicalDetailScreen from '../screens/ChemicalDetailScreen';
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

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

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
    title: 'Home',
    icon: 'home-outline',
  },
  {
    name: 'Chemicals',
    component: ChemicalsScreen,
    title: 'Chemicals',
    icon: 'flask-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician', 'Viewer / Auditor'],
  },
  {
    name: 'Scan',
    component: ScanScreen,
    title: 'Scan',
    icon: 'qr-code-outline',
    roles: ['Lab Manager', 'Safety Officer', 'Lab Technician'],
  },
  {
    name: 'Requests',
    component: RequestsScreen,
    title: 'Requests',
    icon: 'document-text-outline',
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
  const { colors } = useTheme();
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
        headerStyle: { backgroundColor: colors.bgDeep },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ color, size }) => {
          const def = TAB_DEFS.find((t) => t.name === route.name);
          return <Ionicons name={def?.icon || 'ellipse'} size={size} color={color} />;
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
  { name: 'Notifications', component: NotificationsScreen, title: 'Alerts Center' },
  { name: 'Profile', component: ProfileScreen, title: 'Profile & settings' },
  { name: 'Containers', component: ContainersScreen, title: 'Containers' },
  { name: 'Batches', component: BatchesScreen, title: 'Batches' },
  { name: 'Expiry', component: ExpiryScreen, title: 'Expiry' },
  { name: 'Transactions', component: TransactionsScreen, title: 'Transactions' },
  { name: 'InventoryLogs', component: InventoryLogsScreen, title: 'Master Ledger' },
  { name: 'Transfers', component: TransfersScreen, title: 'Transfers' },
  { name: 'Waste', component: WasteScreen, title: 'Waste & Disposal' },
  { name: 'Safety', component: SafetyScreen, title: 'Safety Command' },
  { name: 'Locations', component: LocationsScreen, title: 'Locations' },
  { name: 'Suppliers', component: SuppliersScreen, title: 'Suppliers' },
  { name: 'Orders', component: OrdersScreen, title: 'Purchase Orders' },
  { name: 'ProcurementHub', component: ProcurementHubScreen, title: 'Procurement' },
  { name: 'Security', component: SecurityScreen, title: 'Security & Backup' },
  { name: 'SupportInbox', component: SupportInboxScreen, title: 'Support Inbox' },
  { name: 'Audit', component: AuditScreen, title: 'Master Audit' },
  { name: 'RoleManager', component: RoleManagerScreen, title: 'Role Manager' },
  { name: 'LabManagement', component: LabManagementScreen, title: 'Labs & Depts' },
  { name: 'SystemSettings', component: SystemSettingsScreen, title: 'System Settings' },
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
          headerStyle: { backgroundColor: colors.bgDeep },
          headerTintColor: colors.text,
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
