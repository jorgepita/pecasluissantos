import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CatalogueImage } from './CatalogueImage';
import { ConditionBadge } from './ConditionBadge';
import { formatPrice } from '../format';
import type { ProductListItem } from '../types';

export function ProductCard({ item }: { item: ProductListItem }) {
  return (
    <Link to={`/produtos/${item.slug}`}>
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <CatalogueImage
          storagePath={item.primaryImagePath}
          alt={item.name}
          className="h-40 w-full"
        />

        <div className="p-4">
          {item.brandName && <p className="text-xs text-slate-500">{item.brandName}</p>}
          <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-slate-900">{item.name}</h3>
          <p className="mt-1 text-xs text-slate-500">Ref. {item.primaryReference}</p>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-base font-semibold text-slate-900">
              {formatPrice(item.price, item.currency)}
            </span>
            <ConditionBadge condition={item.condition} />
          </div>

          {item.stockQuantity === 0 && (
            <Badge tone="warning" className="mt-2">
              Sob consulta
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
}
