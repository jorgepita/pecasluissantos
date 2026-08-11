import { useState } from 'react';
import { cn } from '@/utils/cn';
import { CatalogueImage } from './CatalogueImage';
import type { ProductImageRow } from '@/types/database';

interface ProductGalleryProps {
  images: ProductImageRow[];
  productName: string;
}

/** Large image + thumbnail strip. Handles zero, one, or many images —
 * `CatalogueImage` already covers the "no image at all" fallback. */
export function ProductGallery({ images, productName }: ProductGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selected = images[selectedIndex] ?? null;

  return (
    <div>
      <CatalogueImage
        storagePath={selected?.storage_path ?? null}
        alt={selected?.alt_text ?? productName}
        className="aspect-square w-full rounded-lg"
      />

      {images.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => (
            <button
              key={image.id}
              type="button"
              onClick={() => setSelectedIndex(index)}
              aria-label={`Ver imagem ${index + 1} de ${images.length}`}
              aria-current={index === selectedIndex}
              className={cn(
                'shrink-0 overflow-hidden rounded-md border-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700',
                index === selectedIndex ? 'border-brand-600' : 'border-transparent',
              )}
            >
              <CatalogueImage
                storagePath={image.storage_path}
                alt={image.alt_text ?? productName}
                className="h-16 w-16"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
