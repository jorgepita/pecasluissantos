import { Link, useOutletContext, useParams } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Badge } from '@/components/ui/Badge';
import { useProductDetail } from '@/features/catalogue/useProductDetail';
import { ProductGallery } from '@/features/catalogue/components/ProductGallery';
import { ConditionBadge } from '@/features/catalogue/components/ConditionBadge';
import { ProductContactActions } from '@/features/catalogue/components/ProductContactActions';
import {
  buildProductMetaDescription,
  buildProductUrl,
  formatPrice,
  referenceTypeLabel,
} from '@/features/catalogue/format';
import { getPublicImageUrl } from '@/features/catalogue/api';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import type { PublicLayoutContext } from '@/layouts/PublicLayout';

export function ProductDetailPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const { product, error } = useProductDetail(slug);
  // Already fetched once by PublicLayout — reused here, not re-fetched.
  const { storeConfig } = useOutletContext<PublicLayoutContext>();

  // Primary image (or the first one) for `og:image` — same tie-break as
  // ProductGallery/ProductCard (`is_primary`, then `sort_order`), already
  // applied server-side by `getProductImages` (see features/catalogue/api.ts).
  const ogImagePath = product?.images[0]?.storage_path;

  // `product === null` renders <NotFoundPage /> below, which calls this
  // same hook itself — and React fires a child's effects before its
  // parent's, so this component's own call would run *after* and
  // overwrite NotFoundPage's title/description if the two disagreed here.
  // Matching NotFoundPage's exact strings in that branch keeps the final,
  // settled result correct either way (idempotent, not a race).
  useDocumentHead({
    title:
      product === null
        ? `Página não encontrada | ${storeConfig.storeName}`
        : product
          ? `${product.name} | ${storeConfig.storeName}`
          : storeConfig.storeName,
    description:
      product === null
        ? 'A página que procura não existe.'
        : product
          ? buildProductMetaDescription(product)
          : 'A carregar produto...',
    url: buildProductUrl(slug),
    image: ogImagePath ? getPublicImageUrl(ogImagePath) : undefined,
  });

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
    <Container className="py-6 sm:py-10">
      <nav className="text-sm text-slate-500">
        <Link to="/produtos" className="rounded hover:underline">
          Catálogo
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link
              to={`/produtos?categoria=${product.category.slug}`}
              className="rounded hover:underline"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-2 lg:gap-8">
        <ProductGallery images={product.images} productName={product.name} />

        <div>
          <h1 className="text-xl sm:text-2xl">{product.name}</h1>

          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {formatPrice(product.price, product.currency)}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <ConditionBadge condition={product.condition} />
            {product.stockQuantity === 0 && (
              <Badge tone="warning">Disponibilidade sob consulta</Badge>
            )}
            <span>Ref. {product.primaryReference}</span>
          </div>

          <ProductContactActions
            product={{
              name: product.name,
              primaryReference: product.primaryReference,
              slug: product.slug,
            }}
            storeConfig={storeConfig}
          />

          {product.shortDescription && (
            <p className="mt-6 text-slate-600">{product.shortDescription}</p>
          )}
          {product.description && (
            <p className="mt-4 whitespace-pre-line text-sm text-slate-600">{product.description}</p>
          )}

          {product.compatibilityNotes && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-slate-700">Compatibilidade</h2>
              <p className="mt-1 text-sm text-slate-500">{product.compatibilityNotes}</p>
            </div>
          )}

          {product.referenceAliases.length > 0 && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-slate-700">Referências equivalentes</h2>
              <ul className="mt-2 flex flex-wrap gap-2">
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

          {(product.category || product.brand) && (
            <dl className="mt-6 space-y-1 border-t border-slate-200 pt-4 text-sm text-slate-500">
              {product.category && (
                <div className="flex gap-2">
                  <dt>Categoria</dt>
                  <dd className="text-slate-700">{product.category.name}</dd>
                </div>
              )}
              {product.brand && (
                <div className="flex gap-2">
                  <dt>Marca</dt>
                  <dd className="text-slate-700">{product.brand.name}</dd>
                </div>
              )}
            </dl>
          )}
        </div>
      </div>
    </Container>
  );
}
