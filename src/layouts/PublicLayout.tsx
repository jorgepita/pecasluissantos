import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { DEFAULT_STORE_CONFIG, getStoreConfig } from '@/services/storeConfigService';
import type { StoreConfig } from '@/types/store-config';

/** wa.me expects digits only (country code + number, no +/spaces/dashes). */
function whatsappHref(number: string): string {
  return `https://wa.me/${number.replace(/[^0-9]/g, '')}`;
}

/**
 * Shell for public storefront pages: header with store name/logo/nav,
 * footer with contact details, opening hours and social links — all from
 * the live `store_settings` row via `getStoreConfig()` (which already
 * falls back to `DEFAULT_STORE_CONFIG` on a missing row or error, so this
 * component doesn't need its own empty-state handling).
 *
 * `primary_color`/`secondary_color` are deliberately NOT applied here —
 * see docs/ARCHITECTURE.md ("Configuration strategy"): wiring up runtime
 * theming was an explicit, documented deferral in Phase 0, not revisited
 * in this phase.
 */
export function PublicLayout() {
  const [config, setConfig] = useState<StoreConfig>(DEFAULT_STORE_CONFIG);

  useEffect(() => {
    let cancelled = false;
    getStoreConfig().then((data) => {
      if (!cancelled) setConfig(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const openingHoursEntries = config.openingHours ? Object.entries(config.openingHours) : [];
  const socialMediaEntries = config.socialMedia ? Object.entries(config.socialMedia) : [];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <Container className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            {config.logoUrl && (
              <img src={config.logoUrl} alt="" className="h-8 w-8 rounded object-contain" />
            )}
            {config.storeName}
          </Link>
          <nav className="text-sm">
            <Link to="/produtos" className="text-slate-600 hover:text-slate-900">
              Catálogo
            </Link>
          </nav>
        </Container>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <Container className="grid gap-8 py-10 text-sm text-slate-500 sm:grid-cols-2">
          <div>
            <p className="font-medium text-slate-700">{config.storeName}</p>
            {config.address && <p className="mt-1">{config.address}</p>}
            {openingHoursEntries.length > 0 && (
              <dl className="mt-2 space-y-0.5">
                {openingHoursEntries.map(([day, hours]) => (
                  <div key={day} className="flex gap-2">
                    <dt className="w-28 shrink-0">{day}</dt>
                    <dd>{hours}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div>
            {config.phone && <p>Tel: {config.phone}</p>}
            {config.email && (
              <p className="mt-1">
                <a href={`mailto:${config.email}`} className="hover:underline">
                  {config.email}
                </a>
              </p>
            )}
            {config.whatsappNumber && (
              <p className="mt-1">
                <a
                  href={whatsappHref(config.whatsappNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:underline"
                >
                  WhatsApp: {config.whatsappNumber}
                </a>
              </p>
            )}
            {socialMediaEntries.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-3">
                {socialMediaEntries.map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </div>

          <p className="sm:col-span-2">
            &copy; {new Date().getFullYear()} {config.storeName}
          </p>
        </Container>
      </footer>
    </div>
  );
}
