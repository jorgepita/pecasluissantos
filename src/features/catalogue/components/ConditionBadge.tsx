import { Badge } from '@/components/ui/Badge';
import type { ProductCondition } from '@/types/database';

const CONDITION_LABEL: Record<ProductCondition, string> = {
  new: 'Novo',
  used: 'Usado',
  refurbished: 'Recondicionado',
};

const CONDITION_TONE: Record<ProductCondition, 'success' | 'neutral' | 'warning'> = {
  new: 'success',
  used: 'neutral',
  refurbished: 'warning',
};

export function ConditionBadge({ condition }: { condition: ProductCondition }) {
  return <Badge tone={CONDITION_TONE[condition]}>{CONDITION_LABEL[condition]}</Badge>;
}
