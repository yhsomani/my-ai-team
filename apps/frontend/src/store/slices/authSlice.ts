import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  roles: string[];
}

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  session: null,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ user: User | null; session: Session | null }>) => {
      state.user = action.payload.user;
      state.session = action.payload.session as any; // Cast back to any internally if needed by RTK WritableDraft, but keep public API clean
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.session = null;
    },
  },
});

export const { setUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
