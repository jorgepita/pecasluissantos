import { Card } from '@/components/ui/Card';

/** Pulsing placeholder shown while the product list is loading — matches
 * ProductCard's rough shape so the layout doesn't jump once data arrives. */
export function ProductCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className="h-40 w-full animate-pulse bg-slate-100" />
      <div className="space-y-2 p-4">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        <div className="h-5 w-1/3 animate-pulse rounded bg-slate-100" />
      </div>
    </Card>
  );
}
