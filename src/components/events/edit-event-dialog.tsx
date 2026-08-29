'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit2, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types';

interface EditEventDialogProps {
  event: Event;
  onUpdate: (updated: Event) => void;
}

export function EditEventDialog({ event, onUpdate }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: event.name || '',
    client_company: event.client_company || '',
    location: event.location || '',
    event_date: event.event_date || '',
    description: event.description || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const supabase = createClient();
    
    // Parse date for year and month
    let month = null;
    let year = null;
    if (formData.event_date) {
      const date = new Date(formData.event_date);
      month = date.getMonth() + 1;
      year = date.getFullYear();
    }

    const { data, error } = await supabase
      .from('events')
      .update({
        ...formData,
        month,
        year,
      })
      .eq('id', event.id)
      .select()
      .single();

    setLoading(false);
    if (!error && data) {
      onUpdate(data as Event);
      setOpen(false);
    } else {
      console.error(error);
      alert('Error al actualizar el evento');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="ml-4 h-8 gap-1">
          <Edit2 className="h-3 w-3" /> Editar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Evento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del Evento *</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="client_company">Cliente / Empresa</Label>
            <Input id="client_company" name="client_company" value={formData.client_company} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Ubicación</Label>
            <Input id="location" name="location" value={formData.location} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event_date">Fecha</Label>
            <Input id="event_date" name="event_date" type="date" value={formData.event_date} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descripción / Notas</Label>
            <textarea 
              id="description" 
              name="description" 
              value={formData.description} 
              onChange={handleChange} 
              rows={3} 
              className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
          <div className="flex justify-end pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="mr-2">Cancelar</Button>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Guardar Cambios
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
