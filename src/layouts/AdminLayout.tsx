import { Outlet, Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';

/** Minimal shell for admin pages. The full dashboard nav is a next-phase build. */
export function AdminLayout() {
  const { signOut } = useAuth();

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <header className="border-b border-slate-200 bg-slate-900">
        <Container className="flex h-14 items-center justify-between">
          <Link to="/admin" className="text-sm font-semibold text-white">
            Administração
          </Link>
          <Button
            variant="ghost"
            className="text-slate-200 hover:bg-slate-800"
            onClick={() => void signOut()}
          >
            Sair
          </Button>
        </Container>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
