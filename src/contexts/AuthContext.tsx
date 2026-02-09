import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: { nome: string; email: string } | null;
  role: string | null;
  modulosPermitidos: string[];
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  hasModuleAccess: (modulo: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<{ nome: string; email: string } | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [modulosPermitidos, setModulosPermitidos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUserData = async (userId: string) => {
    try {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from('profiles').select('nome, email').eq('user_id', userId).single(),
        supabase.from('user_roles').select('role').eq('user_id', userId).single(),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      
      const userRole = (roleRes.data?.role as string) || 'operador';
      setRole(userRole);

      const { data: modulos } = await supabase
        .from('role_modulos')
        .select('modulo')
        .eq('role', userRole as any);

      setModulosPermitidos((modulos || []).map((m: any) => m.modulo));
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        // Use setTimeout to avoid Supabase deadlock
        setTimeout(() => loadUserData(session.user.id), 0);
      } else {
        setUser(null);
        setProfile(null);
        setRole(null);
        setModulosPermitidos([]);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user);
        loadUserData(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const hasModuleAccess = (modulo: string) => {
    if (role === 'admin') return true;
    return modulosPermitidos.includes(modulo);
  };

  return (
    <AuthContext.Provider value={{ user, profile, role, modulosPermitidos, loading, signIn, signOut, hasModuleAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
