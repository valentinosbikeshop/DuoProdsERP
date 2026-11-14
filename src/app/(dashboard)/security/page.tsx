'use client';

import { LockKeyhole, Shield, Loader2 } from 'lucide-react';
import { useUser } from '@/hooks/use-user';
import { MfaSettingsCard } from '@/components/auth/mfa-settings-card';
import { Card, CardContent } from '@/components/ui/card';

export default function SecurityPage() {
  const { loading, isDemo } = useUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Seguridad de la Cuenta</h1>
          <p className="text-sm text-muted-foreground">
            Configura protección adicional mediante verificación en dos pasos (2FA / TOTP).
          </p>
        </div>
      </div>

      {isDemo ? (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="p-8 text-center space-y-2">
            <LockKeyhole className="h-8 w-8 text-amber-600 mx-auto" />
            <p className="text-sm font-semibold">No disponible en Sesión de Prueba</p>
            <p className="text-xs text-muted-foreground">
              La configuración 2FA está reservada para cuentas privadas de empresas reales y Super Administradores.
            </p>
          </CardContent>
        </Card>
      ) : (
        <MfaSettingsCard />
      )}
    </div>
  );
}
