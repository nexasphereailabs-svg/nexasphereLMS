import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

const getCredentials = () => {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
  return { url, key };
};

export const getSupabase = (): SupabaseClient => {
  if (!supabaseInstance) {
    const { url, key } = getCredentials();

    if (!url || !key) {
      console.error('Supabase credentials missing:', { url: !!url, key: !!key });
      throw new Error('Supabase credentials missing. Please check your .env file.');
    }

    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
};

/**
 * Creates a separate Supabase client instance that does not persist or manage sessions.
 * This is used for admin tasks (like creating users) to avoid logging out the admin.
 */
export const createAdminAuthClient = () => {
  const { url, key } = getCredentials();
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
};

// Export a proxy to ensure we always use a valid client initialized with the latest env vars
export const supabase = new Proxy({} as SupabaseClient, {
  get: (_target, prop) => {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});
