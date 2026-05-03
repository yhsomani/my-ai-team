
const mockSession = {
  user: {
    id: 'mock-user-id',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
  },
  access_token: 'mock-token',
};

let authCallback: any = null;
const getStoredUser = () => {
  const user = localStorage.getItem('mock-user');
  return user ? JSON.parse(user) : null;
};
let currentUser: any = getStoredUser();

const saveUser = (user: any) => {
  currentUser = user;
  if (user) localStorage.setItem('mock-user', JSON.stringify(user));
  else localStorage.removeItem('mock-user');
};


export const supabaseMock = {
  auth: {
    signUp: async ({ email }: any) => {
      saveUser({ id: 'mock-id', email, user_metadata: { full_name: 'New User' } });
      return { data: { user: currentUser }, error: null };
    },

    signInWithPassword: async ({ email }: any) => {
      const isAdmin = email.includes('admin');
      const isRecruiter = email.includes('hiring');
      const roles = [];
      if (isAdmin) roles.push('ROLE_ADMIN', 'ROLE_RECRUITER');
      else if (isRecruiter) roles.push('ROLE_RECRUITER');
      else roles.push('ROLE_USER');

      saveUser({ 
        id: 'mock-id', 
        email, 
        app_metadata: { roles },
        user_metadata: { 
          full_name: email.split('@')[0],
          role: isAdmin ? 'ADMIN' : (isRecruiter ? 'RECRUITER' : 'TALENT')
        } 
      });

      const session = { user: currentUser, access_token: 'mock-token' };
      if (authCallback) authCallback('SIGNED_IN', session);
      return { data: { session, user: currentUser }, error: null };
    },



    signOut: async () => {
      saveUser(null);
      if (authCallback) authCallback('SIGNED_OUT', null);
      return { error: null };
    },

    getSession: async () => ({ data: { session: currentUser ? { user: currentUser, access_token: 'mock-token' } : null }, error: null }),
    onAuthStateChange: (callback: any) => {
      authCallback = callback;
      // Don't auto-sign in here to allow manual login testing
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    getUser: async () => ({ data: { user: currentUser }, error: null }),
  },


  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: {}, error: null }),
        maybeSingle: async () => ({ data: {}, error: null }),
      }),
      order: () => ({
        limit: async () => ({ data: [], error: null }),
      }),
    }),
    insert: async () => ({ data: {}, error: null }),
    update: async () => ({ data: {}, error: null }),
    delete: async () => ({ data: {}, error: null }),
  }),
};
