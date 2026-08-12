import { useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CatalogueImage } from '@/features/catalogue/components/CatalogueImage';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  deleteProductImage,
  reorderProductImage,
  setPrimaryProductImage,
  uploadProductImage,
} from './api';
import type { ProductImageRow } from '@/types/database';

interface ProductImageManagerProps {
  productId: number;
  images: ProductImageRow[];
  /** Called after any successful mutation so the parent (which owns the
   * data via useAdminProduct) refetches and passes fresh `images` back. */
  onChanged: () => void;
}

/** Upload/preview/delete/reorder/set-primary for a product's photos, on
 * top of the existing `product-images` Storage bucket and `product_images`
 * table — no new bucket, no new table. */
export function ProductImageManager({ productId, images, onChanged }: ProductImageManagerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<number | null>(null);
  const [imageToDelete, setImageToDelete] = useState<ProductImageRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const sortedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = ''; // allow re-selecting the same file afterwards
    if (!file) return;

    setActionError(null);

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setActionError('Formato não suportado. Utilize JPEG, PNG ou WebP.');
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setActionError('O ficheiro excede o limite de 5 MB.');
      return;
    }

    setUploading(true);
    try {
      await uploadProductImage(productId, file);
      onChanged();
    } catch {
      setActionError('Não foi possível enviar a imagem. Tente novamente.');
    } finally {
      setUploading(false);
    }
  }

  async function handleSetPrimary(imageId: number) {
    setPendingAction(imageId);
    setActionError(null);
    try {
      await setPrimaryProductImage(productId, imageId);
      onChanged();
    } catch {
      setActionError('Não foi possível definir a imagem principal.');
    } finally {
      setPendingAction(null);
    }
  }

  async function handleReorder(image: ProductImageRow, direction: 'up' | 'down') {
    setPendingAction(image.id);
    setActionError(null);
    try {
      await reorderProductImage(image, direction, sortedImages);
      onChanged();
    } catch {
      setActionError('Não foi possível reordenar as imagens.');
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmDelete() {
    if (!imageToDelete) return;
    setDeleting(true);
    setActionError(null);
    try {
      await deleteProductImage(imageToDelete);
      onChanged();
      setImageToDelete(null);
    } catch {
      setActionError('Não foi possível remover a imagem.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(',')}
          className="hidden"
          onChange={(event) => void handleFileChange(event)}
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? 'A enviar...' : 'Carregar imagem'}
        </Button>
        <span className="text-xs text-slate-500">JPEG, PNG ou WebP, até 5 MB.</span>
      </div>

      {actionError && <p className="mt-2 text-sm text-danger-500">{actionError}</p>}

      {sortedImages.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Ainda não existem imagens para este produto.</p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {sortedImages.map((image, index) => (
            <Card key={image.id} className="overflow-hidden">
              <div className="relative">
                <CatalogueImage
                  storagePath={image.storage_path}
                  alt={image.alt_text ?? ''}
                  className="h-32 w-full"
                />
                <span className="absolute left-1.5 top-1.5 rounded-full bg-slate-900/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {index + 1}
                </span>
                {image.is_primary && (
                  <Badge tone="success" className="absolute right-1.5 top-1.5 shadow-sm">
                    Principal
                  </Badge>
                )}
              </div>
              <div className="space-y-1 p-2 text-xs">
                {image.is_primary ? (
                  <p className="font-medium text-brand-700">Imagem principal</p>
                ) : (
                  <button
                    type="button"
                    className="text-brand-700 hover:underline disabled:opacity-50"
                    disabled={pendingAction === image.id}
                    onClick={() => void handleSetPrimary(image.id)}
                  >
                    Tornar principal
                  </button>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="disabled:opacity-30"
                      disabled={index === 0 || pendingAction === image.id}
                      onClick={() => void handleReorder(image, 'up')}
                      aria-label="Mover para cima"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="disabled:opacity-30"
                      disabled={index === sortedImages.length - 1 || pendingAction === image.id}
                      onClick={() => void handleReorder(image, 'down')}
                      aria-label="Mover para baixo"
                    >
                      ↓
                    </button>
                  </div>
                  <button
                    type="button"
                    className="text-danger-500 hover:underline"
                    onClick={() => setImageToDelete(image)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={imageToDelete !== null}
        title="Remover imagem"
        message="Tem a certeza que pretende remover esta imagem? Esta ação não pode ser revertida."
        confirmLabel="Remover"
        danger
        busy={deleting}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setImageToDelete(null)}
      />
    </div>
  );
}
