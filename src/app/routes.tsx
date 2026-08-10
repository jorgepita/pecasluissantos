import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { HomePage } from '@/pages/public/HomePage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { LoginPage } from '@/pages/admin/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { RequireAuth } from '@/features/auth/RequireAuth';

/**
 * Top-level route table. Public and admin routes are deliberately kept in
 * separate layout trees (`PublicLayout` / `AdminLayout`) so the two areas
 * never share chrome or accidentally leak admin-only UI into the storefront.
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="/admin/login" element={<LoginPage />} />

      <Route
        path="/admin"
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
      </Route>
    </Routes>
  );
}
