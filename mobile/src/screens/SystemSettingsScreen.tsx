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
import { api } from '../api/client';
import { API_BASE_URL } from '../api/config';
import { useDialog } from '../context/DialogContext';
import { useTheme } from '../context/ThemeContext';
import { Button, Card, Input, Screen, Subtitle, Title } from '../components/ui';
import type { ThemeColors } from '../theme/colors';

type SettingsForm = {
  systemName: string;
  systemLogo: string;
  landingHero: string;
  favicon: string;
  orgName: string;
  defaultTheme: string;
  defaultNotificationSettings: { email: boolean; inApp: boolean };
  contactInfo: { email: string; phone: string };
  units: { volume: string; weight: string; temperature: string };
  alertThresholds: {
    lowStockPercent: number;
    expiryDaysWarning: number;
    hazardLimitAlert: boolean;
  };
};

const DEFAULTS: SettingsForm = {
  systemName: 'CIMS PRO',
  systemLogo: '',
  landingHero: '',
  favicon: '',
  orgName: '',
  defaultTheme: 'light',
  defaultNotificationSettings: { email: true, inApp: true },
  contactInfo: { email: '', phone: '' },
  units: { volume: 'L', weight: 'kg', temperature: 'C' },
  alertThresholds: { lowStockPercent: 10, expiryDaysWarning: 30, hazardLimitAlert: true },
};

