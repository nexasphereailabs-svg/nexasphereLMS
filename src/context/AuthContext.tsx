import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User as SupabaseUser } from '@supabase/supabase-js';

type Role = 'teacher' | 'student' | 'admin';

interface User {
  id: string;
  email: string;
  role: Role;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, role: Role) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile from Supabase metadata (since users table is not in schema)
  const fetchProfile = async (supabaseUser: SupabaseUser) => {
    try {
      // In this specific schema, we rely on user_metadata provided during sign-up
      const role = (supabaseUser.user_metadata?.role as Role) || 'student';
      const name = supabaseUser.user_metadata?.full_name || supabaseUser.email?.split('@')[0] || 'User';

      const newUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        role: role,
        name: name,
      };
      
      // Compare with current values to avoid redundant state updates
      const current = userRef.current;
      if (
        current &&
        current.id === newUser.id &&
        current.email === newUser.email &&
        current.role === newUser.role &&
        current.name === newUser.name
      ) {
        return;
      }
      
      setUser(newUser);
      userRef.current = newUser;
      setError(null);
    } catch (err: any) {
      console.error('Error setting user state:', err);
      setError(err?.message || 'Failed to initialize user session.');
      setUser(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    let authInitialized = false;

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase credentials missing.');
      setLoading(false);
      return;
    }

    const finishInitialization = () => {
      if (mounted && !authInitialized) {
        authInitialized = true;
        setLoading(false);
      }
    };

    // Listen for changes on auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('Auth event:', event);

      if (session?.user) {
        // Avoid setting state if user is same (minimizes re-renders on tab switch)
        // Use userRef.current to get the most recent state value
        if (!userRef.current || userRef.current.id !== session.user.id || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          fetchProfile(session.user).finally(() => {
            finishInitialization();
          });
        } else {
          finishInitialization();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        userRef.current = null;
        finishInitialization();
      } else {
        // For other events where session might be null briefly, don't immediately clear user
        // unless we are sure they are signed out to avoid ProtectedRoute flickers
        finishInitialization();
      }
    });

    // Immediate check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        if (session?.user) {
          fetchProfile(session.user).finally(() => finishInitialization());
        } else {
          finishInitialization();
        }
      }
    }).catch(err => {
      console.error('Session fetch error:', err);
      finishInitialization();
    });

    // Absolute fail-safe timeout (shortened to 2s for better UX)
    const timer = setTimeout(() => {
      finishInitialization();
    }, 2000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setError(loginError.message);
      throw loginError;
    }

    if (data.user) {
      // Ensure profile exists before finishing login
      await fetchProfile(data.user);
    }
  };

  const register = async (name: string, email: string, password: string, role: Role) => {
    setError(null);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          role: role,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      throw signUpError;
    }
  };

  const logout = async () => {
    setUser(null);
    userRef.current = null;
    setError(null);
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-xs uppercase tracking-widest text-gray-400">
        Initializing Session...
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isAuthenticated: !!user, error, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
