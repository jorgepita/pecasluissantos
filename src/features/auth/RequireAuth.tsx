import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Route guard for the admin area. This is a UX convenience only —
 * it stops a signed-out browser from rendering admin pages, but it is NOT
 * the security boundary. Data access is enforced by Supabase RLS policies
 * (`is_admin()`), so a determined client still can't read/write admin-only
 * data even if this component were bypassed. See docs/ARCHITECTURE.md.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const location = useLocation();

  if (session === undefined) {
    return null;
  }

  if (session === null) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return children;
}
