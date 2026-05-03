import { useCallback } from 'react';
import { supabase } from './supabaseClient';

export const getOAuthLoginUrl = (provider: 'google' | 'github'): string => {
  return `${window.location.origin}/auth/callback`;
};

export const initiateOAuthLogin = async (provider: 'google' | 'github'): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) {
    throw error;
  }
};

export const handleOAuthCallback = async (): Promise<boolean> => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
};

export const isOAuthConfigured = (): boolean => {
  return true; // Supabase handles OAuth configuration
};

export const signInWithGoogle = async (): Promise<any> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  });
  
  if (error) throw error;
  return data;
};

export const signInWithGitHub = async (): Promise<any> => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`
    }
  });
  
  if (error) throw error;
  return data;
};