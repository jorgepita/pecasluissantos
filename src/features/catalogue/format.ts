import type { ProductReferenceType } from '@/types/database';

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
