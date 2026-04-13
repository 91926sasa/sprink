import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api.js';

interface User {
  id: string;
  name: string;
  avatarUrl?: string;
  provider: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  authenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    authenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const data = await authApi.me();
      setState({
        user: data.user,
        authenticated: data.authenticated,
        loading: false,
      });
    } catch {
      setState({ user: null, authenticated: false, loading: false });
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(async (provider: string) => {
    const data = await authApi.login(provider);
    if (data.success) {
      await checkAuth();
    }
    return data;
  }, [checkAuth]);

  const logout = useCallback(async () => {
    await authApi.logout();
    setState({ user: null, authenticated: false, loading: false });
  }, []);

  return { ...state, login, logout, checkAuth };
}
