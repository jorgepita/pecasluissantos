import { Routes, Route } from 'react-router-dom';
import { PublicLayout } from '@/layouts/PublicLayout';
import { AdminLayout } from '@/layouts/AdminLayout';
import { HomePage } from '@/pages/public/HomePage';
import { CataloguePage } from '@/pages/public/CataloguePage';
import { ProductDetailPage } from '@/pages/public/ProductDetailPage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { LoginPage } from '@/pages/admin/LoginPage';
import { DashboardPage } from '@/pages/admin/DashboardPage';
import { CategoriesPage } from '@/pages/admin/CategoriesPage';
import { CategoryFormPage } from '@/pages/admin/CategoryFormPage';
import { BrandsPage } from '@/pages/admin/BrandsPage';
import { BrandFormPage } from '@/pages/admin/BrandFormPage';
import { ProductsPage } from '@/pages/admin/ProductsPage';
import { ProductFormPage } from '@/pages/admin/ProductFormPage';
import { SettingsPage } from '@/pages/admin/SettingsPage';
import { RequireAuth } from '@/features/auth/RequireAuth';

/**
 * Top-level route table. Public and admin routes are deliberately kept in
 * separate layout trees (`PublicLayout` / `AdminLayout`) so the two areas
 * never share chrome or accidentally leak admin-only UI into the storefront.
 * Every `/admin/*` route below `RequireAuth` is a UX convenience only —
 * the actual write protection is RLS (see docs/ARCHITECTURE.md).
 */
export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/produtos" element={<CataloguePage />} />
        <Route path="/produtos/:slug" element={<ProductDetailPage />} />
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

        <Route path="categorias" element={<CategoriesPage />} />
        <Route path="categorias/nova" element={<CategoryFormPage />} />
        <Route path="categorias/:id" element={<CategoryFormPage />} />

        <Route path="marcas" element={<BrandsPage />} />
        <Route path="marcas/nova" element={<BrandFormPage />} />
        <Route path="marcas/:id" element={<BrandFormPage />} />

        <Route path="produtos" element={<ProductsPage />} />
        <Route path="produtos/novo" element={<ProductFormPage />} />
        <Route path="produtos/:id" element={<ProductFormPage />} />

        <Route path="definicoes" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
