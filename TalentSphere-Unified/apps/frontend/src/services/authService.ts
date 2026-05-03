import { supabase } from '../lib/supabaseClient';
import { apiClient } from '../api/axios';

export const authService = {
  register: async (email: string, pass: string, fullName: string, role: string) => {
    // 1. Backend sync (Spring Boot)
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || 'User';
    let backendData = null;
    try {
      const backendRes = await apiClient.post('/api/v1/auth/register', { 
        email, 
        password: pass, 
        firstName, 
        lastName, 
        roles: [role] 
      });
      backendData = backendRes.data;
    } catch (err) {
      console.warn("Backend sync failed, continuing with Supabase only:", err);
    }
    
    // 2. Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { data: { role, full_name: fullName } }
    });
    
    if (error) throw error;
    return { supabase: data, backend: backendData };
  },

  login: async (email: string, pass: string) => {
    // Backend login (for synchronized session verification)
    try {
      await apiClient.post('/api/v1/auth/login', { email, password: pass });
    } catch (err) {
      console.warn("Backend login failed, continuing with Supabase:", err);
    }
    
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
