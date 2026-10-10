import { useState, type FormEvent } from "react";
import type { AddressInput, SavedAddress } from "@shared/store";
import { Button } from "@/components/ui/Button";
import { Field, FormError, StateField } from "@/components/ui/Field";
import { errorMessage } from "@/lib/api";

const empty: AddressInput = { name: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "" };

interface AddressFormProps {
  initial?: SavedAddress;
  onSave: (address: AddressInput) => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({ initial, onSave, onCancel }: AddressFormProps) {
  const [address, setAddress] = useState<AddressInput>(() => {
    if (!initial) return empty;
    const { id: _id, ...rest } = initial;
    return rest;
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (field: keyof AddressInput) => (value: string) => setAddress((a) => ({ ...a, [field]: value }));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(address);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-x-6 gap-y-7 border border-line bg-surface p-6 sm:grid-cols-2">
      <Field label="Full name" autoComplete="name" required value={address.name} onChange={set("name")} />
      <Field label="Phone" type="tel" autoComplete="tel" inputMode="tel" required value={address.phone} onChange={set("phone")} />
      <Field label="Address" autoComplete="address-line1" required value={address.line1} onChange={set("line1")} className="sm:col-span-2" />
      <Field label="Apartment, landmark (optional)" autoComplete="address-line2" value={address.line2} onChange={set("line2")} className="sm:col-span-2" />
      <Field label="City" autoComplete="address-level2" required value={address.city} onChange={set("city")} />
      <StateField value={address.state} onChange={set("state")} />
      <Field
        label="PIN code"
        autoComplete="postal-code"
        inputMode="numeric"
        pattern="[1-9][0-9]{5}"
        maxLength={6}
        required
        value={address.postalCode}
        onChange={set("postalCode")}
      />
      {!initial?.isDefault && (
        <label className="flex items-center gap-3 self-end pb-3 text-body-sm text-muted">
          <input type="checkbox" checked={address.isDefault ?? false} onChange={(e) => setAddress((a) => ({ ...a, isDefault: e.target.checked }))} className="size-4 accent-ivory" />
          Make this my default address
        </label>
      )}
      <div className="sm:col-span-2">
        <FormError>{error}</FormError>
      </div>
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" size="sm" disabled={busy}>
          {busy ? "Saving…" : "Save address"}
        </Button>
        <Button variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function AddressLines({ address }: { address: Pick<SavedAddress, "name" | "phone" | "line1" | "line2" | "city" | "state" | "postalCode"> }) {
  return (
    <address className="not-italic leading-relaxed text-muted">
      <span className="text-ivory">{address.name}</span>
      <br />
      {address.line1}
      {address.line2 && <>, {address.line2}</>}
      <br />
      {address.city}, {address.state} {address.postalCode}
      <br />
      {address.phone}
    </address>
  );
}
