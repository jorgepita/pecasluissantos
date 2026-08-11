import { Badge } from '@/components/ui/Badge';
import { conditionLabel } from '../format';
import type { ProductCondition } from '@/types/database';

const CONDITION_TONE: Record<ProductCondition, 'success' | 'neutral' | 'warning'> = {
  new: 'success',
  used: 'neutral',
  refurbished: 'warning',
};

export function ConditionBadge({ condition }: { condition: ProductCondition }) {
  return <Badge tone={CONDITION_TONE[condition]}>{conditionLabel(condition)}</Badge>;
}
