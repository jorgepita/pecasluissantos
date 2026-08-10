import { useState } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface Row {
  id: string;
  key: string;
  value: string;
}

function recordToRows(record: Record<string, string> | null): Row[] {
  return Object.entries(record ?? {}).map(([key, value], index) => ({
    id: `initial-${index}`,
    key,
    value,
  }));
}

interface KeyValueListEditorProps {
  entries: Record<string, string> | null;
  onChange: (next: Record<string, string>) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  addLabel?: string;
}

/**
 * Editor for the `opening_hours` / `social_media` jsonb columns — both
 * modeled as `Record<string, string>` (label -> text), matching what
 * `PublicLayout.tsx` already assumes when rendering them. Keeps its own
 * row list (keyed by a stable id, not the editable key text) so renaming
 * a key mid-edit doesn't lose the row or reorder the list.
 */
export function KeyValueListEditor({
  entries,
  onChange,
  keyPlaceholder = 'Nome',
  valuePlaceholder = 'Valor',
  addLabel = 'Adicionar linha',
}: KeyValueListEditorProps) {
  const [rows, setRows] = useState<Row[]>(() => recordToRows(entries));

  function emit(nextRows: Row[]) {
    setRows(nextRows);
    const record: Record<string, string> = {};
    for (const row of nextRows) {
      if (row.key.trim()) record[row.key.trim()] = row.value;
    }
    onChange(record);
  }

  function updateRow(id: string, patch: Partial<Row>) {
    emit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }

  function removeRow(id: string) {
    emit(rows.filter((row) => row.id !== id));
  }

  function addRow() {
    emit([...rows, { id: crypto.randomUUID(), key: '', value: '' }]);
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.id} className="flex gap-2">
          <Input
            placeholder={keyPlaceholder}
            value={row.key}
            onChange={(event) => updateRow(row.id, { key: event.target.value })}
            className="flex-1"
            aria-label={keyPlaceholder}
          />
          <Input
            placeholder={valuePlaceholder}
            value={row.value}
            onChange={(event) => updateRow(row.id, { value: event.target.value })}
            className="flex-1"
            aria-label={valuePlaceholder}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => removeRow(row.id)}
            aria-label="Remover linha"
          >
            &times;
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" onClick={addRow}>
        {addLabel}
      </Button>
    </div>
  );
}
