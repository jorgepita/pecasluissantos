import { useState, type FormEvent } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import type {
  BrandRow,
  CategoryRow,
  ProductCondition,
  ProductRow,
  ProductStatus,
} from '@/types/database';
import { FormField } from '../shared/FormField';
import { slugify, isValidSlug } from '../shared/slugify';
import { pgErrorMessage } from '../shared/pgErrorMessage';
import { createProduct, updateProduct, type ProductDuplicateSeed, type ProductInput } from './api';

const controlClasses =
  'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20';

const CONDITION_OPTIONS: Array<{ value: ProductCondition; label: string }> = [
  { value: 'new', label: 'Novo' },
  { value: 'used', label: 'Usado' },
  { value: 'refurbished', label: 'Recondicionado' },
];

const STATUS_OPTIONS: Array<{ value: ProductStatus; label: string }> = [
  { value: 'draft', label: 'Rascunho (não publicado)' },
  { value: 'available', label: 'Disponível (visível no catálogo)' },
  { value: 'reserved', label: 'Reservado' },
  { value: 'sold', label: 'Vendido' },
  { value: 'unavailable', label: 'Indisponível' },
];

function isValidPrice(value: string): boolean {
  return /^\d+(\.\d{1,2})?$/.test(value.trim());
}

function isValidCurrency(value: string): boolean {
  return /^[A-Z]{3}$/.test(value.trim().toUpperCase());
}

