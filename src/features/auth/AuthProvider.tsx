import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { AuthContext } from '@/features/auth/AuthContext';

/**
 * Wraps the app with the current Supabase Auth session.
 *
 * This is real Supabase Auth (email/password), not a placeholder — see
 * docs/ARCHITECTURE.md ("Authentication approach") for the full model,
 * including how the `admin` role is enforced at the database layer via
 * `is_admin()` and RLS, not by this context alone.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, signIn, signOut }}>{children}</AuthContext.Provider>
  );
}
