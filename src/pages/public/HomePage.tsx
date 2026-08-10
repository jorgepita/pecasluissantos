import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

/**
 * Temporary landing page for the foundation phase.
 *
 * This intentionally is NOT the product catalogue — it exists to prove the
 * application shell renders and to preview the design system primitives in
 * context. It will be replaced by the real catalogue in a later phase.
 */
export function HomePage() {
  return (
    <Container className="py-12">
      <div className="max-w-2xl">
        <Badge tone="warning">Em construção</Badge>
        <h1 className="mt-4 text-3xl">Peças Luís Santos</h1>
        <p className="mt-2 text-slate-600">
          A plataforma de gestão de peças automóveis está em desenvolvimento. Esta página demonstra
          apenas a base visual da aplicação — o catálogo público será construído numa fase seguinte.
        </p>
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="text-base">Exemplo de cartão</h2>
          <p className="mt-1 text-sm text-slate-500">
            Estrutura base para futuras fichas de produto.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Badge tone="success">Disponível</Badge>
            <Badge tone="danger">Esgotado</Badge>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base">Campo de pesquisa</h2>
          <Input placeholder="Pesquisar referência..." className="mt-3" />
        </Card>

        <Card className="p-5">
          <h2 className="text-base">Botões</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="primary">Primário</Button>
            <Button variant="secondary">Secundário</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
        </Card>
      </div>
    </Container>
  );
}
