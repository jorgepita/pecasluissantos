import { Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';

export function NotFoundPage() {
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
