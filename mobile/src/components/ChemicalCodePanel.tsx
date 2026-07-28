import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useTheme } from '../context/ThemeContext';
import type { ThemeColors } from '../theme/colors';

function buildQrValue(chemicalId: string) {
  const id = String(chemicalId || '').trim();
  if (!id) return 'CIMS';

  const webBase = (process.env.EXPO_PUBLIC_WEB_URL || '').replace(/\/$/, '');
  if (webBase) return `${webBase}/chemicals/details/${id}`;

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    // Expo web often runs on a different port than the Vite frontend; still encode a
    // details path so scanners extract the chemical id (parseScanCode).
    return `${window.location.origin}/chemicals/details/${id}`;
  }

  return id;
}

/** Visual barcode bars — same approach as web ChemicalDetails (not a font). */
function BarcodeBars({ value }: { value: string }) {
  const { colors } = useTheme();
  const chars = String(value || 'CIMS').split('');

  return (
    <View style={[styles.barcodeBars, { backgroundColor: '#fff', borderColor: colors.border }]}>
      {chars.map((ch, i) => (
        <View
          key={`${ch}-${i}`}
          style={{
            width: 2 + (ch.charCodeAt(0) % 3),
            height: '100%',
            backgroundColor: '#0f172a',
            opacity: 0.55 + ((ch.charCodeAt(0) % 5) * 0.08),
            borderRadius: 1,
          }}
        />
      ))}
    </View>
  );
}

export function ChemicalCodePanel({
  chemicalId,
  barcode,
  mode,
}: {
  chemicalId: string;
  barcode?: string;
  mode: 'qr' | 'barcode';
}) {
  const { colors } = useTheme();
  const stylesTheme = useMemo(() => makeThemeStyles(colors), [colors]);
  const qrValue = buildQrValue(chemicalId);
  const barcodeValue = barcode || chemicalId || 'NO BARCODE';

  return (
    <View style={stylesTheme.codeBox}>
      {mode === 'qr' ? (
        <>
          <View style={styles.qrWrap}>
            <QRCode
              value={qrValue}
              size={180}
              ecl="H"
              backgroundColor="#ffffff"
              color="#0f172a"
            />
          </View>
          <Text style={stylesTheme.qrLabel}>REG-{chemicalId}</Text>
        </>
      ) : (
        <>
          <BarcodeBars value={barcodeValue} />
          <Text style={stylesTheme.barcodeValue} numberOfLines={2}>
            {barcodeValue}
          </Text>
          <Text style={stylesTheme.codeHint}>{barcode ? 'MFG BARCODE' : 'REGISTRY ID'}</Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  qrWrap: {
    padding: 12,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  barcodeBars: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 1,
    height: 72,
    width: '100%',
    maxWidth: 280,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
});

function makeThemeStyles(colors: ThemeColors) {
  return StyleSheet.create({
    codeBox: {
      alignItems: 'center',
      paddingVertical: 16,
      paddingHorizontal: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 14,
      backgroundColor: colors.surface2,
      gap: 8,
    },
    qrLabel: {
      color: colors.muted,
      fontSize: 11,
      fontWeight: '800',
      letterSpacing: 1.5,
      textTransform: 'uppercase',
      marginTop: 4,
    },
    barcodeValue: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: 1,
      fontVariant: ['tabular-nums'],
      textAlign: 'center',
    },
    codeHint: {
      color: colors.muted,
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
  });
}
