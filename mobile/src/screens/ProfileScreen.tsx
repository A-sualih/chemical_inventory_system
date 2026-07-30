import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { useAuth } from '../context/AuthContext';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Input, Screen, SectionLabel, Subtitle, Title } from '../components/ui';
import { resolveAssetUrl } from '../utils/assets';
import type { ThemeColors } from '../theme/colors';

interface LabOption {
  _id: string;
  name: string;
  lab_code?: string;
}

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  profile_photo: string;
  mfa_enabled: boolean;
  email_preferences: { alerts: boolean; updates: boolean };
}

export default function ProfileScreen() {
  const { user, logout, switchActiveLab, updateUser, refreshUser } = useAuth();
  const dialog = useDialog();
  const { colors, theme, toggleTheme } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [labs, setLabs] = useState<LabOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{ type: 'error' | 'success' | 'info'; message: string } | null>(
    null
  );
  const [formData, setFormData] = useState<ProfileForm>({
    name: '',
    email: '',
    phone: '',
    profile_photo: '',
    mfa_enabled: false,
    email_preferences: { alerts: true, updates: false },
  });

  useEffect(() => {
    if (alert) {
      const t = setTimeout(() => setAlert(null), 5000);
      return () => clearTimeout(t);
    }
  }, [alert]);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [profileRes, labsRes] = await Promise.all([
          api.get('/profile/me'),
          api.get('/labs'),
        ]);
        const data = profileRes.data;
        setFormData({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          profile_photo: data.profile_photo || '',
          mfa_enabled: data.mfa_enabled || false,
          email_preferences: data.email_preferences || { alerts: true, updates: false },
        });
        const list = Array.isArray(labsRes.data) ? labsRes.data : labsRes.data.labs || [];
        setLabs(list);
      } catch {
        setAlert({ type: 'error', message: 'Failed to load identity matrix.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeId =
    typeof user?.active_lab === 'object' && user?.active_lab
      ? user.active_lab._id
      : user?.active_lab;

  const photoUri = resolveAssetUrl(formData.profile_photo);

  const handleFileUpload = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await dialog.alert('Permission needed', 'Allow photo library access to upload a profile photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: true,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const body = new FormData();
      body.append('image', {
        uri: asset.uri,
        name: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      } as any);

      setUploading(true);
      setAlert({ type: 'info', message: 'Uploading asset…' });
      const res = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data?.url) {
        const url = res.data.url;
        setFormData((prev) => ({ ...prev, profile_photo: url }));
        await api.put('/profile/me', { profile_photo: url });
        await updateUser({ profile_photo: url });
        setAlert({ type: 'success', message: 'Identity photo updated successfully.' });
      }
    } catch {
      setAlert({ type: 'error', message: 'Asset upload failed over secure connection.' });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      await api.put('/profile/me', formData);
      await updateUser({
        name: formData.name,
        phone: formData.phone,
        profile_photo: formData.profile_photo,
      });
      setAlert({ type: 'success', message: 'User identity synchronized successfully!' });
    } catch {
      setAlert({
        type: 'error',
        message: 'Authentication required to modify core identity parameters.',
      });
    } finally {
      setSaving(false);
    }
  };

  const onSwitch = async (labId: string) => {
    const result = await switchActiveLab(labId);
    setAlert({
      type: result.success ? 'success' : 'error',
      message: result.success ? 'Active lab updated.' : result.error || 'Switch failed',
    });
  };

  if (loading) {
    return (
      <Screen>
        <Title>User Identity</Title>
        <Subtitle>Synchronizing Identity Credentials…</Subtitle>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>User Identity</Title>
        <Subtitle>Manage credentials, notifications, and core parameters.</Subtitle>

        {alert ? (
          <View
            style={[
              styles.toast,
              {
                backgroundColor:
                  alert.type === 'error'
                    ? colors.danger
                    : alert.type === 'info'
                      ? colors.accent
                      : colors.success,
              },
            ]}
          >
            <Text style={styles.toastText}>{alert.message}</Text>
          </View>
        ) : null}

        <SectionLabel>Personal Identity</SectionLabel>
        <Card>
          <Text style={styles.label}>Identity Photo</Text>
          <Pressable onPress={() => void handleFileUpload()} style={styles.photoRow}>
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoInitial}>
                  {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.photoAction}>{uploading ? 'Uploading…' : 'Tap to change photo'}</Text>
              <Text style={styles.meta}>Role: {user?.role}</Text>
            </View>
            <Ionicons name="camera-outline" size={22} color={colors.accent} />
          </Pressable>

          <Text style={styles.label}>Full Name</Text>
          <Input
            value={formData.name}
            onChangeText={(v) => setFormData((p) => ({ ...p, name: v }))}
            placeholder="Enter your full name"
          />

          <Text style={styles.label}>Email Address</Text>
          <Input
            value={formData.email}
            onChangeText={(v) => setFormData((p) => ({ ...p, email: v }))}
            placeholder="Enter your email"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Secure Phone Registry</Text>
          <Input
            value={formData.phone}
            onChangeText={(v) => setFormData((p) => ({ ...p, phone: v }))}
            placeholder="+1 (555) 000-0000"
            keyboardType="phone-pad"
          />
        </Card>

        <SectionLabel>Security Protocol</SectionLabel>
        <Card>
          <PrefToggle
            label="Multi-Factor Authentication (MFA)"
            desc="Require an SMS or App code on every login."
            value={formData.mfa_enabled}
            onChange={(v) => setFormData((p) => ({ ...p, mfa_enabled: v }))}
            colors={colors}
          />
        </Card>

        <SectionLabel>Notification Architecture</SectionLabel>
        <Card>
          <PrefToggle
            label="System Threat Alerts"
            desc="Critical inventory & threshold warnings"
            value={formData.email_preferences.alerts}
            onChange={(v) =>
              setFormData((p) => ({
                ...p,
                email_preferences: { ...p.email_preferences, alerts: v },
              }))
            }
            colors={colors}
          />
          <PrefToggle
            label="Release Updates"
            desc="Patch notes and new feature announcements"
            value={formData.email_preferences.updates}
            onChange={(v) =>
              setFormData((p) => ({
                ...p,
                email_preferences: { ...p.email_preferences, updates: v },
              }))
            }
            colors={colors}
          />
        </Card>

        <Button label="Commit Data Protocol" onPress={() => void handleSave()} loading={saving} />

        <SectionLabel>Appearance</SectionLabel>
        <Card>
          <View style={styles.themeRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.prefLabel}>Theme toggle</Text>
              <Text style={styles.meta}>{theme === 'ink' ? 'Ink (dark)' : 'Paper (light)'}</Text>
            </View>
            <Switch
              value={theme === 'ink'}
              onValueChange={toggleTheme}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor="#fff"
            />
          </View>
        </Card>

        <SectionLabel>Active lab</SectionLabel>
        {labs.map((lab) => {
          const selected = String(activeId) === String(lab._id);
          return (
            <Card
              key={lab._id}
              style={
                selected
                  ? { borderColor: colors.accent, backgroundColor: colors.accentSoft }
                  : undefined
              }
            >
              <View style={styles.labRow}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.prefLabel} numberOfLines={1}>
                    {lab.name}
                  </Text>
                  {lab.lab_code ? (
                    <Text style={styles.meta} numberOfLines={1}>
                      {lab.lab_code}
                    </Text>
                  ) : null}
                </View>
                {selected ? (
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>Active</Text>
                  </View>
                ) : (
                  <Pressable style={styles.switchPill} onPress={() => void onSwitch(lab._id)}>
                    <Text style={styles.switchPillText}>Switch</Text>
                  </Pressable>
                )}
              </View>
            </Card>
          );
        })}

        <Text style={styles.apiMeta}>API {API_BASE_URL}</Text>
        <Button label="Sign out" variant="danger" onPress={() => void logout()} />
      </ScrollView>
    </Screen>
  );
}

