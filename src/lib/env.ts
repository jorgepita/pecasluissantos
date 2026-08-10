/**
 * Typed, validated access to build-time environment variables.
 *
 * Vite only exposes variables prefixed `VITE_` to client code (see
 * https://vite.dev/guide/env-and-mode) — this is what keeps
 * server-only secrets (e.g. a Supabase service-role key) out of the
 * client bundle by construction. Never add a non-`VITE_`-prefixed secret
 * here expecting it to be reachable from the browser, and never add a
 * privileged key here at all.
 */

interface ClientEnv {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

function readEnv(): ClientEnv {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const missing: string[] = [];
  if (!supabaseUrl) missing.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missing.push('VITE_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    // Fail loudly in the console rather than silently limping along with an
    // unusable Supabase client — but don't throw at module scope, so a
    // build without credentials still succeeds (e.g. CI, or previewing the
    // static shell before Supabase is provisioned).
    // eslint-disable-next-line no-console
    console.error(
      `Missing required environment variable(s): ${missing.join(', ')}. ` +
        'Copy .env.example to .env.local and fill in your Supabase project credentials.',
    );
  }

  return {
    supabaseUrl: supabaseUrl ?? '',
    supabaseAnonKey: supabaseAnonKey ?? '',
  };
}

export const env = readEnv();
