import { supabaseMock } from './mockSupabase';

// Mocked for testing because the external Supabase URL is currently unreachable
export const supabase = supabaseMock as any;

