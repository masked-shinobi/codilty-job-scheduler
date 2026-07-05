import { useAuth } from '@clerk/clerk-react';
import { useCallback } from 'react';

/**
 * Hook that provides a getToken function for API calls.
 */
export function useApiToken() {
  const { getToken } = useAuth();

  const fetchToken = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error('Not authenticated');
    return token;
  }, [getToken]);

  return fetchToken;
}
