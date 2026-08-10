import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  danger: 'bg-danger-50 text-danger-700',
};

/**
 * Small status indicator. Intended primary use: product availability
 * (in stock / low stock / out of stock), but kept generic.
 */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
