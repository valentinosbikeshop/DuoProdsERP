'use client';

import { useEffect, useState, useCallback } from 'react';
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
import { FloatingFinancialAdvisor } from '@/components/events/floating-financial-advisor';
import { EditEventDialog } from '@/components/events/edit-event-dialog';
import { EVENT_STATUS_LABELS, EVENT_STATUS_COLORS } from '@/lib/constants';
import { formatDateCL } from '@/lib/utils';
import { 
  Sparkles, 
  FileText, 
  CheckCircle, 
  Loader2, 
  Calendar, 
  MapPin, 
  Building2, 
  Lock, 
  ArrowLeft,
  Wand2,
  FileSpreadsheet,
  ClipboardList
} from 'lucide-react';
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
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [customAiLoading, setCustomAiLoading] = useState(false);
  const [finalizing, setFinalizing] = useState(false);

  const fetchEventData = useCallback(async () => {
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
  }, [id, supabase]);

  useEffect(() => {
    fetchEventData();
  }, [fetchEventData]);


  // Generate suggestions based on general event description and attached documents
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
          eventType: event.status,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al generar sugerencias (Error HTTP ' + response.status + ')');
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions((prev) => [...prev, ...data.suggestions]);
      }
    } catch (error: any) {
      console.error('Error generating suggestions:', error);
      alert('Error de IA: ' + error.message);
    } finally {
      setAiLoading(false);
    }
  };

  // Generate breakdown from custom free-text prompt
  const handleGenerateCustomBreakdown = async () => {
    if (!customPrompt.trim()) return;
    setCustomAiLoading(true);
    try {
      const response = await fetch('/api/ai/suggest-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customPrompt: customPrompt.trim(),
          eventDescription: event?.description || '',
          eventType: event?.status || '',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Error al generar desglose con IA (Error HTTP ' + response.status + ')');
      }

      const data = await response.json();
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions((prev) => [...prev, ...data.suggestions]);
        setCustomPrompt(''); // Clear prompt after adding to draft
      }
    } catch (error: any) {
      console.error('Error generating custom breakdown:', error);
      alert('Error de IA: ' + error.message);
    } finally {
      setCustomAiLoading(false);
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
            {!isCompleted && <EditEventDialog event={event} onUpdate={setEvent} />}
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
        <TabsList className="flex flex-wrap md:inline-flex w-full md:w-auto h-auto min-h-12 gap-1.5 justify-start md:justify-center p-1.5">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-1.5">
            Borrador de Costos
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-1.5">
            Ítems Aprobados
            {items.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4 ml-1">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Información */}
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
                  <span>{event.event_date ? formatDateCL(event.event_date) : 'No especificada'}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium w-24">Ubicación:</span>
                  <span>{event.location || 'No especificada'}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-border/40">
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

        {/* Tab 2: Borrador de Costos (antes Sugerencias IA) */}
        <TabsContent value="draft" className="space-y-6">
          {/* Card de Generación con IA */}
          <Card className="glass-card border-primary/25 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                  <Wand2 className="h-4 w-4" />
                </div>
                <div>
                  <CardTitle className="text-lg font-bold">Generadores Inteligentes de Costos</CardTitle>
                  <CardDescription className="text-xs">
                    Calcula y desglosa automáticamente insumos, gastronomía, personal y servicios mediante Inteligencia Artificial.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                {/* Generador 1: Desglose de Requerimiento Específico (Prompt Libre) */}
                <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs hover:border-primary/40 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span>Desglose Específico con IA (Requerimiento Puntual)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Escribe un pedido o menú para que la IA calcule automáticamente los ingredientes, insumos, cantidades y costos:
                    </p>
                    <textarea
                      rows={2}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Ej: 50 empanadas de pino sin aceituna, 30 empanadas napolitanas, 20 litros de chicha y 2 parrilleros por 5 horas..."
                      className="w-full rounded-xl border border-input/80 bg-background/80 px-3.5 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 custom-scrollbar resize-none font-normal shadow-2xs"
                      disabled={customAiLoading || isCompleted}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                          e.preventDefault();
                          handleGenerateCustomBreakdown();
                        }
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                      Tip: Presiona Enter para enviar
                    </span>
                    <Button 
                      onClick={handleGenerateCustomBreakdown} 
                      disabled={customAiLoading || !customPrompt.trim() || isCompleted}
                      size="sm"
                      className="gap-1.5 ml-auto shadow-xs font-medium rounded-xl"
                    >
                      {customAiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {customAiLoading ? 'Desglosando con IA...' : 'Desglosar y Añadir al Borrador'}
                    </Button>
                  </div>
                </div>

                {/* Generador 2: Sugerencias Generales del Evento y Documentos */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border/70 bg-card/70 backdrop-blur-md flex flex-col justify-between space-y-3 shadow-xs hover:border-primary/40 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                      <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                      <span>Sugerir según Ficha y Adjuntos</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Analiza la descripción del evento y los documentos técnicos/cotizaciones subidos para sugerir el montaje global.
                    </p>
                  </div>
                  <div className="pt-2 border-t border-border/40">
                    <Button 
                      variant="outline"
                      onClick={handleGenerateSuggestions} 
                      disabled={aiLoading || isCompleted}
                      size="sm"
                      className="w-full gap-1.5 text-xs border-primary/30 hover:bg-primary/10 font-medium rounded-xl"
                    >
                      {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5 text-primary" />}
                      {aiLoading ? 'Generando...' : 'Generar Sugerencias Generales'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Grilla / Tabla de Borrador */}
          <Card className="shadow-xs glass-card border-border/70">
            <CardContent className="p-4 sm:p-6">
              <AiSuggestionsGrid 
                suggestions={suggestions} 
                eventId={id} 
                onItemApproved={fetchEventData} 
              />
            </CardContent>
          </Card>
        </TabsContent>


        {/* Tab 3: Ítems Aprobados */}
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
          <FloatingFinancialAdvisor event={event} items={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

