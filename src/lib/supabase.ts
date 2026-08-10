import { createClient } from '@supabase/supabase-js';
import { env } from '@/lib/env';
import type { Database } from '@/types/database';

/**
 * Single shared Supabase client for the whole app.
 *
 * This uses the PUBLIC anon key only — safe to ship in client code because
 * every table it can reach is protected by Row Level Security policies
 * (see supabase/migrations and docs/DATABASE.md). It must never be
 * constructed with a service-role key or database password.
 */
export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey);
