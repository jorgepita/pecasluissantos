import { useState } from 'react';
import { cn } from '@/utils/cn';
import { getPublicImageUrl } from '../api';

interface CatalogueImageProps {
  storagePath: string | null;
  alt: string;
  className?: string;
  /**
   * `object-fit` for the rendered `<img>`. Defaults to `'cover'` (crop to
   * fill the box) — correct for fixed-size thumbnails (grid cards, gallery
   * thumbnail strip), where a uniform box matters more than seeing every
   * edge of the photo. Pass `'contain'` where the complete photograph must
   * stay visible with nothing cropped, e.g. the product-detail main image
   * (see `ProductGallery.tsx`) — a photo whose aspect ratio doesn't match
   * the box then letterboxes instead of losing content.
   */
  fit?: 'cover' | 'contain';
}

/**
 * Product photo with a graceful fallback — used for both the small grid
 * thumbnail and the large detail-page image. Falls back when there's no
 * `storagePath` at all (product has no images yet) or the object fails to
 * load (e.g. a stale/deleted Storage object — see docs/DATABASE.md
 * "Known gap" on orphaned objects, which cuts both ways).
 */
export function CatalogueImage({
  storagePath,
  alt,
  className,
  fit = 'cover',
}: CatalogueImageProps) {
  const [failed, setFailed] = useState(false);
  const showFallback = !storagePath || failed;

  if (showFallback) {
    return (
      <div
        className={cn('flex items-center justify-center bg-slate-100 text-slate-400', className)}
        role="img"
        aria-label={alt}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-8 w-8"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" />
          <path d="m21 15-5-5-9 9" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={getPublicImageUrl(storagePath)}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        'bg-slate-100',
        fit === 'contain' ? 'object-contain' : 'object-cover',
        className,
      )}
    />
  );
}
