import type { InputHTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type InputProps = InputHTMLAttributes<HTMLInputElement>;

/** Base text input primitive shared by public search/filters and admin forms. */
export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:bg-slate-100',
        className,
      )}
      {...props}
    />
  );
}
