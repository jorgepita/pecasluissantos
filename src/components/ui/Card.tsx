import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type CardProps = HTMLAttributes<HTMLDivElement>;

/**
 * Base surface for grouped content — product cards, form sections, dashboard
 * panels. Intentionally unopinionated about internal layout.
 */
export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn('rounded-lg border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    />
  );
}
