'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Edit2, 
  Loader2, 
  Building2, 
  Calendar, 
  MapPin, 
  FileText, 
  CalendarDays, 
  Save 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Event } from '@/types';

interface EditEventDialogProps {
  event: Event;
  onUpdate: (updated: Event) => void;
}

export function EditEventDialog({ event, onUpdate }: EditEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: event.name || '',
    client_company: event.client_company || '',
    location: event.location || '',
    event_date: event.event_date || '',
    description: event.description || '',
  });

  useEffect(() => {
    if (open) {
      setFormData({
        name: event.name || '',
        client_company: event.client_company || '',
        location: event.location || '',
        event_date: event.event_date || '',
        description: event.description || '',
      });
      setErrorMsg(null);
    }
  }, [open, event]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setErrorMsg('El nombre del evento es obligatorio.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    const supabase = createClient();
    
    // Parse date for year and month
    let month = null;
    let year = null;
    if (formData.event_date) {
      const date = new Date(formData.event_date);
      month = date.getMonth() + 1;
      year = date.getFullYear();
    }

    try {
      const { data, error } = await (supabase.from('events') as any)
        .update({
          name: formData.name.trim(),
          client_company: formData.client_company.trim() || null,
          location: formData.location.trim() || null,
          event_date: formData.event_date || null,
          description: formData.description.trim() || null,
          month,
          year,
        })
        .eq('id', event.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        onUpdate(data as Event);
        setOpen(false);
      }
    } catch (err: any) {
      console.error('Error al actualizar evento:', err);
      setErrorMsg(err.message || 'Error al actualizar el evento. Intente nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="ml-3 h-8 gap-1.5 rounded-lg border-border/80 bg-background/80 hover:bg-muted/80 text-xs font-medium shadow-xs transition-all hover:border-primary/40" 
        onClick={() => setOpen(true)}
      >
        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Editar</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[inherit] overflow-hidden">
          {/* Header */}
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
                <CalendarDays className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle>Editar Evento</DialogTitle>
                <DialogDescription>
                  Modifica los detalles generales, fechas y notas del evento.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Body with smooth custom scrollbar */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4.5 custom-scrollbar">
            {errorMsg && (
              <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
                {errorMsg}
              </div>
            )}

            {/* Nombre del Evento */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold text-foreground flex items-center gap-1">
                Nombre del Evento <span className="text-destructive">*</span>
              </Label>
              <Input 
                id="name" 
                name="name" 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="Ej. Bingo / Fonda 13 de Septiembre"
                className="rounded-xl border-border/80 focus-visible:ring-primary/20"
                required 
              />
            </div>

            {/* 2-Column Grid: Cliente & Fecha */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="client_company" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Cliente / Empresa
                </Label>
                <Input 
                  id="client_company" 
                  name="client_company" 
                  value={formData.client_company} 
                  onChange={handleChange} 
                  placeholder="Ej. Dúo Producciones"
                  className="rounded-xl border-border/80 focus-visible:ring-primary/20"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event_date" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  Fecha del Evento
                </Label>
                <Input 
                  id="event_date" 
                  name="event_date" 
                  type="date" 
                  value={formData.event_date} 
                  onChange={handleChange}
                  className="rounded-xl border-border/80 focus-visible:ring-primary/20"
                />
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-1.5">
              <Label htmlFor="location" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                Ubicación
              </Label>
              <Input 
                id="location" 
                name="location" 
                value={formData.location} 
                onChange={handleChange} 
                placeholder="Ej. Rancagua norte, sede vecinal"
                className="rounded-xl border-border/80 focus-visible:ring-primary/20"
              />
            </div>

            {/* Descripción / Notas */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="description" className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  Descripción / Notas
                </Label>
                <span className="text-[11px] text-muted-foreground">Opcional</span>
              </div>
              <textarea 
                id="description" 
                name="description" 
                value={formData.description} 
                onChange={handleChange} 
                rows={4} 
                placeholder="Describe detalles logísticos, cronograma, requerimientos u observaciones..."
                className="flex min-h-[95px] w-full rounded-xl border border-input bg-background/50 px-3.5 py-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all custom-scrollbar resize-y"
              />
              <p className="text-[11px] text-muted-foreground">
                Tip: Esta información sirve como referencia para el equipo y el informe final.
              </p>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              disabled={loading}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={loading}
              className="rounded-xl gap-1.5 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Guardar Cambios</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}

