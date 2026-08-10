/**
 * Shared style pieces for anything that must look like a `Button` but
 * can't be one — e.g. a react-router `<Link>` used as a call-to-action.
 * Kept in their own file (not exported from Button.tsx) so that file only
 * exports the component, which is what React Fast Refresh needs.
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export const buttonBaseClasses =
  'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50';

export const buttonVariantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 text-white hover:bg-brand-800 focus-visible:outline-brand-700',
  secondary: 'bg-accent-500 text-slate-900 hover:bg-accent-600 focus-visible:outline-accent-600',
  ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus-visible:outline-slate-400',
};
