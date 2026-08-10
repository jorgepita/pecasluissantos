import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type ContainerProps = HTMLAttributes<HTMLDivElement>;

/** Centred, max-width, responsive page container used by both layouts. */
export function Container({ className, ...props }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)} {...props} />
  );
}
