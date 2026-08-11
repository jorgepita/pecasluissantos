import { useEffect, useState } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Container } from '@/components/ui/Container';
import { DEFAULT_STORE_CONFIG, getStoreConfig } from '@/services/storeConfigService';
import type { StoreConfig } from '@/types/store-config';
import { buildTelUrl, buildWhatsAppUrl } from '@/utils/whatsapp';

/** Shape passed down to every public route via `<Outlet context>` — read
 * with `useOutletContext<PublicLayoutContext>()` (see
 * `ProductDetailPage.tsx`) instead of re-fetching `store_settings`. */
export interface PublicLayoutContext {
  storeConfig: StoreConfig;
}

/**
 * Shell for public storefront pages: header with store name/logo/nav,
 * footer with contact details, opening hours and social links — all from
 * the live `store_settings` row via `getStoreConfig()` (which already
 * falls back to `DEFAULT_STORE_CONFIG` on a missing row or error, so this
 * component doesn't need its own empty-state handling). The same fetched
 * config is handed to child routes via Outlet context, so a page like
 * `ProductDetailPage` that also needs it (e.g. for the contact CTA)
 * doesn't issue a second `store_settings` request.
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
        <Container className="flex h-16 items-center justify-between gap-3">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-2 rounded-md text-lg font-semibold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
          >
            {config.logoUrl && (
              <img
                src={config.logoUrl}
                alt=""
                className="h-8 w-8 shrink-0 rounded object-contain"
              />
            )}
            <span className="truncate">{config.storeName}</span>
          </Link>
          <nav className="text-sm">
            <Link
              to="/produtos"
              className="-mx-3 rounded-md px-3 py-2 text-slate-600 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
            >
              Catálogo
            </Link>
          </nav>
        </Container>
      </header>

      <main className="flex-1">
        <Outlet context={{ storeConfig: config } satisfies PublicLayoutContext} />
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <Container className="grid gap-8 py-8 text-sm text-slate-500 sm:grid-cols-2 sm:py-10">
          <div className="min-w-0">
            <p className="font-medium text-slate-700">{config.storeName}</p>
            {config.address && <p className="mt-1 break-words">{config.address}</p>}
            {openingHoursEntries.length > 0 && (
              <dl className="mt-2 space-y-0.5">
                {openingHoursEntries.map(([day, hours]) => (
                  <div key={day} className="flex flex-wrap gap-x-2">
                    <dt className="shrink-0">{day}:</dt>
                    <dd className="break-words">{hours}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          <div className="min-w-0">
            {config.phone && (
              <p>
                <a
                  href={buildTelUrl(config.phone)}
                  className="break-words rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                >
                  Tel: {config.phone}
                </a>
              </p>
            )}
            {config.email && (
              <p className="mt-1">
                <a
                  href={`mailto:${config.email}`}
                  className="break-words rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                >
                  {config.email}
                </a>
              </p>
            )}
            {config.whatsappNumber && (
              <p className="mt-1">
                <a
                  href={buildWhatsAppUrl(config.whatsappNumber)}
                  target="_blank"
                  rel="noreferrer"
                  className="break-words rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
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
                    className="rounded hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
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
