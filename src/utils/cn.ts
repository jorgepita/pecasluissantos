/**
 * Tiny classnames helper — joins truthy class strings with a space.
 *
 * Deliberately not a dependency (clsx/tailwind-merge): at this stage the
 * design system is small enough that a one-line join covers every case.
 * Revisit if conditional class logic gets meaningfully more complex.
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
