import { Link, useOutletContext } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { useDocumentHead } from '@/hooks/useDocumentHead';
import type { PublicLayoutContext } from '@/layouts/PublicLayout';

export function NotFoundPage() {
  // Always rendered under PublicLayout's <Outlet> — either directly (the
  // catch-all route) or via ProductDetailPage returning it inline for an
  // unpublished/missing slug (see docs/DATABASE.md "Public visibility").
  // Outlet context flows through the component tree either way.
  const { storeConfig } = useOutletContext<PublicLayoutContext>();
  useDocumentHead({
    title: `Página não encontrada | ${storeConfig.storeName}`,
    description: 'A página que procura não existe.',
  });

  return (
    <Container className="py-24 text-center">
      <h1 className="text-2xl">Página não encontrada</h1>
      <p className="mt-2 text-slate-600">A página que procura não existe.</p>
      <Link to="/" className="mt-6 inline-block text-brand-700 hover:underline">
        Voltar à página inicial
      </Link>
    </Container>
  );
}
