import { useState, type FormEvent } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';

export function LoginPage() {
  const { session, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) {
    const from = (location.state as { from?: Location })?.from?.pathname ?? '/admin';
    return <Navigate to={from} replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn(email, password);
    if (result.error) {
      setError('Credenciais inválidas.');
    }
    setSubmitting(false);
  }

  return (
    <Container className="flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-lg">Acesso de administrador</h1>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => void handleSubmit(e)}>
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Palavra-passe
            </label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-danger-500">{error}</p>}
          <Button type="submit" disabled={submitting}>
            {submitting ? 'A entrar...' : 'Entrar'}
          </Button>
        </form>
      </Card>
    </Container>
  );
}
