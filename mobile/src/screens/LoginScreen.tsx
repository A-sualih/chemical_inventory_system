import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBranding } from '../hooks/useBranding';
import { AuthBrandHeader, Button, Input, Screen, ThemeToggleButton } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

type LoginView = 'login' | 'mfa' | 'locked';

const LOCK_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 5;

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, verifyMfa } = useAuth();
  const { colors, theme } = useTheme();
  const { systemName, orgName, logoUrl, ready } = useBranding();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  const [view, setView] = useState<LoginView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    if (lockTimer <= 0) return;
    const t = setInterval(() => setLockTimer((prev) => prev - 1), 1000);
    return () => clearInterval(t);
  }, [lockTimer]);

  useEffect(() => {
    if (lockTimer === 0 && view === 'locked') {
      setView('login');
      setFailedAttempts(0);
    }
  }, [lockTimer, view]);

  const onSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (view === 'mfa' && mfaUserId) {
        const result = await verifyMfa(mfaUserId, otp.trim());
        if (!result.success) setError(result.error);
        return;
      }

      const result = await login(email.trim(), password);
      if (result.success) return;

      if (result.requireMfa && result.userId) {
        setMfaUserId(result.userId);
        setView('mfa');
        setError('');
        return;
      }

      setError(result.error);
      const next = failedAttempts + 1;
      setFailedAttempts(next);
      if (next >= MAX_ATTEMPTS) {
        setView('locked');
        setLockTimer(LOCK_SECONDS);
      }
    } finally {
      setLoading(false);
    }
  };

  const renderLocked = () => (
    <View style={styles.form}>
      <AuthBrandHeader systemName={systemName} logoUrl={logoUrl} ready={ready} title="Account Locked" subtitle="For security reasons, your account is temporarily locked." />
      <View style={styles.timerBox}>
        <Text style={styles.timerText}>{lockTimer}s</Text>
        <Text style={styles.timerLabel}>Time remaining</Text>
      </View>
      <Text style={styles.hint}>Please contact system administrator if this was an error.</Text>
    </View>
  );

  const renderMfa = () => (
    <View style={styles.form}>
      <AuthBrandHeader
        systemName={systemName}
        logoUrl={logoUrl}
        ready={ready}
        title="Verify Identity"
        subtitle="Enter the 6-digit code sent to your device."
      />
      <Text style={styles.label}>Verification code</Text>
      <Input
        keyboardType="number-pad"
        maxLength={6}
        value={otp}
        onChangeText={setOtp}
        placeholder="000000"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Confirm Code" onPress={onSubmit} loading={loading} disabled={otp.length < 4} />
      <Button
        label="Back to login"
        variant="ghost"
        onPress={() => {
          setView('login');
          setMfaUserId(null);
          setOtp('');
          setError('');
        }}
      />
    </View>
  );

  const renderLogin = () => (
    <View style={styles.form}>
      <AuthBrandHeader
        systemName={systemName}
        orgName={orgName}
        logoUrl={logoUrl}
        ready={ready}
        title={systemName}
        subtitle={orgName}
      />
      <Text style={styles.label}>Work Email</Text>
      <Input
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        placeholder="name@company.com"
      />
      <Text style={styles.label}>Secure Password</Text>
      <Input
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        placeholder="••••••••"
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotWrap}>
        <Text style={styles.forgot}>Forgot Password?</Text>
      </Pressable>
      <Button label="Sign In" onPress={onSubmit} loading={loading} disabled={!email || !password} />
      <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkBtn}>
        <Text style={styles.linkText}>New to CIMS? Create Account</Text>
      </Pressable>
    </View>
  );

  return (
    <Screen style={styles.wrap}>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <View style={styles.topBar}>
      <Pressable onPress={() => navigation.navigate('Landing')} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={18} color={colors.accent} />
        <Text style={styles.backText}>Home</Text>
      </Pressable>
      <ThemeToggleButton />
    </View>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {view === 'locked' ? renderLocked() : view === 'mfa' ? renderMfa() : renderLogin()}
    </KeyboardAvoidingView>
    <Text style={styles.footerTag}>Protected & Encrypted • {orgName}</Text>
  </Screen>
);
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { justifyContent: 'center', paddingHorizontal: 20 },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    backBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    backText: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    form: {
      backgroundColor: colors.surface,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    forgotWrap: { alignSelf: 'flex-end', marginBottom: 12, marginTop: -2 },
    forgot: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    error: { color: colors.danger, marginBottom: 12, fontWeight: '600', fontSize: 13 },
    linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 6 },
    linkText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
    footerTag: {
      color: colors.muted,
      textAlign: 'center',
      marginTop: 24,
      fontSize: 12,
      fontWeight: '600',
      opacity: 0.75,
    },
    timerBox: {
      alignItems: 'center',
      backgroundColor: colors.surface2,
      borderRadius: 18,
      padding: 20,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    timerText: { color: colors.danger, fontWeight: '900', fontSize: 36 },
    timerLabel: { color: colors.muted, marginTop: 6, fontSize: 13, fontWeight: '600' },
    hint: { color: colors.muted, textAlign: 'center', fontStyle: 'italic', fontSize: 12, marginTop: 8 },
  });
}
