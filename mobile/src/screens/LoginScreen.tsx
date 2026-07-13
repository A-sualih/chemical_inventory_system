import React, { useMemo, useState } from 'react';
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
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Input, Screen, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

export default function LoginScreen() {
  const navigation = useNavigation<any>();
  const { login, verifyMfa } = useAuth();
  const { colors, theme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [mfaUserId, setMfaUserId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      if (mfaUserId) {
        const result = await verifyMfa(mfaUserId, otp.trim());
        if (!result.success) setError(result.error);
        return;
      }
      const result = await login(email.trim(), password);
      if (result.success) return;
      if (result.requireMfa && result.userId) {
        setMfaUserId(result.userId);
        setError('Enter the verification code sent to your email.');
        return;
      }
      setError(result.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen style={styles.wrap}>
      <StatusBar style={theme === 'ink' ? 'light' : 'dark'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable onPress={() => navigation.navigate('Landing')}>
          <Text style={styles.back}>← Back to home</Text>
        </Pressable>

        <View style={styles.hero}>
          <Text style={styles.brand}>CIMS PRO</Text>
          <Title>Sign In</Title>
          <Text style={styles.tagline}>Use the same account as the website</Text>
        </View>

        <View style={styles.form}>
          {!mfaUserId ? (
            <>
              <Text style={styles.label}>Work email</Text>
              <Input
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="you@lab.edu"
              />
              <Text style={styles.label}>Secure password</Text>
              <Input
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />
              <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotWrap}>
                <Text style={styles.forgot}>Forgot password?</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>Verification code</Text>
              <Input
                keyboardType="number-pad"
                value={otp}
                onChangeText={setOtp}
                placeholder="6-digit code"
              />
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            label={mfaUserId ? 'Verify & Continue' : 'Sign In'}
            onPress={onSubmit}
            loading={loading}
            disabled={!mfaUserId ? !email || !password : otp.length < 4}
          />

          {mfaUserId ? (
            <Button
              label="Back to login"
              variant="ghost"
              onPress={() => {
                setMfaUserId(null);
                setOtp('');
                setError('');
              }}
            />
          ) : (
            <Pressable onPress={() => navigation.navigate('Register')} style={styles.linkBtn}>
              <Text style={styles.linkText}>Create Account</Text>
            </Pressable>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { justifyContent: 'center' },
    back: { color: colors.muted, fontWeight: '700', marginBottom: 16 },
    hero: { marginBottom: 20 },
    brand: {
      color: colors.accent,
      fontWeight: '900',
      letterSpacing: 2,
      fontSize: 12,
      marginBottom: 8,
    },
    tagline: { color: colors.muted, marginTop: 6, fontSize: 13 },
    form: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 20,
      shadowColor: '#0f172a',
      shadowOpacity: 0.06,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 2,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    forgotWrap: { alignSelf: 'flex-end', marginBottom: 10, marginTop: -4 },
    forgot: { color: colors.accent, fontWeight: '700', fontSize: 13 },
    error: { color: colors.danger, marginBottom: 10, fontWeight: '600' },
    linkBtn: { alignItems: 'center', paddingVertical: 14, marginTop: 4 },
    linkText: { color: colors.accent, fontWeight: '800', fontSize: 15 },
  });
}
