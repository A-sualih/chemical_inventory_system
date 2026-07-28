import { useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { roleMatches } from '../utils/roles';

/** Procurement Hub and nested screens — Lab Manager only (matches web). */
export function useLabManagerOnly() {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const allowed = roleMatches(user?.role, ['Lab Manager']);

  useEffect(() => {
    if (!allowed) {
      if (navigation.canGoBack()) navigation.goBack();
      else navigation.navigate('Main');
    }
  }, [allowed, navigation]);

  return allowed;
}
