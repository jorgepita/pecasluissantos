import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions (delete, etc.) get a red confirm button. */
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Simple, dependency-free confirmation modal — used before every
 * destructive admin action (delete product, remove image, remove alias). */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  busy,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <Card className="w-full max-w-sm p-6">
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600">{message}</p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            className={
              danger ? 'bg-danger-500 hover:bg-danger-700 focus-visible:outline-danger-500' : ''
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'A processar...' : confirmLabel}
          </Button>
        </div>
      </Card>
    </div>
  );
}
