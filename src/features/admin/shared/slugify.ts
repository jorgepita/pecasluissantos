/**
 * Best-effort slug generator for the "generate from name" form helper.
 * Mirrors the database's slug format check (`^[a-z0-9]+(-[a-z0-9]+)*$`)
 * closely enough for common cases — admins can still edit the result by
 * hand, and the DB constraint is the actual enforcement either way.
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents (e.g. "ç" -> "c")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Same check the database enforces via a `check` constraint. */
export function isValidSlug(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}
