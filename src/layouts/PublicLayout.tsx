import { Outlet, Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { DEFAULT_STORE_CONFIG } from '@/services/storeConfigService';

/**
 * Shell for public storefront pages: header with store name/nav, footer
 * with basic contact info. Renders `DEFAULT_STORE_CONFIG` for now — wiring
 * this to the live `store_settings` row is next-phase work.
 */
export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="text-lg font-semibold text-slate-900">
            {DEFAULT_STORE_CONFIG.storeName}
          </Link>
        </Container>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <Container className="flex flex-col gap-1 py-8 text-sm text-slate-500">
          <p>{DEFAULT_STORE_CONFIG.storeName}</p>
          <p>&copy; {new Date().getFullYear()}</p>
        </Container>
      </footer>
    </div>
  );
}
