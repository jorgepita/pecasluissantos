import { useEffect, useState } from 'react';
import { Container } from '@/components/ui/Container';
import { Card } from '@/components/ui/Card';
import { getStoreConfig } from '@/services/storeConfigService';
import { StoreSettingsForm } from '@/features/admin/settings/StoreSettingsForm';
import type { StoreConfig } from '@/types/store-config';

export function SettingsPage() {
  const [config, setConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getStoreConfig()
      .then((data) => {
        if (!cancelled) setConfig(data);
      })
      .catch(() => {
        if (!cancelled) setError('Não foi possível carregar as definições.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Container className="py-10">
      <h1 className="text-2xl">Definições da loja</h1>

      {loading && <p className="mt-6 text-sm text-slate-500">A carregar...</p>}
      {error && <p className="mt-6 text-sm text-danger-500">{error}</p>}

      {!loading && !error && config && (
        <Card className="mt-6 max-w-2xl p-6">
          <StoreSettingsForm initial={config} onSaved={setConfig} />
        </Card>
      )}
    </Container>
  );
}
