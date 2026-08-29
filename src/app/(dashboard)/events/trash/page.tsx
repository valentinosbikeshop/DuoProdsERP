'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Trash, RefreshCcw, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Event } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function TrashPage() {
  const supabase = createClient();
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserEmail(user?.email || null);
    });
    fetchTrashedEvents();
  }, [supabase]);

  async function fetchTrashedEvents() {
    setLoading(true);
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });
    
    if (!error && data) {
      setEvents(data as Event[]);
    }
    setLoading(false);
  }

  const handleRestore = async (id: string) => {
    const confirm = window.confirm("¿Estás seguro de que deseas recuperar este evento? Volverá a la sección principal de Eventos.");
    if (!confirm) return;

    try {
      const { error } = await (supabase.from('events') as any)
        .update({ deleted_at: null })
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(ev => ev.id !== id));
    } catch (err) {
      console.error('Error al recuperar:', err);
      alert('Error al recuperar el evento.');
    }
  };

  const handlePermanentDelete = async (id: string) => {
    const confirm = window.prompt('¡ADVERTENCIA! Esta acción no se puede deshacer. Todos los ítems e información del evento se borrarán permanentemente. Escribe "BORRAR" para continuar.');
    if (confirm !== 'BORRAR') {
      if (confirm !== null) alert('Cancelado.');
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(ev => ev.id !== id));
    } catch (err) {
      console.error('Error al eliminar permanentemente:', err);
      alert('Error al eliminar permanentemente el evento.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Link href="/events" className="hover:text-primary flex items-center">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Volver a Eventos
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-red-600 flex items-center gap-2">
            <Trash className="h-8 w-8" /> Papelera de Eventos
          </h1>
          <p className="text-muted-foreground mt-1">Los eventos aquí se eliminarán automáticamente después de 30 días.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {events.map((event) => {
            const deletedDate = new Date(event.deleted_at!);
            const expiryDate = new Date(deletedDate);
            expiryDate.setDate(expiryDate.getDate() + 30);
            const daysLeft = Math.ceil((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

            return (
              <Card key={event.id} className="border-red-200 bg-red-50/30">
                <CardHeader>
                  <CardTitle className="text-xl font-bold line-clamp-1">{event.name}</CardTitle>
                  <CardDescription>
                    {event.client_company || 'Sin empresa'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Se eliminará permanentemente en <strong>{Math.max(0, daysLeft)} días</strong>.</span>
                  </div>
                  
                  <div className="flex gap-2 justify-end mt-4">
                    <Button onClick={() => handleRestore(event.id)} variant="outline" className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                      <RefreshCcw className="h-4 w-4 mr-2" />
                      Recuperar
                    </Button>
                    {currentUserEmail === 'valentinosbikeshop@gmail.com' && (
                      <Button onClick={() => handlePermanentDelete(event.id)} variant="destructive">
                        <Trash className="h-4 w-4 mr-2" />
                        Borrar Definitivamente
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-muted/20 border-dashed">
          <Trash className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-medium">La papelera está vacía</h3>
          <p className="text-muted-foreground mt-2">No tienes eventos eliminados.</p>
        </div>
      )}
    </div>
  );
}
