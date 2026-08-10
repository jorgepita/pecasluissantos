import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';
import { buttonBaseClasses, buttonVariantClasses, type ButtonVariant } from './buttonStyles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

/**
 * Base button primitive. Keep variants limited on purpose — add a new one
 * only once a real use case needs it, not speculatively.
 */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonBaseClasses, buttonVariantClasses[variant], className)}
      {...props}
    />
  );
}
