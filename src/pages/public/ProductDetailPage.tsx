import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { useProductDetail } from '@/features/catalogue/useProductDetail';
import { ProductGallery } from '@/features/catalogue/components/ProductGallery';
import { ConditionBadge } from '@/features/catalogue/components/ConditionBadge';
import { ProductContactActions } from '@/features/catalogue/components/ProductContactActions';
import { formatPrice, referenceTypeLabel } from '@/features/catalogue/format';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import type { PublicLayoutContext } from '@/layouts/PublicLayout';

export function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { product, error } = useProductDetail(slug);
  // Already fetched once by PublicLayout — reused here, not re-fetched.
  const { storeConfig } = useOutletContext<PublicLayoutContext>();

  if (product === undefined) {
    return (
      <Container className="py-10">
        <p className="text-sm text-slate-500">A carregar produto...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="py-10">
        <p className="text-sm text-danger-500">{error}</p>
      </Container>
    );
  }

  // No row, or a row RLS won't return to an anonymous request (e.g. not
  // `status = 'available'`) — indistinguishable on purpose, see
  // docs/DATABASE.md ("Public visibility"). Same page either way.
  if (product === null) {
    return <NotFoundPage />;
  }

  return (
    <Container className="py-10">
      <nav className="text-sm text-slate-500">
        <Link to="/produtos" className="hover:underline">
          Catálogo
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link to={`/produtos?categoria=${product.category.slug}`} className="hover:underline">
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <h1 className="text-2xl">{product.name}</h1>
          {product.brand && <p className="mt-1 text-sm text-slate-500">{product.brand.name}</p>}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <ConditionBadge condition={product.condition} />
            {product.stockQuantity === 0 && (
              <Badge tone="warning">Disponibilidade sob consulta</Badge>
            )}
          </div>

          <p className="mt-4 text-2xl font-semibold text-slate-900">
            {formatPrice(product.price, product.currency)}
          </p>

          <ProductContactActions
            product={{
              name: product.name,
              primaryReference: product.primaryReference,
              slug: product.slug,
            }}
            storeConfig={storeConfig}
          />

          {product.shortDescription && (
            <p className="mt-3 text-slate-600">{product.shortDescription}</p>
          )}
          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-slate-600">{product.description}</p>
          )}

          <dl className="mt-6 text-sm">
            <div className="flex gap-2">
              <dt className="text-slate-500">Referência</dt>
              <dd className="text-slate-900">{product.primaryReference}</dd>
            </div>
          </dl>

          {product.referenceAliases.length > 0 && (
            <div className="mt-4">
              <h2 className="text-sm font-medium text-slate-700">Referências equivalentes</h2>
              <ul className="mt-1 flex flex-wrap gap-2">
                {product.referenceAliases.map((alias) => (
                  <li key={alias.id}>
                    <Badge tone="neutral">
                      {referenceTypeLabel(alias.reference_type)}: {alias.reference}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {product.compatibilityNotes && (
            <p className="mt-4 text-sm text-slate-500">{product.compatibilityNotes}</p>
          )}
        </div>
      </div>
    </Container>
  );
}
