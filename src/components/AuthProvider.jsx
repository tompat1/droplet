import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { authApi } from '../lib/apiClient';
import { AuthContext } from './AuthContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const payload = await authApi.me();
      setUser(payload.user);
      setError('');
    } catch (err) {
      setUser(null);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (input) => {
    const payload = await authApi.login(input);
    setUser(payload.user);
    return payload.user;
  }, []);

  const register = useCallback(async (input) => {
    const payload = await authApi.register(input);
    setUser(payload.user);
    return payload.user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (input) => {
    const payload = await authApi.updateProfile(input);
    setUser(payload.user);
    return payload.user;
  }, []);

  const value = useMemo(() => ({
    user,
    isAdmin: user?.isAdmin === true || user?.role === 'admin',
    isLoading,
    error,
    login,
    register,
    logout,
    updateProfile,
    refreshUser
  }), [error, isLoading, login, logout, refreshUser, register, updateProfile, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
