import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700',
  secondary: 'bg-accent-500 text-slate-900 hover:bg-accent-600 focus-visible:outline-accent-600',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400',
};

/**
 * Base button primitive. Keep variants limited on purpose — add a new one
 * only once a real use case needs it, not speculatively.
 */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  );
}
