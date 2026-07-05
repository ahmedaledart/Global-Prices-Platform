import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: any;
  platformUser: any | null;
  loading: boolean;
  signOut: () => Promise<void>;
  statusMessage: { ar: string; en: string } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any>(null);
  const [platformUser, setPlatformUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        setLoading(true);

        const { data } = await supabase.auth.getSession();
        const currentUser = data.session?.user ?? null;

        if (!isMounted) return;

        setUser(currentUser);

        if (currentUser) {
          setPlatformUser({
            email: currentUser.email || '',
            full_name: currentUser.email || 'مستخدم مسجل',
            approval_status: 'approved',
            is_active: true,
          });
        } else {
          setPlatformUser(null);
        }
      } catch (err) {
        console.error('Auth initialization error:', err);

        if (isMounted) {
          setUser(null);
          setPlatformUser(null);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;

      setUser(currentUser);

      if (currentUser) {
        setPlatformUser({
          email: currentUser.email || '',
          full_name: currentUser.email || 'مستخدم مسجل',
          approval_status: 'approved',
          is_active: true,
        });
      } else {
        setPlatformUser(null);
      }

      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error('Signout error:', err);
    } finally {
      setUser(null);
      setPlatformUser(null);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        platformUser,
        loading,
        signOut,
        statusMessage: null,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};
