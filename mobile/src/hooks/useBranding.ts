import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { api } from '../api/client';
import { resolveAssetUrl } from '../utils/assets';
import { storageGet, storageSet } from '../utils/storage';

const CACHE_KEY = 'cims_branding_cache';

export type Branding = {
  systemName: string;
  orgName: string;
  logoUrl: string;
  heroUrl: string;
  /** True until first successful network (or failed) fetch completes */
  loading: boolean;
  /** True once we know branding (from cache or network) — use to avoid flask→logo flash */
  ready: boolean;
};

type CachedBranding = {
  systemName?: string;
  orgName?: string;
  systemLogo?: string;
  landingHero?: string;
};

function readWebCache(): CachedBranding | null {
  if (Platform.OS !== 'web') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedBranding) : null;
  } catch {
    return null;
  }
}

/** Load public branding from /settings — cached so logo/name don't flash defaults. */
export function useBranding(): Branding {
  const webCache = readWebCache();
  const [systemName, setSystemName] = useState(webCache?.systemName || 'CIMS PRO');
  const [orgName, setOrgName] = useState(webCache?.orgName || 'Managed Stack');
  const [logoUrl, setLogoUrl] = useState(() => resolveAssetUrl(webCache?.systemLogo || ''));
  const [heroUrl, setHeroUrl] = useState(() => resolveAssetUrl(webCache?.landingHero || ''));
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(Boolean(webCache));

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Native: hydrate SecureStore cache before network
      if (Platform.OS !== 'web') {
        try {
          const raw = await storageGet(CACHE_KEY);
          if (raw && !cancelled) {
            const cached = JSON.parse(raw) as CachedBranding;
            if (cached.systemName) setSystemName(cached.systemName);
            if (cached.orgName) setOrgName(cached.orgName);
            setLogoUrl(resolveAssetUrl(cached.systemLogo || ''));
            setHeroUrl(resolveAssetUrl(cached.landingHero || ''));
            setReady(true);
          }
        } catch {
          /* ignore */
        }
      }

      try {
        const { data } = await api.get('/settings');
        if (cancelled) return;
        const s = data?.settings || data || {};
        const next: CachedBranding = {
          systemName: s.systemName || 'CIMS PRO',
          orgName: s.orgName || 'Managed Stack',
          systemLogo: s.systemLogo || '',
          landingHero: s.landingHero || '',
        };
        setSystemName(next.systemName!);
        setOrgName(next.orgName!);
        setLogoUrl(resolveAssetUrl(next.systemLogo));
        setHeroUrl(resolveAssetUrl(next.landingHero));
        await storageSet(CACHE_KEY, JSON.stringify(next));
      } catch {
        /* offline — keep cache/defaults */
      } finally {
        if (!cancelled) {
          setLoading(false);
          setReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return { systemName, orgName, logoUrl, heroUrl, loading, ready };
}
