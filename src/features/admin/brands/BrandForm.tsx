import { useState, type FormEvent } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type { BrandRow } from '@/types/database';
import { FormField } from '../shared/FormField';
import { slugify, isValidSlug } from '../shared/slugify';
import { pgErrorMessage } from '../shared/pgErrorMessage';
import { createBrand, updateBrand, type BrandInput } from './api';

interface BrandFormProps {
  /** undefined = create mode */
  brand?: BrandRow;
  onSaved: (brand: BrandRow) => void;
  onCancel: () => void;
}

export function BrandForm({ brand, onSaved, onCancel }: BrandFormProps) {
  const isEditing = brand !== undefined;

  const [name, setName] = useState(brand?.name ?? '');
  const [slug, setSlug] = useState(brand?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [isActive, setIsActive] = useState(brand?.is_active ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'O nome é obrigatório.';
    if (!slug.trim()) next.slug = 'O slug é obrigatório.';
    else if (!isValidSlug(slug.trim())) {
      next.slug = 'O slug só pode conter letras minúsculas, números e hífens (ex.: bosch).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const input: BrandInput = { name: name.trim(), slug: slug.trim(), is_active: isActive };

    try {
      const saved = isEditing ? await updateBrand(brand.id, input) : await createBrand(input);
      onSaved(saved);
    } catch (err) {
      setSubmitError(pgErrorMessage(err as PostgrestError, 'Não foi possível guardar a marca.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <FormField label="Nome" htmlFor="brand-name" required error={errors.name}>
        <Input
          id="brand-name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          required
        />
      </FormField>

      <FormField
        label="Slug"
        htmlFor="brand-slug"
        required
        error={errors.slug}
        hint="Usado no URL público. Apenas letras minúsculas, números e hífens."
      >
        <Input
          id="brand-slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          required
        />
      </FormField>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(event) => setIsActive(event.target.checked)}
        />
        Ativa (visível no catálogo público)
      </label>

      {submitError && <p className="text-sm text-danger-500">{submitError}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'A guardar...' : 'Guardar'}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
