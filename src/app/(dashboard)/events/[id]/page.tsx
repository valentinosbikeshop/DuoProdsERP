'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Event, EventItem, AiSuggestion } from '@/types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUpload } from '@/components/events/file-upload';
import { AiSuggestionsGrid } from '@/components/events/ai-suggestions-grid';
import { EventItemsTable } from '@/components/events/event-items-table';
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from '@/lib/constants';
import { Sparkles, FileText, CheckCircle, Loader2, Calendar, MapPin, Building2, Lock, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [parsedText, setParsedText] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchEventData = async () => {
    setLoading(true);
    try {
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      
      if (eventError) throw eventError;
      setEvent(eventData as Event);

      const { data: itemsData, error: itemsError } = await supabase
        .from('event_items')
        .select('*')
        .eq('event_id', id)
        .eq('approved', true);
        
      if (itemsError) throw itemsError;
      setItems(itemsData as EventItem[]);
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  const handleGenerateSuggestions = async () => {
    if (!event) return;
    setAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventDescription: event.description,
          parsedDocuments: parsedText,
          eventType: event.status, // Assuming you might have an eventType field, passing status for now or add if available
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      if (data.suggestions) {
        setSuggestions((prev) => [...prev, ...data.suggestions]);
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFinalizeEvent = async () => {
    if (!event) return;
    
    const confirm = window.confirm('¿Estás seguro de que deseas finalizar este evento? Ya no podrás agregar ni editar ítems a menos que lo vuelvas a reabrir.');
    if (!confirm) return;

    setFinalizing(true);
    try {
      const { error } = await (supabase.from('events') as any)
        .update({ status: 'completed' })
        .eq('id', id);

      if (error) throw error;
      
      setEvent({ ...event, status: 'completed' });
    } catch (error) {
      console.error('Error finalizing event:', error);
    } finally {
      setFinalizing(false);
    }
  };

  const handleReopenEvent = async () => {
    if (!event) return;
    
    const confirm = window.confirm('¿Estás seguro de que deseas reabrir este evento para edición?');
    if (!confirm) return;

    setFinalizing(true);
    try {
      const { error } = await (supabase.from('events') as any)
        .update({ status: 'planning' })
        .eq('id', id);

      if (error) throw error;
      
      setEvent({ ...event, status: 'planning' });
    } catch (error) {
      console.error('Error reopening event:', error);
    } finally {
      setFinalizing(false);
    }
  };

  if (loading && !event) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Evento no encontrado.</p>
        <Link href="/events">
          <Button variant="link" className="mt-4">
            Volver a Eventos
          </Button>
        </Link>
      </div>
    );
  }

  const isCompleted = event.status === 'completed';

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center space-x-2 text-sm text-muted-foreground mb-4">
        <Link href="/events" className="hover:text-primary flex items-center">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Volver a Eventos
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            {event.name}
            {isCompleted && <Lock className="h-5 w-5 text-muted-foreground" />}
          </h2>
          <div className="flex items-center gap-2 mt-2">
            <Badge className={EVENT_STATUS_COLORS[event.status as keyof typeof EVENT_STATUS_COLORS]}>
              {EVENT_STATUS_LABELS[event.status as keyof typeof EVENT_STATUS_LABELS] || event.status}
            </Badge>
            {isCompleted && (
              <Badge variant="outline" className="border-green-600 text-green-600 bg-green-50">
                <CheckCircle className="mr-1 h-3 w-3" />
                Evento Finalizado
              </Badge>
            )}
          </div>
        </div>
        
        {isCompleted ? (
          <div className="flex gap-2">
            <Button onClick={handleReopenEvent} disabled={finalizing} variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50">
              {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowLeft className="mr-2 h-4 w-4" />}
              Reabrir Edición
            </Button>
            <Link href={`/events/${id}/report`}>
              <Button variant="default">
                <FileText className="mr-2 h-4 w-4" />
                Ver Informe
              </Button>
            </Link>
          </div>
        ) : (
          <Button onClick={handleFinalizeEvent} disabled={finalizing || items.length === 0} variant="outline" className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 border-green-200">
            {finalizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
            Finalizar Evento
          </Button>
        )}
      </div>

      <Tabs defaultValue="info" className="space-y-4 mt-6">
        <TabsList>
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="ai-suggestions">Sugerencias IA</TabsTrigger>
          <TabsTrigger value="items">Ítems Aprobados</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Evento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium w-24">Cliente:</span>
                  <span>{event.client_company || 'No especificado'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium w-24">Fecha:</span>
                  <span>{event.event_date ? new Intl.DateTimeFormat('es-CL').format(new Date(event.event_date)) : 'No especificada'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium w-24">Ubicación:</span>
                  <span>{event.location || 'No especificada'}</span>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium text-sm mb-2">Descripción:</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description || 'Sin descripción.'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Documentos Adjuntos</CardTitle>
                <CardDescription>
                  Sube cotizaciones, riders técnicos u otros documentos para mejorar las sugerencias de la IA.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!isCompleted ? (
                  <div className="space-y-4">
                    <FileUpload 
                      onParsed={(text) => setParsedText(prev => prev + '\n' + text)} 
                    />
                    {parsedText && (
                      <div className="mt-4 p-3 bg-muted/30 rounded-md border text-xs max-h-40 overflow-y-auto">
                        <p className="font-semibold mb-1">Texto extraído:</p>
                        <p className="whitespace-pre-wrap">{parsedText}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center p-4 bg-muted/20 rounded-md border">
                    <p className="text-sm text-muted-foreground">El evento está finalizado. No se pueden adjuntar más documentos.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai-suggestions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Sugerencias de IA
              </CardTitle>
              <CardDescription>
                Genera sugerencias de costos y servicios basados en la descripción del evento y los documentos adjuntos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex justify-start">
                <Button 
                  onClick={handleGenerateSuggestions} 
                  disabled={aiLoading || isCompleted}
                  className="gap-2"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {aiLoading ? 'Generando...' : (suggestions.length > 0 ? 'Generar Más Sugerencias con IA' : 'Generar Sugerencias con IA')}
                </Button>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Sugerencias Generadas / Manuales</h3>
                <AiSuggestionsGrid 
                  suggestions={suggestions} 
                  eventId={id} 
                  onItemApproved={fetchEventData} 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="items" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Ítems Aprobados</CardTitle>
              <CardDescription>
                Listado de todos los servicios y costos confirmados para este evento.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EventItemsTable 
                items={items} 
                onItemDeleted={fetchEventData} 
                isCompleted={isCompleted} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
