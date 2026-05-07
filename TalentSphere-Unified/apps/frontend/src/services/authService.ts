import { supabase } from '../lib/supabaseClient';

export const authService = {
  register: async (email: string, pass: string, fullName: string, role: string) => {
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ') || 'User';
    
    // Supabase Auth signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
      options: { 
        data: { 
          role, 
          full_name: fullName,
          first_name: firstName,
          last_name: lastName
        } 
      }
    });
    
    if (error) throw error;
    return data;
  },

  login: async (email: string, pass: string) => {
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
  },

  getSession: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  updateUser: async (updates: { email?: string; password?: string; full_name?: string; avatar_url?: string }) => {
    const { data, error } = await supabase.auth.updateUser(updates);
    if (error) throw error;
    return data;
  }
};
