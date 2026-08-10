import { useState, type FormEvent } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { saveStoreConfig } from '@/services/storeConfigService';
import type { StoreConfig } from '@/types/store-config';
import { FormField } from '../shared/FormField';
import { KeyValueListEditor } from '../shared/KeyValueListEditor';

interface StoreSettingsFormProps {
  initial: StoreConfig;
  onSaved: (config: StoreConfig) => void;
}

/**
 * Edits the existing `store_settings` row via the existing
 * `StoreConfig`/`saveStoreConfig()` — no second settings model. Every
 * column from the schema is editable, including `primary_color`/
 * `secondary_color`: the task asks to edit the existing fields, and these
 * are real columns — but the storefront still doesn't apply them
 * anywhere (see docs/ARCHITECTURE.md, a standing Phase 0 deferral this
 * form doesn't reopen), so the hint text says so.
 */
export function StoreSettingsForm({ initial, onSaved }: StoreSettingsFormProps) {
  const [storeName, setStoreName] = useState(initial.storeName);
  const [logoUrl, setLogoUrl] = useState(initial.logoUrl ?? '');
  const [phone, setPhone] = useState(initial.phone ?? '');
  const [whatsappNumber, setWhatsappNumber] = useState(initial.whatsappNumber ?? '');
  const [email, setEmail] = useState(initial.email ?? '');
  const [address, setAddress] = useState(initial.address ?? '');
  const [openingHours, setOpeningHours] = useState<Record<string, string>>(
    initial.openingHours ?? {},
  );
  const [socialMedia, setSocialMedia] = useState<Record<string, string>>(initial.socialMedia ?? {});
  const [primaryColor, setPrimaryColor] = useState(initial.primaryColor ?? '');
  const [secondaryColor, setSecondaryColor] = useState(initial.secondaryColor ?? '');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!storeName.trim()) next.storeName = 'O nome da loja é obrigatório.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccessMessage(null);
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const saved = await saveStoreConfig({
        storeName: storeName.trim(),
        logoUrl: logoUrl.trim() || null,
        phone: phone.trim() || null,
        whatsappNumber: whatsappNumber.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        openingHours: Object.keys(openingHours).length > 0 ? openingHours : null,
        socialMedia: Object.keys(socialMedia).length > 0 ? socialMedia : null,
        primaryColor: primaryColor.trim() || null,
        secondaryColor: secondaryColor.trim() || null,
      });
      onSaved(saved);
      setSuccessMessage('Definições guardadas com sucesso.');
    } catch {
      setSubmitError('Não foi possível guardar as definições.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Nome da loja"
          htmlFor="settings-store-name"
          required
          error={errors.storeName}
        >
          <Input
            id="settings-store-name"
            value={storeName}
            onChange={(event) => setStoreName(event.target.value)}
            required
          />
        </FormField>
        <FormField
          label="URL do logótipo"
          htmlFor="settings-logo-url"
          hint="Endereço de uma imagem já alojada online."
        >
          <Input
            id="settings-logo-url"
            value={logoUrl}
            onChange={(event) => setLogoUrl(event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Telefone" htmlFor="settings-phone">
          <Input
            id="settings-phone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </FormField>
        <FormField
          label="WhatsApp"
          htmlFor="settings-whatsapp"
          hint="Apenas dígitos, com indicativo de país (ex.: 351912345678)."
        >
          <Input
            id="settings-whatsapp"
            value={whatsappNumber}
            onChange={(event) => setWhatsappNumber(event.target.value)}
          />
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Email" htmlFor="settings-email">
          <Input
            id="settings-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>
        <FormField label="Morada" htmlFor="settings-address">
          <Input
            id="settings-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </FormField>
      </div>

      <FormField label="Horário de funcionamento" htmlFor="settings-opening-hours">
        <KeyValueListEditor
          entries={openingHours}
          onChange={setOpeningHours}
          keyPlaceholder="Dias (ex.: Segunda a Sexta)"
          valuePlaceholder="Horário (ex.: 9h - 18h)"
          addLabel="Adicionar horário"
        />
      </FormField>

      <FormField label="Redes sociais" htmlFor="settings-social-media">
        <KeyValueListEditor
          entries={socialMedia}
          onChange={setSocialMedia}
          keyPlaceholder="Rede (ex.: Facebook)"
          valuePlaceholder="URL"
          addLabel="Adicionar rede social"
        />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Cor primária"
          htmlFor="settings-primary-color"
          hint="Guardada, mas ainda não aplicada visualmente no site."
        >
          <Input
            id="settings-primary-color"
            value={primaryColor}
            onChange={(event) => setPrimaryColor(event.target.value)}
            placeholder="#1D4ED8"
          />
        </FormField>
        <FormField
          label="Cor secundária"
          htmlFor="settings-secondary-color"
          hint="Guardada, mas ainda não aplicada visualmente no site."
        >
          <Input
            id="settings-secondary-color"
            value={secondaryColor}
            onChange={(event) => setSecondaryColor(event.target.value)}
            placeholder="#F59E0B"
          />
        </FormField>
      </div>

      {submitError && <p className="text-sm text-danger-500">{submitError}</p>}
      {successMessage && <p className="text-sm text-success-700">{successMessage}</p>}

      <div>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'A guardar...' : 'Guardar definições'}
        </Button>
      </div>
    </form>
  );
}
