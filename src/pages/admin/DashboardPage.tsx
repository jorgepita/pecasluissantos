import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';

interface Counts {
  categories: number | null;
  brands: number | null;
  products: number | null;
}

async function getCount(table: 'categories' | 'brands' | 'products'): Promise<number | null> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
  if (error) return null;
  return count;
}

const SECTIONS = [
  { to: '/admin/produtos', label: 'Produtos', description: 'Criar, editar e gerir o catálogo.' },
  {
    to: '/admin/categorias',
    label: 'Categorias',
    description: 'Organizar o catálogo em categorias.',
  },
  { to: '/admin/marcas', label: 'Marcas', description: 'Gerir as marcas disponíveis.' },
  {
    to: '/admin/definicoes',
    label: 'Definições da loja',
    description: 'Contactos, horário e redes sociais.',
  },
];

/** Real dashboard: quick counts (admin sees every row, RLS-gated the same
 * way as every other admin query) + links into each management section. */
export function DashboardPage() {
  const [counts, setCounts] = useState<Counts>({ categories: null, brands: null, products: null });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCount('categories'), getCount('brands'), getCount('products')]).then(
      ([categories, brands, products]) => {
        if (!cancelled) setCounts({ categories, brands, products });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container className="py-10">
      <h1 className="text-xl">Painel de administração</h1>
      <p className="mt-2 text-slate-600">
        {counts.products ?? '—'} produtos · {counts.categories ?? '—'} categorias ·{' '}
        {counts.brands ?? '—'} marcas
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section) => (
          <Link key={section.to} to={section.to}>
            <Card className="p-5 transition-shadow hover:shadow-md">
              <h2 className="text-base font-medium text-slate-900">{section.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{section.description}</p>
            </Card>
          </Link>
        ))}
      </div>
    </Container>
  );
}
