import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../api/axios';

export const authService = {
  register: async (email: string, pass: string, fullName: string, role: string) => {
    // 1. Backend sync (Spring Boot)
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || 'User';
    const backendRes = await apiClient.post('/api/v1/auth/register', { 
      email, 
      password: pass, 
      firstName, 
      lastName, 
      roles: [role] 
    });
    
    // 2. Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { role, full_name: fullName } }
    });
    
    if (error) throw error;
    return { supabase: data, backend: backendRes.data };
  },

  login: async (email: string, pass: string) => {
    // Backend login (for synchronized session verification)
    await apiClient.post('/api/v1/auth/login', { email, password: pass });
    
    // Supabase login (Primary identity provider)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
    return data;
  },

  logout: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  getCurrentUser: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  }
};