function PrefToggle({
  label,
  desc,
  value,
  onChange,
  colors,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (v: boolean) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={[prefStyles.row, value && { borderColor: colors.accent }]}>
      <View style={{ flex: 1 }}>
        <Text style={[prefStyles.label, { color: colors.text }]}>{label}</Text>
        <Text style={[prefStyles.desc, { color: colors.muted }]}>{desc}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const prefStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  label: { fontWeight: '800', fontSize: 14 },
  desc: { fontSize: 12, marginTop: 2 },
});

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    toast: {
      padding: 14,
      borderRadius: 14,
      marginBottom: 12,
    },
    toastText: { color: '#fff', fontWeight: '700' },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      marginTop: 4,
    },
    photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
    photo: { width: 64, height: 64, borderRadius: 32 },
    photoPlaceholder: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    photoInitial: { color: colors.text, fontWeight: '900', fontSize: 24 },
    photoAction: { color: colors.text, fontWeight: '800' },
    meta: { color: colors.muted, fontSize: 12, marginTop: 2 },
    prefLabel: { color: colors.text, fontWeight: '800', fontSize: 15 },
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    labRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    activePill: {
      backgroundColor: colors.success,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minWidth: 88,
      alignItems: 'center',
      justifyContent: 'center',
    },
    activePillText: {
      color: '#fff',
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 0.2,
    },
    switchPill: {
      backgroundColor: colors.accent,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 10,
      minWidth: 88,
      alignItems: 'center',
      justifyContent: 'center',
    },
    switchPillText: {
      color: colors.btnText,
      fontWeight: '800',
      fontSize: 13,
      letterSpacing: 0.2,
    },
    apiMeta: { color: colors.muted, fontSize: 11, marginVertical: 12, opacity: 0.7 },
  });
}
