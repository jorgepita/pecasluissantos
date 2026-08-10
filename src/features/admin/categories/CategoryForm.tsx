import { useMemo, useState, type FormEvent } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { buildCategoryTree, flattenCategoryTree } from '@/features/catalogue/buildCategoryTree';
import type { CategoryRow } from '@/types/database';
import { FormField } from '../shared/FormField';
import { slugify, isValidSlug } from '../shared/slugify';
import { pgErrorMessage } from '../shared/pgErrorMessage';
import { createCategory, updateCategory, type CategoryInput } from './api';

const textAreaClasses =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

interface CategoryFormProps {
  /** undefined = create mode */
  category?: CategoryRow;
  /** Full list (admin sees inactive too) — used to build the parent picker. */
  categories: CategoryRow[];
  onSaved: (category: CategoryRow) => void;
  onCancel: () => void;
}

/** A category can't become its own descendant's child — the DB trigger
 * blocks this too, but excluding these options up front avoids a
 * confusing round-trip error for the common case. */
function collectDescendantIds(categoryId: number, categories: CategoryRow[]): Set<number> {
  const ids = new Set<number>();
  let frontier = [categoryId];
  while (frontier.length > 0) {
    const next: number[] = [];
    for (const cat of categories) {
      if (cat.parent_id !== null && frontier.includes(cat.parent_id) && !ids.has(cat.id)) {
        ids.add(cat.id);
        next.push(cat.id);
      }
    }
    frontier = next;
  }
  return ids;
}

export function CategoryForm({ category, categories, onSaved, onCancel }: CategoryFormProps) {
  const isEditing = category !== undefined;

  const [name, setName] = useState(category?.name ?? '');
  const [slug, setSlug] = useState(category?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [description, setDescription] = useState<string>(category?.description ?? '');
  const [parentId, setParentId] = useState<string>(category?.parent_id?.toString() ?? '');
  const [sortOrder, setSortOrder] = useState(category?.sort_order ?? 0);
  const [isActive, setIsActive] = useState(category?.is_active ?? true);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const parentOptions = useMemo(() => {
    const excluded = category ? collectDescendantIds(category.id, categories) : new Set<number>();
    if (category) excluded.add(category.id);
    const available = categories.filter((c) => !excluded.has(c.id));
    return flattenCategoryTree(buildCategoryTree(available));
  }, [categories, category]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(slugify(value));
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = 'O nome é obrigatório.';
    if (!slug.trim()) next.slug = 'O slug é obrigatório.';
    else if (!isValidSlug(slug.trim())) {
      next.slug =
        'O slug só pode conter letras minúsculas, números e hífens (ex.: travoes-discos).';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const input: CategoryInput = {
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || null,
      parent_id: parentId ? Number(parentId) : null,
      sort_order: sortOrder,
      is_active: isActive,
    };

    try {
      const saved = isEditing
        ? await updateCategory(category.id, input)
        : await createCategory(input);
      onSaved(saved);
    } catch (err) {
      setSubmitError(
        pgErrorMessage(err as PostgrestError, 'Não foi possível guardar a categoria.'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <FormField label="Nome" htmlFor="category-name" required error={errors.name}>
        <Input
          id="category-name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          required
        />
      </FormField>

      <FormField
        label="Slug"
        htmlFor="category-slug"
        required
        error={errors.slug}
        hint="Usado no URL público. Apenas letras minúsculas, números e hífens."
      >
        <Input
          id="category-slug"
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
          required
        />
      </FormField>

      <FormField label="Descrição" htmlFor="category-description">
        <textarea
          id="category-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={3}
          className={textAreaClasses}
        />
      </FormField>

      <FormField
        label="Categoria-mãe"
        htmlFor="category-parent"
        hint="Opcional — deixe em branco para uma categoria de topo."
      >
        <select
          id="category-parent"
          value={parentId}
          onChange={(event) => setParentId(event.target.value)}
          className={textAreaClasses}
        >
          <option value="">(nenhuma)</option>
          {parentOptions.map(({ category: option, depth }) => (
            <option key={option.id} value={option.id}>
              {'—'.repeat(depth)} {option.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField
        label="Ordem"
        htmlFor="category-sort-order"
        hint="Define a ordem de exibição dentro do mesmo nível."
      >
        <Input
          id="category-sort-order"
          type="number"
          value={sortOrder}
          onChange={(event) => setSortOrder(Number(event.target.value))}
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
