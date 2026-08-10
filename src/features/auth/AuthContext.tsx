import { createContext } from 'react';
import type { Session } from '@supabase/supabase-js';

export interface AuthContextValue {
  /** null = signed out, undefined = still resolving the initial session. */
  session: Session | null | undefined;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
