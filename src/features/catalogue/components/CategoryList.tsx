import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import type { CategoryNode } from '../types';

/** Top-level category entry points for the Home page — each links into
 * the filtered listing rather than a separate per-category route (see
 * docs/ARCHITECTURE.md: filters live in /produtos query params). */
export function CategoryList({ categories }: { categories: CategoryNode[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => (
        <Link key={category.id} to={`/produtos?categoria=${category.slug}`}>
          <Card className="p-5 transition-shadow hover:shadow-md">
            <h3 className="text-base font-medium text-slate-900">{category.name}</h3>
            {category.children.length > 0 && (
              <p className="mt-1 text-sm text-slate-500">
                {category.children.length}{' '}
                {category.children.length === 1 ? 'subcategoria' : 'subcategorias'}
              </p>
            )}
          </Card>
        </Link>
      ))}
    </div>
  );
}
