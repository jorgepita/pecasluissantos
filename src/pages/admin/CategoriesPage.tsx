import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { PostgrestError } from '@supabase/supabase-js';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/features/admin/shared/ConfirmDialog';
import { pgErrorMessage } from '@/features/admin/shared/pgErrorMessage';
import { useAdminCategories } from '@/features/admin/categories/useAdminCategories';
import {
  deleteCategory,
  getCategoryDeletionBlockers,
  setCategoryActive,
} from '@/features/admin/categories/api';
import type { CategoryRow } from '@/types/database';

export function CategoriesPage() {
  const { categories, loading, error, reload } = useAdminCategories();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  // Checking dependencies is async (two count queries) — disable that row's
  // "Eliminar" while it's in flight, same one-at-a-time assumption as
  // ProductsPage's busyProductId.
  const [checkingDeleteId, setCheckingDeleteId] = useState<number | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  async function toggleActive(id: number, nextActive: boolean) {
    setPendingId(id);
    setActionError(null);
    try {
      await setCategoryActive(id, nextActive);
      reload();
    } catch {
      setActionError('Não foi possível atualizar o estado da categoria.');
    } finally {
      setPendingId(null);
    }
  }

  /** "Eliminar" click: check dependencies first. If either a product or a
   * subcategory references this category, block deletion outright with a
   * specific PT-PT reason instead of opening the confirmation — permanent
   * deletion is never offered when the database would refuse it anyway. */
  async function handleDeleteClick(category: CategoryRow) {
    setActionError(null);
    setCheckingDeleteId(category.id);
    try {
      const { productCount, childCategoryCount } = await getCategoryDeletionBlockers(category.id);
      if (productCount > 0 || childCategoryCount > 0) {
        const reasons: string[] = [];
        if (productCount > 0) {
          reasons.push(
            `${productCount} ${productCount === 1 ? 'produto associado' : 'produtos associados'}`,
          );
        }
        if (childCategoryCount > 0) {
          reasons.push(
            `${childCategoryCount} ${childCategoryCount === 1 ? 'subcategoria associada' : 'subcategorias associadas'}`,
          );
        }
        setActionError(
          `Não é possível eliminar "${category.name}" porque existem ${reasons.join(' e ')}. Desative a categoria ou reatribua/remova esses registos primeiro.`,
        );
        return;
      }
      setCategoryToDelete(category);
    } catch {
      setActionError('Não foi possível verificar se esta categoria pode ser eliminada.');
    } finally {
      setCheckingDeleteId(null);
    }
  }

  async function confirmDelete() {
    if (!categoryToDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      reload();
    } catch (err) {
      setActionError(
        pgErrorMessage(err as PostgrestError, 'Não foi possível eliminar a categoria.'),
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Categorias</h1>
        <Link to="/admin/categorias/nova">
          <Button>Nova categoria</Button>
        </Link>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar categorias...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-danger-500">{actionError}</p>}

      {!loading && !error && categories.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">Ainda não existem categorias.</p>
      )}

      {!loading && categories.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Slug</th>
                <th className="py-2 pr-4 font-medium">Categoria-mãe</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-900">{category.name}</td>
                  <td className="py-2 pr-4 text-slate-500">{category.slug}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {category.parent_id ? (categoryById.get(category.parent_id)?.name ?? '—') : '—'}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge tone={category.is_active ? 'success' : 'neutral'}>
                      {category.is_active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex gap-2">
                      <Link
                        to={`/admin/categorias/${category.id}`}
                        className="text-sm text-brand-700 hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="text-sm text-slate-500 hover:underline disabled:opacity-50"
                        disabled={pendingId === category.id}
                        onClick={() => void toggleActive(category.id, !category.is_active)}
                      >
                        {category.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-danger-500 hover:underline disabled:opacity-50"
                        disabled={checkingDeleteId === category.id}
                        aria-label={`Eliminar categoria ${category.name} definitivamente`}
                        onClick={() => void handleDeleteClick(category)}
                      >
                        {checkingDeleteId === category.id ? 'A verificar...' : 'Eliminar'}
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
        open={categoryToDelete !== null}
        title="Eliminar categoria definitivamente?"
        message={`Tem a certeza que pretende eliminar definitivamente "${categoryToDelete?.name}"? Esta ação não pode ser revertida e remove o registo da base de dados — diferente de desativar, que apenas o esconde do catálogo público.`}
        confirmLabel="Eliminar definitivamente"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setCategoryToDelete(null)}
      />
    </Container>
  );
}
