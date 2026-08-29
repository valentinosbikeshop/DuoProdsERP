'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function EventForm() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const dateObj = new Date(event_date);
        month = dateObj.getMonth() + 1;
        year = dateObj.getFullYear();
      }

      const { error: insertError } = await supabase.from('events').insert({
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

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? 'Creando...' : 'Crear Evento y Continuar'}
      </Button>
    </form>
  );
}
