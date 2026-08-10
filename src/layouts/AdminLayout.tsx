import { Outlet, Link, NavLink } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/auth/useAuth';

const NAV_ITEMS = [
  { to: '/admin/produtos', label: 'Produtos' },
  { to: '/admin/categorias', label: 'Categorias' },
  { to: '/admin/marcas', label: 'Marcas' },
  { to: '/admin/definicoes', label: 'Definições' },
];

/** Shell for admin pages: top bar (brand + sign out) + section nav. */
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

      <nav className="border-b border-slate-200 bg-white">
        <Container className="flex h-11 items-center gap-4 text-sm">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                isActive ? 'font-medium text-brand-700' : 'text-slate-600 hover:text-slate-900'
              }
            >
              {item.label}
            </NavLink>
          ))}
        </Container>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
