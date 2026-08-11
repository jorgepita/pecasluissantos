import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { buttonBaseClasses, buttonVariantClasses } from '@/components/ui/buttonStyles';
import { cn } from '@/utils/cn';
import { useCategories } from '@/features/catalogue/useCategories';
import { buildCategoryTree } from '@/features/catalogue/buildCategoryTree';
import { CategoryList } from '@/features/catalogue/components/CategoryList';

/**
 * Public catalogue landing page. Real Supabase data (active categories) —
 * not the design-system preview this page used to be during the
 * foundation phase. The full, filterable/searchable listing lives at
 * /produtos; this page's job is just to be a clear entry point into it.
 */
export function HomePage() {
  const { categories, loading, error } = useCategories();
  const topLevelCategories = buildCategoryTree(categories);

  return (
    <>
      <section className="border-b border-slate-200 bg-white">
        <Container className="py-10 text-center sm:py-14 lg:py-16">
          <h1 className="text-2xl sm:text-3xl">Peças automóveis com confiança</h1>
          <p className="mx-auto mt-3 max-w-xl text-slate-600">
            Consulte o nosso catálogo de peças novas, usadas e recondicionadas.
          </p>
          <Link
            to="/produtos"
            className={cn(
              buttonBaseClasses,
              buttonVariantClasses.primary,
              'mt-6 inline-flex w-full justify-center sm:w-auto',
            )}
          >
            Ver catálogo
          </Link>
        </Container>
      </section>

      <Container className="py-10 sm:py-12">
        <h2 className="text-xl">Categorias</h2>

        {loading && <p className="mt-4 text-sm text-slate-500">A carregar categorias...</p>}

        {error && <p className="mt-4 text-sm text-danger-500">{error}</p>}

        {!loading && !error && topLevelCategories.length === 0 && (
          <p className="mt-4 text-sm text-slate-500">
            O catálogo está a ser preparado. Volte em breve.
          </p>
        )}

        {!loading && !error && topLevelCategories.length > 0 && (
          <div className="mt-4">
            <CategoryList categories={topLevelCategories} />
          </div>
        )}
      </Container>
    </>
  );
}
