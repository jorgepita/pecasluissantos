import type { ProductCondition, ProductReferenceType } from '@/types/database';

/** Formats a `numeric` price string for display. Display-only — never do
 * arithmetic on the result, only on the original string (or a proper
 * decimal library), per the "numeric as string" note in types/database.ts. */
export function formatPrice(price: string, currency: string): string {
  const value = Number(price);
  if (Number.isNaN(value)) return price;

  try {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency }).format(value);
  } catch {
    // currency passes the DB's ^[A-Z]{3}$ check but isn't necessarily a
    // currency Intl recognizes — fall back to a plain label rather than throw.
    return `${value.toFixed(2)} ${currency}`;
  }
}

const REFERENCE_TYPE_LABELS: Record<ProductReferenceType, string> = {
  oem: 'OEM',
  manufacturer: 'Fabricante',
  equivalent: 'Equivalente',
  other: 'Outra',
};

export function referenceTypeLabel(type: ProductReferenceType): string {
  return REFERENCE_TYPE_LABELS[type];
}

const CONDITION_LABELS: Record<ProductCondition, string> = {
  new: 'Novo',
  used: 'Usado',
  refurbished: 'Recondicionado',
};

/** PT-PT label for a product's physical condition — moved here from
 * `ConditionBadge.tsx` so the meta-description builder below (and any
 * other future non-badge use) shares the one mapping instead of a second
 * copy. `ConditionBadge` still owns the badge *tone* (colour), which is
 * presentation-only and stays local to it. */
export function conditionLabel(condition: ProductCondition): string {
  return CONDITION_LABELS[condition];
}

/** Absolute, base-path-correct URL for a product detail page — the same
 * `origin + BASE_URL + produtos/<slug>` shape needed both for the WhatsApp
 * contact message (see `ProductContactActions.tsx`) and for `og:url` (see
 * `useDocumentHead`). One implementation, not two copies of the same
 * base-path reasoning that bit `ProductContactActions` in Phase 4 (see
 * docs/ARCHITECTURE.md "Deployment strategy"). */
export function buildProductUrl(slug: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}produtos/${slug}`;
}

interface MetaDescriptionProduct {
  name: string;
  primaryReference: string;
  condition: ProductCondition;
  shortDescription: string | null;
}

/** Meta/`og:description` for a product page — the admin-entered short
 * description when there is one (it's already written to be customer-
 * facing copy), otherwise a plain generated sentence from data already
 * public on the page. Never empty, so `useDocumentHead` always gets a
 * real description. */
export function buildProductMetaDescription(product: MetaDescriptionProduct): string {
  if (product.shortDescription?.trim()) return product.shortDescription.trim();
  return `${product.name} — ${conditionLabel(product.condition)}, ref. ${product.primaryReference}.`;
}