interface ProductFormProps {
  /** undefined = create mode */
  product?: ProductRow;
  /** Prefill for a *new* product, from the "Duplicar" action on
   * `ProductsPage` (see `ProductFormPage`, which reads it from router
   * `state`). Ignored when `product` is set — an existing row's own data
   * always wins. Deliberately excludes slug/primary_reference/status/
   * stock — see `ProductDuplicateSeed`'s own doc comment for why. */
  initialValues?: ProductDuplicateSeed;
  categories: CategoryRow[];
  brands: BrandRow[];
  onSaved: (product: ProductRow) => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  initialValues,
  categories,
  brands,
  onSaved,
  onCancel,
}: ProductFormProps) {
  const isEditing = product !== undefined;

  const [name, setName] = useState(product?.name ?? initialValues?.name ?? '');
  // Never seeded from initialValues, even when duplicating — a copied slug
  // would just collide with the source product's (slugs are unique), so
  // the admin always enters a fresh one. Same reasoning for
  // primaryReference below (unique per brand).
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(isEditing);
  const [shortDescription, setShortDescription] = useState(
    product?.short_description ?? initialValues?.short_description ?? '',
  );
  const [description, setDescription] = useState(
    product?.description ?? initialValues?.description ?? '',
  );
  const [categoryId, setCategoryId] = useState(
    product?.category_id?.toString() ?? initialValues?.category_id?.toString() ?? '',
  );
  const [brandId, setBrandId] = useState(
    product?.brand_id?.toString() ?? initialValues?.brand_id?.toString() ?? '',
  );
  const [primaryReference, setPrimaryReference] = useState(product?.primary_reference ?? '');
  const [condition, setCondition] = useState<ProductCondition>(
    product?.condition ?? initialValues?.condition ?? 'new',
  );
  const [price, setPrice] = useState(product?.price ?? initialValues?.price ?? '');
  const [currency, setCurrency] = useState(product?.currency ?? initialValues?.currency ?? 'EUR');
  // Never seeded — a duplicate always starts as an unpublished, zero-stock
  // draft (see ProductDuplicateSeed), regardless of the source product's
  // current availability.
  const [stockQuantity, setStockQuantity] = useState(product?.stock_quantity ?? 0);
  const [status, setStatus] = useState<ProductStatus>(product?.status ?? 'draft');
  const [compatibilityNotes, setCompatibilityNotes] = useState(
    product?.compatibility_notes ?? initialValues?.compatibility_notes ?? '',
  );

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
      next.slug = 'O slug só pode conter letras minúsculas, números e hífens.';
    }
    if (!categoryId) next.categoryId = 'A categoria é obrigatória.';
    if (!primaryReference.trim()) next.primaryReference = 'A referência é obrigatória.';
    if (!price.trim()) next.price = 'O preço é obrigatório.';
    else if (!isValidPrice(price))
      next.price = 'Indique um preço válido, com no máximo 2 casas decimais (ex.: 19.99).';
    if (!isValidCurrency(currency))
      next.currency = 'Indique um código de moeda de 3 letras (ex.: EUR).';
    if (stockQuantity < 0) next.stockQuantity = 'A quantidade em stock não pode ser negativa.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const input: ProductInput = {
      name: name.trim(),
      slug: slug.trim(),
      short_description: shortDescription.trim() || null,
      description: description.trim() || null,
      category_id: Number(categoryId),
      brand_id: brandId ? Number(brandId) : null,
      primary_reference: primaryReference.trim(),
      condition,
      price: price.trim(),
      currency: currency.trim().toUpperCase(),
      stock_quantity: stockQuantity,
      status,
      compatibility_notes: compatibilityNotes.trim() || null,
    };

    try {
      const saved = isEditing ? await updateProduct(product.id, input) : await createProduct(input);
      onSaved(saved);
    } catch (err) {
      setSubmitError(pgErrorMessage(err as PostgrestError, 'Não foi possível guardar o produto.'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nome" htmlFor="product-name" required error={errors.name}>
          <Input
            id="product-name"
            value={name}
            onChange={(event) => handleNameChange(event.target.value)}
            required
          />
        </FormField>

        <FormField
          label="Slug"
          htmlFor="product-slug"
          required
          error={errors.slug}
          hint="Usado no URL público (/produtos/<slug>)."
        >
          <Input
            id="product-slug"
            value={slug}
            onChange={(event) => {
              setSlugTouched(true);
              setSlug(event.target.value);
            }}
            required
          />
        </FormField>
      </div>

      <FormField label="Descrição curta" htmlFor="product-short-description">
        <Input
          id="product-short-description"
          value={shortDescription ?? ''}
          onChange={(event) => setShortDescription(event.target.value)}
        />
      </FormField>

      <FormField label="Descrição" htmlFor="product-description">
        <textarea
          id="product-description"
          value={description ?? ''}
          onChange={(event) => setDescription(event.target.value)}
          rows={4}
          className={controlClasses}
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Categoria" htmlFor="product-category" required error={errors.categoryId}>
          <select
            id="product-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={controlClasses}
          >
            <option value="">(selecionar)</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
                {!category.is_active ? ' (inativa)' : ''}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Marca" htmlFor="product-brand" hint="Opcional.">
          <select
            id="product-brand"
            value={brandId}
            onChange={(event) => setBrandId(event.target.value)}
            className={controlClasses}
          >
            <option value="">(sem marca)</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
                {!brand.is_active ? ' (inativa)' : ''}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <FormField
        label="Referência principal"
        htmlFor="product-primary-reference"
        required
        error={errors.primaryReference}
        hint="O número de peça canónico desta loja para este artigo."
      >
        <Input
          id="product-primary-reference"
          value={primaryReference}
          onChange={(event) => setPrimaryReference(event.target.value)}
          required
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Condição" htmlFor="product-condition">
          <select
            id="product-condition"
            value={condition}
            onChange={(event) => setCondition(event.target.value as ProductCondition)}
            className={controlClasses}
          >
            {CONDITION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Publicação"
          htmlFor="product-status"
          hint="Só produtos 'Disponível' aparecem no catálogo público."
        >
          <select
            id="product-status"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProductStatus)}
            className={controlClasses}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <FormField label="Quantidade em stock" htmlFor="product-stock" error={errors.stockQuantity}>
          <Input
            id="product-stock"
            type="number"
            min={0}
            value={stockQuantity}
            onChange={(event) => setStockQuantity(Number(event.target.value))}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Preço" htmlFor="product-price" required error={errors.price}>
          <Input
            id="product-price"
            inputMode="decimal"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            placeholder="0.00"
            required
          />
        </FormField>

        <FormField label="Moeda" htmlFor="product-currency" required error={errors.currency}>
          <Input
            id="product-currency"
            value={currency}
            maxLength={3}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            required
          />
        </FormField>
      </div>

      <FormField
        label="Notas de compatibilidade"
        htmlFor="product-compatibility-notes"
        hint="Texto livre (ex.: 'compatível com a maioria dos modelos 2015-2018'). Não é um sistema estruturado de compatibilidade de veículos."
      >
        <textarea
          id="product-compatibility-notes"
          value={compatibilityNotes ?? ''}
          onChange={(event) => setCompatibilityNotes(event.target.value)}
          rows={2}
          className={controlClasses}
        />
      </FormField>

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
