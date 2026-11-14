'use client';

import { useEffect, useState } from 'react';
import { Building2, ImagePlus, Landmark, Loader2, Trash2 } from 'lucide-react';
import type { Organization, OrganizationBankInfo } from '@/types';
import { fileToNormalizedPngDataUrl } from '@/lib/image-to-png';
import { CompanyLogoMark } from '@/components/ui/kairos-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface LogoUploadFieldProps {
  companyName: string;
  logoUrl: string;
  onChange: (nextUrl: string) => void;
}

export function LogoUploadField({ companyName, logoUrl, onChange }: LogoUploadFieldProps) {
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProcessing(true);
    setUploadError(null);
    try {
      const pngDataUrl = await fileToNormalizedPngDataUrl(file, 256);
      onChange(pngDataUrl);
    } catch (err: any) {
      setUploadError(err?.message || 'No se pudo procesar el logo.');
    } finally {
      setProcessing(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <CompanyLogoMark name={companyName || 'Empresa'} logoUrl={logoUrl || null} size="md" />
          <div className="min-w-0">
            <p className="text-xs font-semibold">Logo Corporativo</p>
            <p className="text-[11px] text-muted-foreground">
              Visible en la barra lateral y en cotizaciones PDF. Formatos: PNG, JPG, SVG o WEBP.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border bg-background hover:bg-accent text-xs font-medium cursor-pointer transition-colors">
            {processing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ImagePlus className="h-3.5 w-3.5" />
            )}
            <span>{logoUrl ? 'Cambiar' : 'Subir Logo'}</span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleFileChange}
              disabled={processing}
              className="hidden"
            />
          </label>
          {logoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="h-8 px-2 text-destructive hover:text-destructive"
              title="Quitar logo"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {uploadError && (
        <p className="text-xs text-destructive">{uploadError}</p>
      )}
    </div>
  );
}

interface CompanyBrandingDialogProps {
  company: Organization | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => void;
}

export function CompanyBrandingDialog({
  company,
  open,
  onOpenChange,
  onSaved,
}: CompanyBrandingDialogProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [rut, setRut] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [location, setLocation] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [bankInfo, setBankInfo] = useState<OrganizationBankInfo>({});

  useEffect(() => {
    if (company && open) {
      setError(null);
      setName(company.name || '');
      setLegalName(company.legal_name || '');
      setRut(company.rut || '');
      setSubtitle(company.subtitle || '');
      setLocation(company.location || '');
      setContactEmail(company.contact_email || '');
      setContactPhone(company.contact_phone || '');
      setLogoUrl(company.logo_url || '');
      setBankInfo({
        banco: company.bank_info?.banco || '',
        tipo_cuenta: company.bank_info?.tipo_cuenta || '',
        numero_cuenta: company.bank_info?.numero_cuenta || '',
        titular: company.bank_info?.titular || '',
        rut: company.bank_info?.rut || '',
        email: company.bank_info?.email || '',
      });
    }
  }, [company, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/companies', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: company.id,
          name: name.trim(),
          legal_name: legalName.trim() || null,
          rut: rut.trim() || null,
          subtitle: subtitle.trim() || null,
          location: location.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          logo_url: logoUrl.trim() || null,
          bank_info: bankInfo,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'No se pudo actualizar la marca de la empresa.');
        return;
      }

      window.dispatchEvent(new Event('kairos:org-updated'));
      onOpenChange(false);
      onSaved(`Marca, logo y datos bancarios de "${name.trim()}" actualizados.`);
    } catch {
      setError('Error de conexión al guardar cambios.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <form onSubmit={handleSave} className="flex flex-col max-h-[85dvh]">
        <DialogHeader>
          <DialogTitle>
            <Building2 className="h-5 w-5 text-primary" />
            Personalizar Marca, Logo y Membrete PDF
          </DialogTitle>
          <DialogDescription>
            Configura el logotipo e identidad corporativa que verán tus usuarios y clientes en cotizaciones oficiales.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive">
              {error}
            </div>
          )}

          <LogoUploadField companyName={name} logoUrl={logoUrl} onChange={setLogoUrl} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Nombre Comercial *</label>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Razón Social</label>
              <Input
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">RUT Empresa</label>
              <Input
                value={rut}
                onChange={(e) => setRut(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Ciudad / Ubicación</label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium">Subtítulo / Giro en Cotización PDF</label>
              <Input
                placeholder="Ej: PRODUCCIÓN INTEGRAL DE EVENTOS & BANQUETERÍA"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Email Comercial</label>
              <Input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Teléfono Comercial</label>
              <Input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-3 border-t space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Landmark className="h-3.5 w-3.5 text-primary" />
              Datos Bancarios para Transferencia (Pie de Cotizaciones PDF)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Banco</label>
                <Input
                  placeholder="Ej: Banco de Chile / Santander"
                  value={bankInfo.banco || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, banco: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Tipo de Cuenta</label>
                <Input
                  placeholder="Ej: Cuenta Corriente"
                  value={bankInfo.tipo_cuenta || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, tipo_cuenta: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">N° de Cuenta</label>
                <Input
                  value={bankInfo.numero_cuenta || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, numero_cuenta: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Titular</label>
                <Input
                  value={bankInfo.titular || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, titular: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">RUT Titular</label>
                <Input
                  value={bankInfo.rut || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, rut: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Email Notificación Pago</label>
                <Input
                  value={bankInfo.email || ''}
                  onChange={(e) => setBankInfo({ ...bankInfo, email: e.target.value })}
                />
              </div>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar Identidad
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
