import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/features/admin/shared/ConfirmDialog';
import { useAdminCategories } from '@/features/admin/categories/useAdminCategories';
import { useAdminBrands } from '@/features/admin/brands/useAdminBrands';
import { useAdminProducts } from '@/features/admin/products/useAdminProducts';
import {
  deleteProduct,
  getAdminProductById,
  updateProductStatus,
  type AdminProductListItem,
  type ProductDuplicateSeed,
} from '@/features/admin/products/api';
import { formatPrice } from '@/features/catalogue/format';
import type { ProductStatus } from '@/types/database';

const STATUS_LABEL: Record<ProductStatus, string> = {
  draft: 'Rascunho',
  available: 'Disponível',
  reserved: 'Reservado',
  sold: 'Vendido',
  unavailable: 'Indisponível',
};

const STATUS_TONE: Record<ProductStatus, 'success' | 'neutral' | 'warning' | 'danger'> = {
  draft: 'neutral',
  available: 'success',
  reserved: 'warning',
  sold: 'neutral',
  unavailable: 'danger',
};

const controlClasses =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

export function ProductsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ProductStatus | ''>('');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [productToDelete, setProductToDelete] = useState<AdminProductListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // One shared "in flight" id — the quick-publish and duplicate actions
  // never overlap for the same row (both disable that row's buttons),
  // and only one row is ever acted on at a time.
  const [busyProductId, setBusyProductId] = useState<number | null>(null);

  const { categories } = useAdminCategories();
  const { brands } = useAdminBrands();

  const { items, loading, error, reload } = useAdminProducts({
    search: search || undefined,
    status: status || undefined,
    categoryId: categoryId ? Number(categoryId) : undefined,
    brandId: brandId ? Number(brandId) : undefined,
  });

  async function confirmDelete() {
    if (!productToDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteProduct(productToDelete.id);
      setProductToDelete(null);
      reload();
    } catch {
      setActionError('Não foi possível eliminar o produto.');
    } finally {
      setDeleting(false);
    }
  }

  /** Quick visibility flip — "Despublicar" when live, "Publicar"
   * otherwise. Deliberately only ever targets these two states; a
   * draft/reserved/sold transition stays a deliberate choice made in the
   * full edit form, not a one-click list action. */
  async function toggleAvailability(item: AdminProductListItem) {
    setActionError(null);
    setBusyProductId(item.id);
    try {
      await updateProductStatus(item.id, item.status === 'available' ? 'unavailable' : 'available');
      reload();
    } catch {
      setActionError('Não foi possível atualizar a publicação do produto.');
    } finally {
      setBusyProductId(null);
    }
  }

  /** Fetches the full row (the list row alone doesn't carry description/
   * compatibility notes) and hands it to the "new product" form via
   * router state — see ProductFormPage/ProductForm's `initialValues`.
   * Nothing is written here; duplication only takes effect once the admin
   * actually saves the prefilled form. */
  async function duplicateProduct(item: AdminProductListItem) {
    setActionError(null);
    setBusyProductId(item.id);
    try {
      const full = await getAdminProductById(item.id);
      if (!full) {
        setActionError('Não foi possível carregar o produto para duplicar.');
        return;
      }
      const duplicateFrom: ProductDuplicateSeed = {
        name: `${full.name} (cópia)`,
        short_description: full.short_description,
        description: full.description,
        category_id: full.category_id,
        brand_id: full.brand_id,
        condition: full.condition,
        price: full.price,
        currency: full.currency,
        compatibility_notes: full.compatibility_notes,
      };
      navigate('/admin/produtos/novo', { state: { duplicateFrom } });
    } catch {
      setActionError('Não foi possível carregar o produto para duplicar.');
    } finally {
      setBusyProductId(null);
    }
  }

  return (
    <Container className="py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl">Produtos</h1>
        <Link to="/admin/produtos/novo">
          <Button>Novo produto</Button>
        </Link>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Pesquisar por nome ou referência..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="lg:col-span-2"
          aria-label="Pesquisar produtos"
        />
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as ProductStatus | '')}
          className={controlClasses}
          aria-label="Filtrar por publicação"
        >
          <option value="">Todos os estados</option>
          {Object.entries(STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={(event) => setCategoryId(event.target.value)}
          className={controlClasses}
          aria-label="Filtrar por categoria"
        >
          <option value="">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={brandId}
          onChange={(event) => setBrandId(event.target.value)}
          className={controlClasses}
          aria-label="Filtrar por marca"
        >
          <option value="">Todas as marcas</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar produtos...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}
      {actionError && <p className="mt-4 text-sm text-danger-500">{actionError}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="mt-6 text-sm text-slate-500">
          Nenhum produto encontrado com estes critérios.
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-2 pr-4 font-medium">Nome</th>
                <th className="py-2 pr-4 font-medium">Referência</th>
                <th className="py-2 pr-4 font-medium">Categoria</th>
                <th className="py-2 pr-4 font-medium">Marca</th>
                <th className="py-2 pr-4 font-medium">Preço</th>
                <th className="py-2 pr-4 font-medium">Estado</th>
                <th className="py-2 pr-4 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-900">{item.name}</td>
                  <td className="py-2 pr-4 text-slate-500">{item.primaryReference}</td>
                  <td className="py-2 pr-4 text-slate-500">{item.categoryName}</td>
                  <td className="py-2 pr-4 text-slate-500">{item.brandName ?? '—'}</td>
                  <td className="py-2 pr-4 text-slate-500">
                    {formatPrice(item.price, item.currency)}
                  </td>
                  <td className="py-2 pr-4">
                    <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/admin/produtos/${item.id}`}
                        className="text-sm text-brand-700 hover:underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="text-sm text-brand-700 hover:underline disabled:pointer-events-none disabled:opacity-50"
                        disabled={busyProductId === item.id}
                        onClick={() => void toggleAvailability(item)}
                      >
                        {item.status === 'available' ? 'Despublicar' : 'Publicar'}
                      </button>
                      <button
                        type="button"
                        className="text-sm text-brand-700 hover:underline disabled:pointer-events-none disabled:opacity-50"
                        disabled={busyProductId === item.id}
                        onClick={() => void duplicateProduct(item)}
                      >
                        Duplicar
                      </button>
                      <button
                        type="button"
                        className="text-sm text-danger-500 hover:underline"
                        onClick={() => setProductToDelete(item)}
                      >
                        Eliminar
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
        open={productToDelete !== null}
        title="Eliminar produto"
        message={`Tem a certeza que pretende eliminar "${productToDelete?.name}"? As imagens e referências associadas também serão eliminadas. Esta ação não pode ser revertida.`}
        confirmLabel="Eliminar"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setProductToDelete(null)}
      />
    </Container>
  );
}
