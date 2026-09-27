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
import { formatDateCL, calculateFinancials } from '@/lib/utils';
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
  ClipboardList,
  Store,
  Upload
} from 'lucide-react';
import Link from 'next/link';

export default function EventDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [draftItems, setDraftItems] = useState<EventItem[]>([]);
  const [parsedText, setParsedText] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [customQuoteLocation, setCustomQuoteLocation] = useState<string>('');
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
        .order('created_at', { ascending: true });
        
      if (itemsError) throw itemsError;
      
      const allItems = itemsData as EventItem[];
      setItems(allItems.filter((item) => item.approved));
      setDraftItems(allItems.filter((item) => !item.approved));
    } catch (error) {
      console.error('Error fetching event data:', error);
    } finally {
      setLoading(false);
    }
  }, [id, supabase]);

  useEffect(() => {
    fetchEventData();

    // Subscribe to realtime changes on event_items for this event
    const channel = supabase
      .channel(`event_items_changes_${id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_items',
          filter: `event_id=eq.${id}`,
        },
        () => {
          fetchEventData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEventData, id, supabase]);


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
        const newDrafts = data.suggestions.map((s: any) => {
          const tipoDoc = s.tipo_doc_costo || 'factura';
          const rawCosto = s.costo || 0;
          const ganancia = s.ganancia || 0;
          // Se calcula usando el tipo de documento: en factura se desglosa el IVA de la compra, en boleta se recarga al total
          const financials = calculateFinancials(rawCosto, ganancia, tipoDoc);
          return {
            event_id: id,
            servicio: s.servicio,
            detalle: s.detalle,
            tipo_evento: s.tipo_evento || 'AI',
            cantidad: s.cantidad || 1,
            costo: rawCosto,
            ganancia: ganancia,
            valor_neto: financials.valorNeto,
            iva: financials.iva,
            valor_total: financials.valorTotal,
            margen: financials.margen,
            tipo_doc_costo: tipoDoc,
            approved: false,
          };
        });
        
        await supabase.from('event_items').insert(newDrafts);
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
          customQuoteLocation: customQuoteLocation.trim(),
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
        const newDrafts = data.suggestions.map((s: any) => {
          const tipoDoc = s.tipo_doc_costo || 'factura';
          const rawCosto = s.costo || 0;
          const ganancia = s.ganancia || 0;
          const financials = calculateFinancials(rawCosto, ganancia, tipoDoc);
          return {
            event_id: id,
            servicio: s.servicio,
            detalle: s.detalle,
            tipo_evento: s.tipo_evento || 'AI',
            cantidad: s.cantidad || 1,
            costo: rawCosto,
            ganancia: ganancia,
            valor_neto: financials.valorNeto,
            iva: financials.iva,
            valor_total: financials.valorTotal,
            margen: financials.margen,
            tipo_doc_costo: tipoDoc,
            approved: false,
          };
        });
        
        await supabase.from('event_items').insert(newDrafts);
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
            {event.has_retail_sales && (
              <Badge variant="outline" className="border-indigo-300 text-indigo-700 bg-indigo-50 font-medium">
                <Store className="mr-1 h-3 w-3" />
                Venta al por Menor
              </Badge>
            )}
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

      <Tabs defaultValue="info" className="space-y-6 mt-6">
        <TabsList className="inline-flex h-11 items-center justify-center rounded-lg bg-muted/60 p-1 text-muted-foreground w-full md:w-auto overflow-x-auto shadow-sm">
          <TabsTrigger value="info" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Building2 className="h-4 w-4" />
            Información
          </TabsTrigger>
          <TabsTrigger value="draft" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <Sparkles className="h-4 w-4" />
            Borrador de Costos
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm">
            <CheckCircle className="h-4 w-4" />
            Presupuesto Oficial
            {items.length > 0 && (
              <Badge variant="secondary" className="px-1.5 py-0.5 text-[10px] ml-1 bg-primary/10 text-primary border-0">
                {items.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Información */}
        <TabsContent value="info" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-xs glass-card border-border/70">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  Detalles del Evento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
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
                <div className="mt-4 pt-4 border-t border-border/40 bg-muted/30 -mx-6 -mb-6 px-6 py-4 rounded-b-xl">
                  <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary/70" />
                    Descripción:
                  </h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description || 'Sin descripción.'}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs glass-card border-border/70">
              <CardHeader className="pb-4 border-b border-border/40">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Documentos Adjuntos
                </CardTitle>
                <CardDescription className="text-xs">
                  Sube cotizaciones, riders técnicos u otros documentos para mejorar las sugerencias de la IA.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
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
          <Card className="border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card shadow-sm overflow-hidden mb-2">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="font-semibold text-foreground text-sm">Asistente IA de Costos</h3>
                <span className="text-xs text-muted-foreground ml-2 hidden sm:inline-block">Calcula insumos, personal y extrae facturas automáticamente.</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Custom Prompt Input */}
                <div className="md:col-span-8 flex flex-col relative">
                  <div className="relative h-full flex flex-col">
                    <textarea
                      rows={2}
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder={event.has_retail_sales 
                        ? "Escribe un menú, receta o requerimiento (Ej: 50 empanadas, 20L chicha)..." 
                        : "Escribe requerimientos (Ej: Iluminación para 300 personas, 2 pantallas)..."}
                      className="w-full h-full min-h-[76px] rounded-xl border border-input/80 bg-background/90 px-3 py-2 pb-9 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40 custom-scrollbar resize-none font-normal shadow-xs"
                      disabled={customAiLoading || isCompleted}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && customPrompt.trim()) {
                          e.preventDefault();
                          handleGenerateCustomBreakdown();
                        }
                      }}
                    />
                    <div className="absolute bottom-1.5 right-1.5 left-1.5 flex justify-between items-center">
                      {event.has_retail_sales ? (
                        <input
                          type="text"
                          value={customQuoteLocation}
                          onChange={(e) => setCustomQuoteLocation(e.target.value)}
                          placeholder="Lugar cotización (Opcional)"
                          className="w-40 rounded-md border-0 bg-transparent px-1.5 py-1 text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-0"
                          disabled={customAiLoading || isCompleted}
                        />
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60 pl-2 hidden sm:inline">Presiona Enter para enviar</span>
                      )}
                      <Button 
                        onClick={handleGenerateCustomBreakdown} 
                        disabled={customAiLoading || !customPrompt.trim() || isCompleted}
                        size="sm"
                        className="h-6 rounded-md text-[11px] px-2"
                      >
                        {customAiLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
                        Generar
                      </Button>
                    </div>
                  </div>
                </div>

                {/* General Actions */}
                <div className="md:col-span-4 flex flex-col gap-2 justify-center">
                  <Button 
                    variant="outline"
                    onClick={handleGenerateSuggestions} 
                    disabled={aiLoading || isCompleted}
                    size="sm"
                    className="w-full justify-start gap-2 text-xs border-primary/20 hover:bg-primary/5 h-[36px] rounded-xl font-medium"
                  >
                    {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> : <Wand2 className="h-3.5 w-3.5 text-primary" />}
                    Sugerir desde Ficha
                  </Button>
                  
                  <div className="relative w-full">
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.xlsx,.csv"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                      disabled={aiLoading || isCompleted}
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        setAiLoading(true);
                        const formData = new FormData();
                        formData.append('file', file);
                        
                        try {
                          const res = await fetch('/api/parse-file', { method: 'POST', body: formData });
                          if (!res.ok) throw new Error('Error al procesar el archivo');
                          const { text } = await res.json();
                          
                          const aiRes = await fetch('/api/ai/suggest-costs', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              customPrompt: "Extrae de este documento (factura/boleta/cotización) todos los artículos de compra y cantidades para el borrador de costos.",
                              eventDescription: text,
                              eventType: event?.status || '',
                            }),
                          });
                          
                          if (!aiRes.ok) throw new Error('Error al generar desglose');
                          const data = await aiRes.json();
                          
                          if (data.suggestions && data.suggestions.length > 0) {
                            const newDrafts = data.suggestions.map((s: any) => {
                              const tipoDoc = s.tipo_doc_costo || 'factura';
                              const rawCosto = s.costo || 0;
                              const ganancia = s.ganancia || 0;
                              const financials = calculateFinancials(rawCosto, ganancia, tipoDoc);
                              return {
                                event_id: id,
                                servicio: s.servicio,
                                detalle: s.detalle,
                                tipo_evento: s.tipo_evento || 'AI',
                                cantidad: s.cantidad || 1,
                                costo: rawCosto,
                                ganancia: ganancia,
                                valor_neto: financials.valorNeto,
                                iva: financials.iva,
                                valor_total: financials.valorTotal,
                                margen: financials.margen,
                                tipo_doc_costo: tipoDoc,
                                approved: false,
                              };
                            });
                            await supabase.from('event_items').insert(newDrafts);
                            fetchEventData(); // Refresh UI
                          } else {
                            alert('No se detectaron ítems en el documento.');
                          }
                        } catch (err: any) {
                          alert(err.message);
                        } finally {
                          setAiLoading(false);
                          if (e.target) e.target.value = '';
                        }
                      }}
                    />
                    <Button 
                      variant="outline"
                      disabled={aiLoading || isCompleted}
                      size="sm"
                      className="w-full justify-start gap-2 text-xs bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100/50 border-emerald-200 h-[36px] rounded-xl relative pointer-events-none font-medium"
                    >
                      {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" /> : <Upload className="h-3.5 w-3.5 text-emerald-600" />}
                      Subir Factura y Extraer
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
                draftItems={draftItems} 
                eventId={id} 
                onDraftChanged={fetchEventData}
                hasRetailSales={event.has_retail_sales ?? false}
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
                eventId={id}
                hasRetailSales={event.has_retail_sales ?? false}
              />
            </CardContent>
          </Card>
          <FloatingFinancialAdvisor event={event} items={items} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

