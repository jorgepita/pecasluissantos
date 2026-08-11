import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { useAdminCategories } from '@/features/admin/categories/useAdminCategories';
import { useAdminBrands } from '@/features/admin/brands/useAdminBrands';
import { useAdminProduct } from '@/features/admin/products/useAdminProduct';
import { ProductForm } from '@/features/admin/products/ProductForm';
import { ProductImageManager } from '@/features/admin/products/ProductImageManager';
import { ReferenceAliasManager } from '@/features/admin/products/ReferenceAliasManager';
import type { ProductDuplicateSeed } from '@/features/admin/products/api';

interface DuplicateLocationState {
  duplicateFrom?: ProductDuplicateSeed;
}

export function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const productId = id ? Number(id) : undefined;
  const isEditing = productId !== undefined;
  // Only meaningful in create mode — see ProductsPage's "Duplicar" action.
  const duplicateFrom = !isEditing
    ? (location.state as DuplicateLocationState | null)?.duplicateFrom
    : undefined;

  const { categories, loading: categoriesLoading } = useAdminCategories();
  const { brands, loading: brandsLoading } = useAdminBrands();
  const {
    product,
    images,
    aliases,
    loading: productLoading,
    error,
    reload,
  } = useAdminProduct(productId);

  const loading = categoriesLoading || brandsLoading || (isEditing && productLoading);

  return (
    <Container className="py-10">
      <h1 className="text-2xl">{isEditing ? 'Editar produto' : 'Novo produto'}</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}

      {!loading && !error && isEditing && product === null && (
        <p className="mt-6 text-sm text-danger-500">Produto não encontrado.</p>
      )}

      {!loading && !error && (!isEditing || product) && (
        <>
          <Card className="mt-6 max-w-3xl p-6">
            <ProductForm
              product={product ?? undefined}
              initialValues={duplicateFrom}
              categories={categories}
              brands={brands}
              onSaved={(saved) => {
                if (isEditing) {
                  reload();
                } else {
                  navigate(`/admin/produtos/${saved.id}`, { replace: true });
                }
              }}
              onCancel={() => navigate('/admin/produtos')}
            />
          </Card>

          {isEditing && product && (
            <>
              <Card className="mt-6 max-w-3xl p-6">
                <h2 className="text-lg font-semibold text-slate-900">Imagens</h2>
                <div className="mt-4">
                  <ProductImageManager productId={product.id} images={images} onChanged={reload} />
                </div>
              </Card>

              <Card className="mt-6 max-w-3xl p-6">
                <h2 className="text-lg font-semibold text-slate-900">Referências alternativas</h2>
                <div className="mt-4">
                  <ReferenceAliasManager
                    productId={product.id}
                    aliases={aliases}
                    onChanged={reload}
                  />
                </div>
              </Card>
            </>
          )}

          {!isEditing && (
            <p className="mt-4 max-w-3xl text-sm text-slate-500">
              Guarde o produto para poder adicionar imagens e referências alternativas.
            </p>
          )}
        </>
      )}
    </Container>
  );
}
