import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostgrestError } from '@supabase/supabase-js';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/features/admin/shared/ConfirmDialog';
import { pgErrorMessage } from '@/features/admin/shared/pgErrorMessage';
import { useAdminBrands } from '@/features/admin/brands/useAdminBrands';
import { deleteBrand, getBrandDeletionBlockers, setBrandActive } from '@/features/admin/brands/api';
import type { BrandRow } from '@/types/database';

export function BrandsPage() {
  const { brands, loading, error, reload } = useAdminBrands();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Same one-at-a-time assumption as CategoriesPage/ProductsPage.
  const [checkingDeleteId, setCheckingDeleteId] = useState<number | null>(null);
  const [brandToDelete, setBrandToDelete] = useState<BrandRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function toggleActive(id: number, nextActive: boolean) {
    setPendingId(id);
    setActionError(null);
    try {
      await setBrandActive(id, nextActive);
      reload();
    } catch {
      setActionError('Não foi possível atualizar o estado da marca.');
    } finally {
      setPendingId(null);
    }
  }

  /** "Eliminar" click: check for dependent products first, same reasoning
   * as CategoriesPage's handleDeleteClick — deletion is never offered when
   * the database would refuse it anyway. */
  async function handleDeleteClick(brand: BrandRow) {
    setActionError(null);
    setCheckingDeleteId(brand.id);
    try {
      const { productCount } = await getBrandDeletionBlockers(brand.id);
      if (productCount > 0) {
        setActionError(
          `Não é possível eliminar "${brand.name}" porque ${productCount === 1 ? 'existe 1 produto associado' : `existem ${productCount} produtos associados`}. Desative a marca ou reatribua/remova esses produtos primeiro.`,
        );
        return;
      }
      setBrandToDelete(brand);
    } catch {
      setActionError('Não foi possível verificar se esta marca pode ser eliminada.');
    } finally {
      setCheckingDeleteId(null);
    }
  }

  async function confirmDelete() {
    if (!brandToDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteBrand(brandToDelete.id);
      setBrandToDelete(null);
      reload();
    } catch (err) {
      setActionError(pgErrorMessage(err as PostgrestError, 'Não foi possível eliminar a marca.'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Marcas</h1>
        <Link to="/admin/marcas/nova">
          <Button>Nova marca</Button>
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar marcas...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-danger-500">{actionError}</p>}

      {!loading && !error && brands.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">Ainda não existem marcas.</p>
      )}

      {!loading && brands.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Slug</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-900">{brand.name}</td>
                  <td className="py-2 pr-4 text-slate-500">{brand.slug}</td>
                  <td className="py-2 pr-4">
                    <Badge tone={brand.is_active ? 'success' : 'neutral'}>
                      {brand.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/marcas/${brand.id}`}
                        className="text-sm text-brand-700 hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="text-sm text-slate-500 hover:underline disabled:opacity-50"
                        disabled={pendingId === brand.id}
                        onClick={() => void toggleActive(brand.id, !brand.is_active)}
                      >
                        {brand.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-danger-500 hover:underline disabled:opacity-50"
                        disabled={checkingDeleteId === brand.id}
                        aria-label={`Eliminar marca ${brand.name} definitivamente`}
                        onClick={() => void handleDeleteClick(brand)}
                      >
                        {checkingDeleteId === brand.id ? 'A verificar...' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={brandToDelete !== null}
        title="Eliminar marca definitivamente?"
        message={`Tem a certeza que pretende eliminar definitivamente "${brandToDelete?.name}"? Esta ação não pode ser revertida e remove o registo da base de dados — diferente de desativar, que apenas o esconde do catálogo público.`}
        confirmLabel="Eliminar definitivamente"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setBrandToDelete(null)}
      />
    </Container>
  );
}
