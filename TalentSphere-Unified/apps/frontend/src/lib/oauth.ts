import { useCallback } from 'react';
import axios from 'axios';

const AUTH_SERVICE_URL = import.meta.env.VITE_AUTH_SERVICE_URL || 'http://localhost:8081';

export const getOAuthLoginUrl = (provider: 'google' | 'github'): string => {
  return `${AUTH_SERVICE_URL}/auth/oauth2/authorization/${provider}`;
};

export const initiateOAuthLogin = (provider: 'google' | 'github'): void => {
  window.location.href = getOAuthLoginUrl(provider);
};

export const handleOAuthCallback = async (token: string): Promise<boolean> => {
  try {
    const response = await axios.get(`${AUTH_SERVICE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return true;
  } catch {
    return false;
  }
};

export const isOAuthConfigured = (): boolean => {
  return !!(import.meta.env.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GITHUB_CLIENT_ID);
};