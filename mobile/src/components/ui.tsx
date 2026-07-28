import React from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16, paddingTop: 8, overflow: 'hidden' },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Title({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const { colors } = useTheme();
  return (
    <Text style={[{ fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }, style]}>
      {children}
    </Text>
  );
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text style={{ fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: 16 }}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.border,
          padding: 16,
          marginBottom: 12,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Input(props: React.ComponentProps<typeof TextInput>) {
  const { colors } = useTheme();
  return (
    <TextInput
      placeholderTextColor={colors.muted}
      {...props}
      style={[
        {
          backgroundColor: colors.surface2,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 12,
          color: colors.text,
          fontSize: 16,
          marginBottom: 12,
        },
        props.style,
      ]}
    />
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}) {
  const { colors } = useTheme();
  const bg =
    variant === 'primary' ? colors.accent : variant === 'danger' ? colors.danger : 'transparent';
  const textColor =
    variant === 'ghost' ? colors.accent : variant === 'danger' ? '#fff' : colors.btnText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        {
          borderRadius: 14,
          paddingVertical: 14,
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 4,
          backgroundColor: bg,
          opacity: disabled || loading ? 0.45 : pressed ? 0.85 : 1,
        },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface2 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={{ fontWeight: '800', fontSize: 15, letterSpacing: 0.3, color: textColor }}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
      <Text style={{ color: colors.text, fontWeight: '700', fontSize: 16 }}>{title}</Text>
      {body ? <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>{body}</Text> : null}
    </View>
  );
}

export function Badge({
  label,
  tone = 'muted',
}: {
  label: string;
  tone?: 'muted' | 'ok' | 'warn' | 'danger';
}) {
  const { colors } = useTheme();
  const map = {
    muted: colors.muted,
    ok: colors.success,
    warn: colors.warn,
    danger: colors.danger,
  };
  const color = map[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderColor: color,
        backgroundColor: `${color}22`,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          fontWeight: '800',
          textTransform: 'uppercase',
          color,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

export function ThemeToggleButton({ style }: { style?: ViewStyle }) {
  const { colors, theme, toggleTheme } = useTheme();
  return (
    <Pressable
      onPress={toggleTheme}
      style={[
        {
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface2,
        },
        style,
      ]}
      accessibilityLabel="Toggle theme"
    >
      <Ionicons
        name={theme === 'ink' ? 'moon-outline' : 'sunny-outline'}
        size={18}
        color={colors.text}
      />
    </Pressable>
  );
}

export function AuthBrandHeader({
  systemName,
  orgName,
  logoUrl,
  title,
  subtitle,
  ready = true,
}: {
  systemName: string;
  orgName?: string;
  logoUrl?: string;
  title?: string;
  subtitle?: string;
  /** When false, show a neutral placeholder instead of the default flask (avoids flash) */
  ready?: boolean;
}) {
  const { colors } = useTheme();
  const showLogo = Boolean(logoUrl);
  const showPlaceholder = !ready && !showLogo;

  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          backgroundColor: showLogo || showPlaceholder ? colors.surface2 : colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 12,
          overflow: 'hidden',
          borderWidth: showPlaceholder ? 1 : 0,
          borderColor: colors.border,
        }}
      >
        {showLogo ? (
          <Image source={{ uri: logoUrl }} style={{ width: 72, height: 72 }} resizeMode="contain" />
        ) : showPlaceholder ? (
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: colors.border }} />
        ) : (
          <Ionicons name="flask" size={36} color={colors.btnText} />
        )}
      </View>
      <Text style={{ color: colors.text, fontWeight: '900', fontSize: 22, letterSpacing: -0.3 }}>
        {title || systemName}
      </Text>
      {subtitle ? (
        <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center', lineHeight: 20 }}>
          {subtitle}
        </Text>
      ) : orgName ? (
        <Text style={{ color: colors.muted, marginTop: 6, textAlign: 'center' }}>{orgName}</Text>
      ) : null}
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Text
      style={{
        color: colors.muted,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontSize: 11,
        marginTop: 10,
        marginBottom: 8,
      }}
    >
      {children}
    </Text>
  );
}

export function CheckRow({
  label,
  checked,
  onToggle,
  danger,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: checked ? (danger ? colors.danger : colors.accent) : colors.border,
        backgroundColor: checked ? colors.accentSoft : colors.surface2,
        marginBottom: 8,
      }}
    >
      <View
        style={{
          width: 22,
          height: 22,
          borderRadius: 6,
          borderWidth: 2,
          borderColor: checked ? (danger ? colors.danger : colors.accent) : colors.border,
          backgroundColor: checked ? (danger ? colors.danger : colors.accent) : 'transparent',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {checked ? <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>✓</Text> : null}
      </View>
      <Text style={{ flex: 1, color: colors.text, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}