function resolveAssetUrl(url?: string) {
  if (!url) return '';
  if (/^https?:\/\//i.test(url)) return url;
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return `${origin}${url.startsWith('/') ? '' : '/'}${url}`;
}

function ChipRow({
  options,
  value,
  onChange,
  colors,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  colors: ThemeColors;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
      {options.map((opt) => {
        const on = value === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onChange(opt)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: on ? colors.accent : colors.border,
              backgroundColor: on ? colors.accentSoft : colors.surface2,
            }}
          >
            <Text style={{ color: on ? colors.accent : colors.muted, fontWeight: '800', fontSize: 12 }}>
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function SystemSettingsScreen() {
  const { colors } = useTheme();
  const dialog = useDialog();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [form, setForm] = useState<SettingsForm>(DEFAULTS);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/settings');
        const s = data?.settings || data || {};
        setForm({
          ...DEFAULTS,
          ...s,
          defaultNotificationSettings: s.defaultNotificationSettings || DEFAULTS.defaultNotificationSettings,
          contactInfo: s.contactInfo || DEFAULTS.contactInfo,
          units: s.units || DEFAULTS.units,
          alertThresholds: s.alertThresholds || DEFAULTS.alertThresholds,
        });
      } catch {
        /* keep defaults */
      }
    })();
  }, []);

  const uploadImage = async (field: 'systemLogo' | 'landingHero' | 'favicon') => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        await dialog.alert('Permission needed', 'Allow photo library access to upload branding images.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.85,
        allowsEditing: field !== 'landingHero',
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const name = asset.fileName || `${field}.jpg`;
      const type = asset.mimeType || 'image/jpeg';
      const body = new FormData();
      body.append('image', {
        uri: asset.uri,
        name,
        type,
      } as any);

      setUploading(field);
      setError('');
      const { data } = await api.post('/upload', body, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (data?.url) {
        setForm((prev) => ({ ...prev, [field]: data.url }));
        setMsg('Image uploaded — save to commit.');
      }
    } catch (e: any) {
      setError(e.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setLoading(true);
    setMsg('');
    setError('');
    try {
      await api.put('/settings', form);
      setMsg('Global settings saved.');
    } catch (e: any) {
      setError(e.response?.data?.error || 'Save failed — Admin / MANAGE_SETTINGS required');
    } finally {
      setLoading(false);
    }
  };

  const AssetField = ({
    label,
    field,
    tall,
  }: {
    label: string;
    field: 'systemLogo' | 'landingHero' | 'favicon';
    tall?: boolean;
  }) => {
    const uri = resolveAssetUrl(form[field]);
    return (
      <View style={{ marginBottom: 14 }}>
        <Text style={styles.label}>{label}</Text>
        <Pressable
          onPress={() => void uploadImage(field)}
          style={[styles.uploadBox, tall && { height: 120 }]}
        >
          {uri ? (
            <Image source={{ uri }} style={styles.uploadPreview} resizeMode="cover" />
          ) : (
            <Text style={{ color: colors.muted, fontWeight: '700' }}>
              {uploading === field ? 'Uploading…' : 'Tap to upload image'}
            </Text>
          )}
        </Pressable>
        <Input
          value={form[field]}
          onChangeText={(v) => setForm((p) => ({ ...p, [field]: v }))}
          placeholder="Or paste image URL"
        />
      </View>
    );
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Title>System Settings</Title>
        <Subtitle>Branding, units, notifications, and safety thresholds</Subtitle>

        <Card>
          <Text style={styles.section}>Visual branding</Text>
          <Text style={styles.label}>Application title</Text>
          <Input
            value={form.systemName}
            onChangeText={(v) => setForm((p) => ({ ...p, systemName: v }))}
            placeholder="CIMS PRO"
          />
          <Text style={styles.label}>Organization</Text>
          <Input
            value={form.orgName}
            onChangeText={(v) => setForm((p) => ({ ...p, orgName: v }))}
            placeholder="Institution name"
          />
          <AssetField label="System logo" field="systemLogo" />
          <AssetField label="Landing hero banner" field="landingHero" tall />
          <AssetField label="Favicon" field="favicon" />
        </Card>

        <Card>
          <Text style={styles.section}>Regional & support</Text>
          <Text style={styles.label}>Default theme</Text>
          <ChipRow
            options={['light', 'dark', 'system']}
            value={form.defaultTheme}
            onChange={(v) => setForm((p) => ({ ...p, defaultTheme: v }))}
            colors={colors}
          />
          <Text style={styles.label}>Support email</Text>
          <Input
            value={form.contactInfo.email}
            onChangeText={(v) =>
              setForm((p) => ({ ...p, contactInfo: { ...p.contactInfo, email: v } }))
            }
            placeholder="support@lab.edu"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Text style={styles.label}>Support phone</Text>
          <Input
            value={form.contactInfo.phone}
            onChangeText={(v) =>
              setForm((p) => ({ ...p, contactInfo: { ...p.contactInfo, phone: v } }))
            }
            placeholder="+1 …"
            keyboardType="phone-pad"
          />
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>Email notifications</Text>
            <Switch
              value={form.defaultNotificationSettings.email}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  defaultNotificationSettings: { ...p.defaultNotificationSettings, email: v },
                }))
              }
              trackColor={{ true: colors.accent }}
            />
          </View>
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>In-app notifications</Text>
            <Switch
              value={form.defaultNotificationSettings.inApp}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  defaultNotificationSettings: { ...p.defaultNotificationSettings, inApp: v },
                }))
              }
              trackColor={{ true: colors.accent }}
            />
          </View>
        </Card>

        <Card>
          <Text style={styles.section}>Measurement standards</Text>
          <Text style={styles.label}>Volume</Text>
          <ChipRow
            options={['L', 'mL', 'gal']}
            value={form.units.volume}
            onChange={(v) => setForm((p) => ({ ...p, units: { ...p.units, volume: v } }))}
            colors={colors}
          />
          <Text style={styles.label}>Weight</Text>
          <ChipRow
            options={['kg', 'g', 'lb']}
            value={form.units.weight}
            onChange={(v) => setForm((p) => ({ ...p, units: { ...p.units, weight: v } }))}
            colors={colors}
          />
          <Text style={styles.label}>Temperature</Text>
          <ChipRow
            options={['C', 'F', 'K']}
            value={form.units.temperature}
            onChange={(v) => setForm((p) => ({ ...p, units: { ...p.units, temperature: v } }))}
            colors={colors}
          />
        </Card>

        <Card>
          <Text style={styles.section}>Safety & stock thresholds</Text>
          <Text style={styles.label}>Low stock percent</Text>
          <Input
            value={String(form.alertThresholds.lowStockPercent)}
            onChangeText={(v) =>
              setForm((p) => ({
                ...p,
                alertThresholds: {
                  ...p.alertThresholds,
                  lowStockPercent: Number(v) || 0,
                },
              }))
            }
            keyboardType="numeric"
          />
          <Text style={styles.label}>Expiry warning (days)</Text>
          <Input
            value={String(form.alertThresholds.expiryDaysWarning)}
            onChangeText={(v) =>
              setForm((p) => ({
                ...p,
                alertThresholds: {
                  ...p.alertThresholds,
                  expiryDaysWarning: Number(v) || 0,
                },
              }))
            }
            keyboardType="numeric"
          />
          <View style={styles.switchRow}>
            <Text style={{ color: colors.text, fontWeight: '700', flex: 1 }}>Hazard limit alerts</Text>
            <Switch
              value={form.alertThresholds.hazardLimitAlert}
              onValueChange={(v) =>
                setForm((p) => ({
                  ...p,
                  alertThresholds: { ...p.alertThresholds, hazardLimitAlert: v },
                }))
              }
              trackColor={{ true: colors.accent }}
            />
          </View>
        </Card>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        {msg ? <Text style={styles.ok}>{msg}</Text> : null}
        <Button label="Commit global changes" onPress={() => void save()} loading={loading} />
      </ScrollView>
    </Screen>
  );
}

function makeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: {
      color: colors.text,
      fontWeight: '900',
      fontSize: 16,
      marginBottom: 12,
    },
    label: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
    },
    uploadBox: {
      height: 88,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface2,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      marginBottom: 8,
    },
    uploadPreview: { width: '100%', height: '100%' },
    switchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
      gap: 12,
    },
    error: { color: colors.danger, fontWeight: '700', marginBottom: 8 },
    ok: { color: colors.success, fontWeight: '700', marginBottom: 8 },
  });
}
