'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { EventCard } from '@/components/events/event-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { Event } from '@/types';

export default function EventsPage() {
  const supabase = createClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    async function fetchEvents() {
      setLoading(true);
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .is('deleted_at', null)
        .order('event_date', { ascending: true });
      
      if (!error && data) {
        setEvents(data as Event[]);
      }
      setLoading(false);
    }
    
    fetchEvents();
  }, [supabase]);

  const handleDeleteToTrash = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Doble confirmación explícita
    const firstConfirm = window.confirm("¿Estás seguro de que deseas mover este evento a la papelera?");
    if (!firstConfirm) return;
    
    const doubleConfirm = window.prompt('Para confirmar, escribe la palabra "ELIMINAR"');
    if (doubleConfirm !== 'ELIMINAR') {
      if (doubleConfirm !== null) alert('Cancelado. No se escribió "ELIMINAR" correctamente.');
      return;
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      setEvents(events.filter(ev => ev.id !== id));
    } catch (err) {
      console.error('Error al enviar a papelera:', err);
      alert('Hubo un error al mover el evento a la papelera.');
    }
  };

  const filteredEvents = events.filter((event) => {
    const matchesSearch = 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (event.client_company && event.client_company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Eventos</h1>
          <p className="text-muted-foreground mt-1">Gestión de eventos y planificación con IA</p>
        </div>
        <div className="flex gap-2">
          <Link href="/events/trash">
            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50">
              <Trash2 className="mr-2 h-4 w-4" /> Papelera
            </Button>
          </Link>
          <Link href="/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Nuevo Evento
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre o empresa..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select 
          value={statusFilter} 
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'planning', label: 'En Planificación' },
            { value: 'approved', label: 'Aprobado' },
            { value: 'completed', label: 'Completado' }
          ]}
        />
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : filteredEvents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} onDelete={handleDeleteToTrash} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 border rounded-lg bg-muted/20">
          <h3 className="text-lg font-medium">No se encontraron eventos</h3>
          <p className="text-muted-foreground mt-2">
            {events.length === 0 
              ? "No hay eventos registrados. Crea tu primer evento." 
              : "No hay eventos que coincidan con los filtros actuales."}
          </p>
        </div>
      )}
    </div>
  );
}
