'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KairosLogo } from '@/components/ui/kairos-logo';
import { Loader2, ShieldCheck, LogOut } from 'lucide-react';

export default function MfaChallengePage() {
  const supabase = createClient();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.replace(/\D/g, '');
    if (cleanCode.length !== 6) {
      setError('Ingresa los 6 dígitos de tu aplicación autenticadora.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: factorsData, error: factorsErr } = await supabase.auth.mfa.listFactors();
      if (factorsErr) throw factorsErr;

      const totpFactor = factorsData?.totp?.find((f) => f.status === 'verified');
      if (!totpFactor) {
        window.location.href = '/';
        return;
      }

      const { error: verifyErr } = await supabase.auth.mfa.challengeAndVerify({
        factorId: totpFactor.id,
        code: cleanCode,
      });

      if (verifyErr) {
        throw new Error('Código incorrecto o expirado. Intenta nuevamente.');
      }

      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'No se pudo validar el código 2FA.');
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <Card className="w-full shadow-lg border-slate-200">
      <CardHeader className="space-y-3 text-center">
        <div className="flex justify-center">
          <KairosLogo size="md" />
        </div>
        <div className="mx-auto p-3 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 w-fit">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <CardTitle className="text-xl font-bold text-slate-900">
          Verificación en Dos Pasos (2FA)
        </CardTitle>
        <CardDescription className="text-slate-500">
          Esta cuenta está protegida. Ingresa el código temporal de 6 dígitos generado por tu app autenticadora.
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleVerify}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-md border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code">Código de 6 dígitos</Label>
            <Input
              id="mfa-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={6}
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="text-center font-mono text-xl tracking-[0.45em]"
              required
              disabled={loading}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Verificar y Acceder
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleSignOut}
            disabled={loading}
            className="w-full text-xs text-slate-500 gap-1.5"
          >
            <LogOut className="h-3.5 w-3.5" />
            Cerrar sesión / Usar otra cuenta
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
