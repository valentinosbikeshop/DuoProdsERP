'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FlaskConical, RotateCcw, LogOut, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface DemoQuotaStats {
  userEventsCount: number;
  maxEvents: number;
  userCostsCount: number;
  maxCosts: number;
  userItemsCount: number;
  maxItems: number;
}

export function DemoBanner() {
  const router = useRouter();
  const supabase = createClient();
  const [stats, setStats] = useState<DemoQuotaStats | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/demo/status', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch {
      // Silent fail on transient network error
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleReset = async () => {
    setResetting(true);
    setResetMessage(null);
    try {
      const res = await fetch('/api/demo/reset', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo resetear la sesión de prueba.');
      }
      setStats(data.stats);
      setResetMessage('Sesión restaurada con éxito. Recargando...');
      setTimeout(() => {
        setConfirmOpen(false);
        window.location.href = '/';
      }, 700);
    } catch (err: any) {
      alert(err.message || 'Error al resetear la sesión de prueba.');
      setResetting(false);
    }
  };

  const handleExitDemo = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      <div
        role="region"
        aria-label="Barra de sesión de prueba"
        className="bg-slate-900 text-slate-100 border-b border-indigo-500/30 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <Badge className="bg-amber-400 text-slate-950 hover:bg-amber-400 font-bold tracking-wide uppercase px-2 py-0.5 flex items-center gap-1.5">
            <FlaskConical className="h-3.5 w-3.5" />
            Sesión de Prueba
          </Badge>
          <span className="text-slate-300 leading-snug">
            Entorno sandbox aislado con ejemplos avanzados. Crea, edita y prueba libremente.
          </span>
          {stats && (
            <span className="inline-flex items-center gap-2 rounded-md bg-slate-800/90 border border-slate-700 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
              <span>Eventos nuevos: {stats.userEventsCount}/{stats.maxEvents}</span>
              <span className="text-slate-600">•</span>
              <span>Tarifas nuevas: {stats.userCostsCount}/{stats.maxCosts}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setResetMessage(null);
              setConfirmOpen(true);
            }}
            className="h-8 gap-1.5 text-xs font-semibold bg-amber-400 text-slate-950 hover:bg-amber-300 focus-visible:ring-2 focus-visible:ring-amber-300 transition-colors"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Resetear Prueba
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleExitDemo}
            className="h-8 gap-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen} className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <RotateCcw className="h-4 w-4 text-amber-600" />
            Resetear Sesión de Prueba
          </DialogTitle>
          <DialogDescription>
            Esta acción limpiará únicamente los datos nuevos creados durante esta prueba.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3 text-sm">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900 text-xs space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              ¿Qué ocurrirá al confirmar?
            </p>
            <ul className="list-disc pl-4 space-y-1 text-amber-800">
              <li>Se eliminarán todos los eventos, ítems y tarifas nuevas que creaste en esta sesión.</li>
              <li>Se mantendrán y restaurarán intactos los 4 eventos base y las 12 tarifas de ejemplo.</li>
            </ul>
          </div>
          {resetMessage && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{resetMessage}</span>
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setConfirmOpen(false)}
            disabled={resetting}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleReset}
            disabled={resetting}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold gap-1.5"
          >
            {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            {resetting ? 'Reseteando...' : 'Sí, Resetear Prueba'}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
