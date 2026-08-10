import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAdminBrands } from '@/features/admin/brands/useAdminBrands';
import { setBrandActive } from '@/features/admin/brands/api';

export function BrandsPage() {
  const { brands, loading, error, reload } = useAdminBrands();
  const [pendingId, setPendingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
          <table className="w-full min-w-[480px] border-collapse text-sm">
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
