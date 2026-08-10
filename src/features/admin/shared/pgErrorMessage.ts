import type { PostgrestError } from '@supabase/supabase-js';

/**
 * Translates the Postgres/PostgREST error codes an admin form is actually
 * likely to hit into a plain PT-PT message. Not exhaustive — falls back to
 * a generic message rather than a raw Postgres error, since exposing "new
 * row violates row-level security policy" to a store admin isn't useful.
 *
 * Codes: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
export function pgErrorMessage(error: PostgrestError, fallback: string): string {
  switch (error.code) {
    case '23505': // unique_violation
      return 'Já existe um registo com estes valores (nome, slug ou referência duplicados).';
    case '23503': // foreign_key_violation
      return 'Esta operação não é possível porque este registo está a ser utilizado por outro (por exemplo, uma categoria com produtos associados).';
    case '23514': // check_violation
      return 'Um dos valores introduzidos não é válido (verifique o formato do slug, preço ou quantidade).';
    case '42501': // insufficient_privilege (RLS denial)
      return 'Não tem permissões para executar esta operação.';
    default:
      return fallback;
  }
}
