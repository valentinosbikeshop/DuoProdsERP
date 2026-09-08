'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { parseDateSafe } from '@/lib/utils';
import { Store, Sparkles } from 'lucide-react';

export function EventForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRetailSales, setHasRetailSales] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const client_company = formData.get('client_company') as string;
    const location = formData.get('location') as string;
    const event_date = formData.get('event_date') as string;
    const description = formData.get('description') as string;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('No se pudo autenticar al usuario. Por favor inicie sesión.');
      }

      let month = null;
      let year = null;
      if (event_date) {
        const parsed = parseDateSafe(event_date);
        month = parsed.month;
        year = parsed.year;
      }

      let { error: insertError } = await supabase.from('events').insert({
        name,
        client_company: client_company || null,
        location: location || null,
        event_date: event_date || null,
        description: description || null,
        status: 'planning',
        created_by: user.id,
        month,
        year,
        has_retail_sales: hasRetailSales,
      } as any).select().single();

      if (insertError && (insertError.message?.includes('has_retail_sales') || insertError.code === 'PGRST204')) {
        console.warn('has_retail_sales column not found in schema. Please run add_has_retail_sales.sql in Supabase.');
        const retry = await supabase.from('events').insert({
          name,
          client_company: client_company || null,
          location: location || null,
          event_date: event_date || null,
          description: description || null,
          status: 'planning',
          created_by: user.id,
          month,
          year,
        } as any).select().single();
        insertError = retry.error;
      }

      if (insertError) throw insertError;

      router.push('/events');
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Ocurrió un error al crear el evento.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/15 text-destructive p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del Evento *</Label>
        <Input id="name" name="name" required placeholder="Ej. Gala Anual 2026" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="client_company">Empresa Cliente</Label>
        <Input id="client_company" name="client_company" placeholder="Ej. DUO Producciones" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_date">Fecha del Evento</Label>
          <Input id="event_date" name="event_date" type="date" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Ubicación</Label>
          <Input id="location" name="location" placeholder="Ej. Centro de Eventos" />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <textarea 
          id="description" 
          name="description" 
          className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          placeholder="Describe el evento, requisitos, número de invitados, etc."
          rows={4}
        />
        <p className="text-xs text-muted-foreground mt-1">
          💡 En el siguiente paso podrás adjuntar documentos PDF o Excel (Riders técnicos, presupuestos del cliente) para que la Inteligencia Artificial los analice y extraiga costos o requerimientos especiales.
        </p>
      </div>

      {/* Selector de Modo de Venta / Tipo de Operación */}
      <div className="rounded-xl border border-border/80 bg-card/60 p-4.5 space-y-3 transition-all">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="has_retail_sales" className="text-sm font-semibold flex items-center gap-2 cursor-pointer">
              <Store className="h-4 w-4 text-primary" />
              ¿Habilitar Ventas al por Menor (Bar / Fondas / Venta Unitaria)?
            </Label>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activa la consolidación de productos (ej. tragos, comida), división de costo total entre cantidad de unidades y separación de materias primas/insumos vs. venta directa al público.
            </p>
          </div>
          <input 
            type="checkbox" 
            id="has_retail_sales" 
            checked={hasRetailSales}
            onChange={(e) => setHasRetailSales(e.target.checked)}
            className="h-5 w-5 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer shrink-0"
          />
        </div>
        {hasRetailSales && (
          <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 text-xs text-primary font-medium flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span>Sección de retail y consolidación de costos activada para este evento.</span>
          </div>
        )}
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creando...' : 'Crear Evento y Continuar'}
      </Button>
    </form>
  );
}
