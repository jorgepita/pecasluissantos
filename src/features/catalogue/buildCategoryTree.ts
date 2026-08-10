import type { CategoryRow } from '@/types/database';
import type { CategoryNode } from './types';

/**
 * Builds a nested tree from the flat category list the API returns.
 * Pure function — no Supabase calls here, just shaping data already fetched.
 *
 * If a category's `parent_id` points at a category that isn't in the input
 * list (e.g. the parent was deactivated, so RLS no longer returns it to an
 * anonymous request), the child is treated as a root rather than dropped —
 * losing a category from the public tree entirely would be worse than
 * showing it one level higher than intended.
 */
export function buildCategoryTree(categories: CategoryRow[]): CategoryNode[] {
  const nodeById = new Map<number, CategoryNode>();
  for (const category of categories) {
    nodeById.set(category.id, { ...category, children: [] });
  }

  const roots: CategoryNode[] = [];
  for (const category of categories) {
    const node = nodeById.get(category.id);
    if (!node) continue;

    const parent = category.parent_id !== null ? nodeById.get(category.parent_id) : undefined;
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/** Flattens a category tree back into a list with a `depth`, for an
 * indented flat filter control (e.g. a <select>). */
export function flattenCategoryTree(
  nodes: CategoryNode[],
  depth = 0,
): Array<{ category: CategoryRow; depth: number }> {
  const result: Array<{ category: CategoryRow; depth: number }> = [];
  for (const node of nodes) {
    const { children, ...category } = node;
    result.push({ category, depth });
    result.push(...flattenCategoryTree(children, depth + 1));
  }
  return result;
}
