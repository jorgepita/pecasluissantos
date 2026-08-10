import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAdminCategories } from '@/features/admin/categories/useAdminCategories';
import { setCategoryActive } from '@/features/admin/categories/api';

export function CategoriesPage() {
  const { categories, loading, error, reload } = useAdminCategories();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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
          <table className="w-full min-w-[640px] border-collapse text-sm">
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
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Container>
  );
}
