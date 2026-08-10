import { cn } from '@/utils/cn';
import { buildTelUrl, buildWhatsAppUrl } from '@/utils/whatsapp';
import { buttonBaseClasses, buttonVariantClasses } from '@/components/ui/buttonStyles';
import type { StoreConfig } from '@/types/store-config';

interface ContactProduct {
  name: string;
  primaryReference: string;
  slug: string;
}

interface ProductContactActionsProps {
  product: ContactProduct;
  storeConfig: StoreConfig;
}

/** Pre-filled message for the WhatsApp CTA. Product name + reference +
 * a link back to the exact listing — no internal id, no admin-only data,
 * nothing beyond what the customer is already looking at. */
function buildContactMessage(product: ContactProduct): string {
  const url = `${window.location.origin}/produtos/${product.slug}`;
  return `Olá, tenho interesse neste artigo:\n${product.name}\nReferência: ${product.primaryReference}\n${url}`;
}

/**
 * Contact-only CTA — request-for-information, not an order. No stock is
 * touched, no row is written anywhere; this only ever constructs a
 * `wa.me`/`tel:` link. See docs/ARCHITECTURE.md ("Contact flow") for why
 * this is deliberately not modeled as an order/reservation.
 *
 * WhatsApp is the primary action whenever `whatsapp_number` is configured
 * (pre-filled with the message above); phone is the primary action when
 * only `phone` is set, and a secondary "Ligar" action when both exist.
 * When neither is configured, this renders a plain, unobtrusive notice —
 * never a dead button.
 */
export function ProductContactActions({ product, storeConfig }: ProductContactActionsProps) {
  const { whatsappNumber, phone } = storeConfig;

  // Whichever one drives the primary action — WhatsApp preferred, phone as
  // the fallback. Once this is non-null, it's the source of truth for the
  // rest of the component, so no further null-checking is needed below.
  const primaryNumber = whatsappNumber ?? phone;

  if (!primaryNumber) {
    return (
      <p className="mt-6 text-sm text-slate-500">
        Contacto indisponível de momento — tente novamente mais tarde.
      </p>
    );
  }

  const isWhatsAppPrimary = Boolean(whatsappNumber);
  const primaryHref = isWhatsAppPrimary
    ? buildWhatsAppUrl(primaryNumber, buildContactMessage(product))
    : buildTelUrl(primaryNumber);

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <a
        href={primaryHref}
        target={isWhatsAppPrimary ? '_blank' : undefined}
        rel={isWhatsAppPrimary ? 'noreferrer' : undefined}
        className={cn(buttonBaseClasses, buttonVariantClasses.primary)}
      >
        Contactar sobre este artigo
      </a>

      {isWhatsAppPrimary && phone && (
        <a href={buildTelUrl(phone)} className={cn(buttonBaseClasses, buttonVariantClasses.ghost)}>
          Ligar: {phone}
        </a>
      )}
    </div>
  );
}
