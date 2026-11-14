'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { FlaskConical, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
import { KairosLogo } from '@/components/ui/kairos-logo';

export function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterDemo = async () => {
    setDemoLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/demo/enter', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo iniciar la sesión de prueba.');
      }
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Error al acceder a la sesión de prueba.');
      setDemoLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError('Por favor, ingresa tu correo electrónico primero para recuperar tu contraseña.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) throw resetError;
      alert('Se han enviado las instrucciones de recuperación a tu correo (si estás en Supabase, revisa la carpeta SPAM o configura un proveedor SMTP).');
    } catch (err: any) {
      setError(err.message || 'Error al solicitar cambio de contraseña');
    } finally {
      setLoading(false);
    }
  };

  const busy = loading || demoLoading;

  return (
    <div className="space-y-4 w-full">
      <Card className="w-full shadow-lg border-slate-200">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <KairosLogo size="lg" />
          </div>
          <CardTitle className="sr-only">KAIROS ERP</CardTitle>
          <CardDescription className="text-slate-500">
            Acceso privado multiempresa para gestión financiera, cotizaciones y producción de eventos
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm font-medium text-red-600 bg-red-50 rounded-md border border-red-100">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Correo electrónico</Label>
              <Input
                id="email"
                type="email"
                placeholder="tu@empresa.cl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={busy}
                className="focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Contraseña</Label>
                <Button
                  type="button"
                  variant="link"
                  className="px-0 h-auto text-xs"
                  onClick={handleResetPassword}
                  disabled={busy}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={busy}
                className="focus-visible:ring-primary"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={busy}>
              {loading ? 'Cargando...' : 'Iniciar sesión'}
            </Button>
            <div className="text-sm text-center text-slate-500">
              <Link href="/register" className="font-medium hover:text-primary transition-colors hover:underline">
                ¿No tienes cuenta? Regístrate
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>

      {/* Interactive Demo Sandbox Entry Card */}
      <Card className="w-full border-indigo-200 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white shadow-lg">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="h-3.5 w-3.5" />
                Evaluación para Clientes Externos
              </div>
              <h3 className="text-base font-bold text-white">
                Explorar Sesión de Prueba Interactiva
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Investiga 4 eventos reales precargados (Gala Corporativa, Fonda Retail, Matrimonio en borrador y Cumbre), prueba la IA y crea tus propios registros con reseteo en 1 clic.
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 shrink-0">
              <FlaskConical className="h-5 w-5" />
            </div>
          </div>

          <Button
            type="button"
            onClick={handleEnterDemo}
            disabled={busy}
            className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold gap-2 transition-all"
          >
            {demoLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Preparando entorno de prueba...
              </>
            ) : (
              <>
                <FlaskConical className="h-4 w-4" />
                Entrar a Sesión de Prueba (Sin Registro)
              </>
            )}
          </Button>

          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
            Entorno sandbox 100% aislado de empresas privadas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
