'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Loader2,
  KeyRound,
  Copy,
  Check,
  Trash2,
  LockKeyhole,
} from 'lucide-react';

interface TotpFactor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

export function MfaSettingsCard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [verifiedFactors, setVerifiedFactors] = useState<TotpFactor[]>([]);
  const [currentAal, setCurrentAal] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  // Active enrollment data
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [qrCodeSvg, setQrCodeSvg] = useState<string | null>(null);
  const [manualSecret, setManualSecret] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadMfaState = useCallback(async () => {
    setLoading(true);
    try {
      const [factorsRes, aalRes] = await Promise.all([
        supabase.auth.mfa.listFactors(),
        supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      ]);

      const allTotp = factorsRes.data?.totp || [];
      setVerifiedFactors(allTotp.filter((f) => f.status === 'verified'));
      setCurrentAal(aalRes.data?.currentLevel || null);
    } catch (err) {
      console.error('Error loading MFA status:', err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadMfaState();
  }, [loadMfaState]);

  const handleStartEnrollment = async () => {
    setEnrolling(true);
    setFeedback(null);
    setVerifyCode('');

    try {
      // Remove any stale unverified TOTP factors so re-enrollment never conflicts
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const unverified = (existing?.totp || []).filter((f) => f.status !== 'verified');
      for (const stale of unverified) {
        await supabase.auth.mfa.unenroll({ factorId: stale.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'KAIROS ERP Authenticator',
      });

      if (error || !data?.totp) {
        throw new Error(error?.message || 'No se pudo iniciar la configuración 2FA.');
      }

      setPendingFactorId(data.id);
      setQrCodeSvg(data.totp.qr_code);
      setManualSecret(data.totp.secret);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Error al generar código QR.' });
    } finally {
      setEnrolling(false);
    }
  };

  const handleCancelEnrollment = async () => {
    if (pendingFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: pendingFactorId }).catch(() => {});
    }
    setPendingFactorId(null);
    setQrCodeSvg(null);
    setManualSecret(null);
    setVerifyCode('');
  };

  const handleVerifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingFactorId) return;

    const cleanCode = verifyCode.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setFeedback({ type: 'error', message: 'Ingresa exactamente los 6 dígitos de tu app autenticadora.' });
      return;
    }

    setVerifying(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: pendingFactorId,
        code: cleanCode,
      });
      if (error) {
        throw new Error(
          error.message.toLowerCase().includes('invalid')
            ? 'Código incorrecto o expirado. Verifica la hora de tu teléfono e intenta con el código actual.'
            : error.message
        );
      }

      setPendingFactorId(null);
      setQrCodeSvg(null);
      setManualSecret(null);
      setVerifyCode('');
      setFeedback({
        type: 'success',
        message: 'Verificación en Dos Pasos (2FA) activada correctamente. Tu cuenta está protegida con nivel AAL2.',
      });
      await loadMfaState();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'No se pudo verificar el código.' });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnenroll = async (factorId: string) => {
    if (
      !confirm(
        '¿Seguro que deseas desactivar la Verificación en Dos Pasos (2FA)? Tu cuenta Super Admin quedará protegida solo por contraseña.'
      )
    ) {
      return;
    }

    setRemovingId(factorId);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        throw new Error(error.message);
      }
      setFeedback({
        type: 'success',
        message: 'Factor 2FA eliminado. Puedes volver a vincular un nuevo dispositivo cuando quieras.',
      });
      await loadMfaState();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'No se pudo desactivar el factor 2FA. Asegúrate de tener sesión verificada.',
      });
    } finally {
      setRemovingId(null);
    }
  };

  const handleCopySecret = async () => {
    if (!manualSecret) return;
    try {
      await navigator.clipboard.writeText(manualSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } catch {
      alert(`Clave secreta 2FA: ${manualSecret}`);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Comprobando estado de seguridad 2FA...
        </CardContent>
      </Card>
    );
  }

  const isEnabled = verifiedFactors.length > 0;

  return (
    <Card className={isEnabled ? 'border-emerald-500/30' : 'border-amber-500/40'}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isEnabled
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
              }`}
            >
              {isEnabled ? <ShieldCheck className="h-5 w-5" /> : <ShieldAlert className="h-5 w-5" />}
            </div>
            <div>
              <CardTitle className="text-base">
                Autenticación en Dos Pasos (2FA / App Autenticadora)
              </CardTitle>
              <CardDescription className="mt-1">
                Exige un código dinámico de 6 dígitos desde Google Authenticator, Microsoft Authenticator o Authy cada vez que alguien intente entrar a tu cuenta.
              </CardDescription>
            </div>
          </div>

          <Badge
            className={
              isEnabled
                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shrink-0'
                : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shrink-0'
            }
          >
            {isEnabled ? `2FA Activo (${currentAal?.toUpperCase() || 'AAL2'})` : '2FA Desactivado'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            {feedback.message}
          </div>
        )}

        {/* Active verified factors */}
        {isEnabled && !pendingFactorId && (
          <div className="space-y-3">
            {verifiedFactors.map((factor) => (
              <div
                key={factor.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border bg-muted/20"
              >
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">
                      {factor.friendly_name || 'App Autenticadora (TOTP)'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Vinculado el {new Date(factor.created_at).toLocaleDateString('es-CL')} • Exigido en Login y rutas administrativas
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={removingId === factor.id}
                  onClick={() => handleUnenroll(factor.id)}
                  className="text-destructive hover:text-destructive gap-1.5"
                >
                  {removingId === factor.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  Desactivar 2FA
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Start enrollment CTA */}
        {!isEnabled && !pendingFactorId && (
          <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">
                Protege tu acceso de Super Administrador inmediatamente
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Incluso si alguien obtuviera tu contraseña, sin el código temporal de tu celular será bloqueado tanto en la web como en las APIs del servidor.
              </p>
            </div>
            <Button
              type="button"
              onClick={handleStartEnrollment}
              disabled={enrolling}
              className="gap-2 shrink-0"
            >
              {enrolling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LockKeyhole className="h-4 w-4" />
              )}
              Activar 2FA Ahora
            </Button>
          </div>
        )}

        {/* Enrollment Step: QR + Secret + 6-digit Verify */}
        {pendingFactorId && qrCodeSvg && (
          <div className="rounded-xl border bg-muted/20 p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border shadow-2xs space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrCodeSvg}
                  alt="Código QR para autenticación 2FA"
                  className="w-48 h-48 object-contain"
                />
                <span className="text-[11px] text-slate-500 text-center">
                  Escanea este QR con Google Authenticator, Authy o 1Password
                </span>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-semibold">Paso 1: Escanea el código QR</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Si no puedes escanear el código, copia esta clave manual en tu aplicación autenticadora:
                  </p>
                  {manualSecret && (
                    <div className="mt-2 flex items-center gap-2">
                      <code className="flex-1 px-2.5 py-1.5 rounded-md bg-background border font-mono text-xs break-all">
                        {manualSecret}
                      </code>
                      <Button type="button" variant="outline" size="sm" onClick={handleCopySecret}>
                        {copiedSecret ? (
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleVerifyEnrollment} className="space-y-3 pt-2 border-t">
                  <div className="space-y-1.5">
                    <Label htmlFor="totp-verify" className="text-xs font-semibold flex items-center gap-1.5">
                      <KeyRound className="h-3.5 w-3.5 text-primary" />
                      Paso 2: Ingresa el código de 6 dígitos
                    </Label>
                    <Input
                      id="totp-verify"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={verifyCode}
                      onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="font-mono text-center text-lg tracking-[0.4em]"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button type="submit" disabled={verifying} className="flex-1 gap-2">
                      {verifying && <Loader2 className="h-4 w-4 animate-spin" />}
                      Verificar y Activar 2FA
                    </Button>
                    <Button type="button" variant="outline" onClick={handleCancelEnrollment}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
