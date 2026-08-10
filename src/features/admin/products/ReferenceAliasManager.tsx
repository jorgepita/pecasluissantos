import { useState, type FormEvent } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { referenceTypeLabel } from '@/features/catalogue/format';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { pgErrorMessage } from '../shared/pgErrorMessage';
import { addProductReferenceAlias, deleteProductReferenceAlias } from './api';
import type { ProductReferenceAliasRow, ProductReferenceType } from '@/types/database';

const REFERENCE_TYPES: ProductReferenceType[] = ['oem', 'manufacturer', 'equivalent', 'other'];

const selectClasses =
  'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

interface ReferenceAliasManagerProps {
  productId: number;
  aliases: ProductReferenceAliasRow[];
  onChanged: () => void;
}

/** Add/remove alternative references — the existing
 * `product_reference_aliases` model, used for admin data entry and for
 * the public "search by alternative reference" feature, not a second
 * system. */
export function ReferenceAliasManager({
  productId,
  aliases,
  onChanged,
}: ReferenceAliasManagerProps) {
  const [reference, setReference] = useState('');
  const [referenceType, setReferenceType] = useState<ProductReferenceType>('oem');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aliasToDelete, setAliasToDelete] = useState<ProductReferenceAliasRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    if (!reference.trim()) {
      setError('Indique uma referência.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await addProductReferenceAlias(productId, {
        reference: reference.trim(),
        reference_type: referenceType,
      });
      setReference('');
      onChanged();
    } catch (err) {
      setError(pgErrorMessage(err as PostgrestError, 'Não foi possível adicionar a referência.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmDelete() {
    if (!aliasToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteProductReferenceAlias(aliasToDelete.id);
      onChanged();
      setAliasToDelete(null);
    } catch {
      setError('Não foi possível remover a referência.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <form onSubmit={(event) => void handleAdd(event)} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[160px] flex-1">
          <label
            htmlFor="alias-reference"
            className="mb-1 block text-xs font-medium text-slate-700"
          >
            Referência
          </label>
          <Input
            id="alias-reference"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
          />
        </div>
        <div>
          <label htmlFor="alias-type" className="mb-1 block text-xs font-medium text-slate-700">
            Tipo
          </label>
          <select
            id="alias-type"
            value={referenceType}
            onChange={(event) => setReferenceType(event.target.value as ProductReferenceType)}
            className={selectClasses}
          >
            {REFERENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {referenceTypeLabel(type)}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'A adicionar...' : 'Adicionar'}
        </Button>
      </form>

      {error && <p className="mt-2 text-sm text-danger-500">{error}</p>}

      {aliases.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Ainda não existem referências alternativas.</p>
      ) : (
        <ul className="mt-4 flex flex-wrap gap-2">
          {aliases.map((alias) => (
            <li key={alias.id}>
              <Badge tone="neutral" className="inline-flex items-center gap-2">
                {referenceTypeLabel(alias.reference_type)}: {alias.reference}
                <button
                  type="button"
                  onClick={() => setAliasToDelete(alias)}
                  aria-label={`Remover referência ${alias.reference}`}
                  className="text-slate-400 hover:text-danger-500"
                >
                  &times;
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={aliasToDelete !== null}
        title="Remover referência"
        message={`Tem a certeza que pretende remover a referência "${aliasToDelete?.reference}"?`}
        confirmLabel="Remover"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setAliasToDelete(null)}
      />
    </div>
  );
}
