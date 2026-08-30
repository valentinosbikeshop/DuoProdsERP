'use client';

import { useState, useEffect } from 'react';
import { AiSuggestion } from '@/types';
import { formatCLP, formatPercentage, calculateFinancials, calculateGananciaFromTotal } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Check, X, Loader2, Plus, CheckCheck, Trash2, Sparkles, ClipboardList } from 'lucide-react';

interface AiSuggestionsGridProps {
  suggestions: AiSuggestion[];
  eventId: string;
  onItemApproved: () => void;
}

const emptySuggestion: AiSuggestion = {
  servicio: '',
  detalle: '',
  tipo_evento: 'Manual',
  cantidad: 1,
  costo: 0,
  ganancia: 0,
  valor_neto: 0,
  iva: 0,
  valor_total: 0,
  margen: 0,
  tipo_doc_costo: 'factura',
  sin_ganancia: false,
};

export function AiSuggestionsGrid({
  suggestions: initialSuggestions,
  eventId,
  onItemApproved,
}: AiSuggestionsGridProps) {
  const [editableSuggestions, setEditableSuggestions] = useState<AiSuggestion[]>([]);
  const [manualItem, setManualItem] = useState<AiSuggestion>({ ...emptySuggestion, id: 'manual' });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const supabase = createClient();
  
  // Track how many we've ingested so we only append new ones
  const [ingestedCount, setIngestedCount] = useState(0);

  useEffect(() => {
    if (initialSuggestions.length > ingestedCount) {
      const newItems = initialSuggestions.slice(ingestedCount).map((s, i) => ({ 
        ...s, 
        id: `draft-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}` 
      }));
      setEditableSuggestions(prev => [...prev, ...newItems]);
      setIngestedCount(initialSuggestions.length);
    }
  }, [initialSuggestions, ingestedCount]);

  const handleInputChange = (id: string, field: keyof AiSuggestion, value: any) => {
    const isManual = id === 'manual';
    const targetItem = isManual ? manualItem : editableSuggestions.find(s => s.id === id);
    if (!targetItem) return;

    let newValue = value;
    if (['costo', 'ganancia', 'cantidad', 'valor_total'].includes(field as string)) {
      newValue = parseFloat(value) || 0;
    }

    const updatedItem = { ...targetItem, [field]: newValue };
    
    if (field === 'sin_ganancia' && newValue === true) {
      updatedItem.ganancia = 0;
    }

    // Recalculate financials
    if (field === 'valor_total') {
      const financials = calculateGananciaFromTotal(updatedItem.costo, updatedItem.valor_total);
      updatedItem.ganancia = financials.ganancia;
      updatedItem.valor_neto = financials.valorNeto;
      updatedItem.iva = financials.iva;
      updatedItem.margen = financials.margen;
    } else if (['costo', 'ganancia', 'sin_ganancia'].includes(field as string)) {
      const financials = calculateFinancials(updatedItem.costo, updatedItem.ganancia);
      updatedItem.valor_neto = financials.valorNeto;
      updatedItem.iva = financials.iva;
      updatedItem.valor_total = financials.valorTotal;
      updatedItem.margen = financials.margen;
    }

    if (isManual) {
      setManualItem(updatedItem as AiSuggestion);
    } else {
      setEditableSuggestions((prev) => prev.map((item) => (item.id === id ? (updatedItem as AiSuggestion) : item)));
    }
  };

  // Add manual item into Draft (Borrador) list below
  const handleAddManualToDraft = () => {
    if (!manualItem.servicio.trim()) return;

    const newItem: AiSuggestion = {
      ...manualItem,
      id: `manual-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      servicio: manualItem.servicio.trim(),
      detalle: manualItem.detalle.trim(),
    };

    setEditableSuggestions(prev => [...prev, newItem]);
    setManualItem({ ...emptySuggestion, id: 'manual' });
  };

  // Approve a single draft item and save to event_items (Approved items)
  const handleApprove = async (item: AiSuggestion) => {
    if (!item.servicio) return;
    setLoadingId(item.id || 'unknown');
    
    try {
      const { error } = await supabase.from('event_items').insert({
        event_id: eventId,
        servicio: item.servicio,
        detalle: item.detalle,
        tipo_evento: item.tipo_evento,
        cantidad: item.cantidad,
        costo: item.costo,
        ganancia: item.ganancia,
        valor_neto: item.valor_neto,
        iva: item.iva,
        valor_total: item.valor_total,
        margen: item.margen,
        tipo_doc_costo: item.tipo_doc_costo || 'factura',
        approved: true,
      } as any);

      if (error) throw error;
      
      setEditableSuggestions((prev) => prev.filter((s) => s.id !== item.id));
      onItemApproved();
    } catch (error) {
      console.error('Error approving item:', error);
      alert('Error al aprobar el ítem');
    } finally {
      setLoadingId(null);
    }
  };

  // Approve ALL items in draft list
  const handleApproveAll = async () => {
    if (editableSuggestions.length === 0) return;
    setApprovingAll(true);

    try {
      const itemsToInsert = editableSuggestions.map(item => ({
        event_id: eventId,
        servicio: item.servicio,
        detalle: item.detalle,
        tipo_evento: item.tipo_evento,
        cantidad: item.cantidad,
        costo: item.costo,
        ganancia: item.ganancia,
        valor_neto: item.valor_neto,
        iva: item.iva,
        valor_total: item.valor_total,
        margen: item.margen,
        tipo_doc_costo: item.tipo_doc_costo || 'factura',
        approved: true,
      }));

      const { error } = await supabase.from('event_items').insert(itemsToInsert as any);
      if (error) throw error;

      setEditableSuggestions([]);
      onItemApproved();
    } catch (error) {
      console.error('Error approving all items:', error);
      alert('Error al aprobar todos los ítems del borrador.');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleRemove = (id: string) => {
    setEditableSuggestions((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('¿Deseas vaciar todos los ítems del borrador?')) {
      setEditableSuggestions([]);
    }
  };

  const totals = editableSuggestions.reduce(
    (acc, item) => ({
      costo: acc.costo + (item.costo * item.cantidad),
      ganancia: acc.ganancia + (item.ganancia * item.cantidad),
      valor_neto: acc.valor_neto + (item.valor_neto * item.cantidad),
      iva: acc.iva + (item.iva * item.cantidad),
      valor_total: acc.valor_total + (item.valor_total * item.cantidad),
    }),
    { costo: 0, ganancia: 0, valor_neto: 0, iva: 0, valor_total: 0 }
  );

  return (
    <div className="space-y-4">
      {/* Header & Bulk Actions Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              Borrador de Costos y Servicios
              <Badge variant="secondary" className="font-normal text-xs px-2 py-0.5">
                {editableSuggestions.length} {editableSuggestions.length === 1 ? 'ítem' : 'ítems'}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Añade servicios manualmente o mediante IA. Revisa y aprueba cada ítem para transferirlo al presupuesto oficial.
            </p>
          </div>
        </div>

        {editableSuggestions.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleClearAll}
              className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/80 gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Vaciar Borrador
            </Button>
            <Button
              size="sm"
              onClick={handleApproveAll}
              disabled={approvingAll}
              className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-xs"
            >
              {approvingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Aprobar Todos ({editableSuggestions.length})
            </Button>
          </div>
        )}
      </div>

      {/* Table Container */}
      <div className="border rounded-xl overflow-x-auto shadow-xs bg-card custom-scrollbar">
        <Table className="min-w-[1300px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="min-w-[200px] text-xs font-bold uppercase tracking-wider">Servicio / Insumo</TableHead>
              <TableHead className="min-w-[250px] text-xs font-bold uppercase tracking-wider">Detalle / Especificación</TableHead>
              <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-center">Cant.</TableHead>
              <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider">Costo Unit.</TableHead>
              <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider">Ganancia Unit.</TableHead>
              <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider">V. Neto</TableHead>
              <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider">IVA (19%)</TableHead>
              <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider">V. Total</TableHead>
              <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider">Margen</TableHead>
              <TableHead className="text-right w-[120px] text-xs font-bold uppercase tracking-wider">Subtotal</TableHead>
              <TableHead className="w-[120px] text-center text-xs font-bold uppercase tracking-wider">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Quick Manual Add Row */}
            <TableRow className="bg-primary/5 border-b-2 border-primary/20 hover:bg-primary/10 transition-colors">
              <TableCell className="p-2">
                <Input
                  placeholder="+ Nuevo servicio o gasto..."
                  value={manualItem.servicio}
                  onChange={(e) => handleInputChange('manual', 'servicio', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualItem.servicio.trim()) {
                      e.preventDefault();
                      handleAddManualToDraft();
                    }
                  }}
                  className="h-8 text-sm w-full bg-background/90 font-medium"
                />
              </TableCell>
              <TableCell className="p-2">
                <Input
                  placeholder="Detalle o especificación técnica..."
                  value={manualItem.detalle}
                  onChange={(e) => handleInputChange('manual', 'detalle', e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && manualItem.servicio.trim()) {
                      e.preventDefault();
                      handleAddManualToDraft();
                    }
                  }}
                  className="h-8 text-sm w-full bg-background/90"
                />
              </TableCell>
              <TableCell className="p-2">
                <Input
                  type="number"
                  value={manualItem.cantidad || ''}
                  onChange={(e) => handleInputChange('manual', 'cantidad', e.target.value)}
                  className="h-8 text-sm w-full text-center px-1 bg-background/90"
                  min="1"
                />
              </TableCell>
              <TableCell className="p-2">
                <div className="flex flex-col gap-1 w-full">
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualItem.costo || ''}
                    onChange={(e) => handleInputChange('manual', 'costo', e.target.value)}
                    className="h-8 text-sm w-full px-2 bg-background/90"
                  />
                  <button
                    type="button"
                    onClick={() => handleInputChange('manual', 'tipo_doc_costo', manualItem.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta')}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center w-full transition-colors ${manualItem.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
                  >
                    {manualItem.tipo_doc_costo || 'factura'}
                  </button>
                </div>
              </TableCell>
              <TableCell className="p-2 align-top">
                <div className="flex flex-col gap-1 w-full">
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualItem.ganancia || ''}
                    onChange={(e) => handleInputChange('manual', 'ganancia', e.target.value)}
                    className="h-8 text-sm w-full px-2 bg-background/90"
                    disabled={manualItem.sin_ganancia}
                  />
                  <button
                    type="button"
                    onClick={() => handleInputChange('manual', 'sin_ganancia', !manualItem.sin_ganancia)}
                    className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center w-full transition-colors ${manualItem.sin_ganancia ? 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`}
                  >
                    {manualItem.sin_ganancia ? 'SIN GANANCIA' : 'CON GANANCIA'}
                  </button>
                </div>
              </TableCell>
              <TableCell className="p-2 align-top text-xs font-medium">{formatCLP(manualItem.valor_neto)}</TableCell>
              <TableCell className="p-2 align-top text-xs font-medium">{formatCLP(manualItem.iva)}</TableCell>
              <TableCell className="p-2 align-top font-semibold text-primary">
                <Input
                  type="number"
                  placeholder="0"
                  value={manualItem.valor_total || ''}
                  onChange={(e) => handleInputChange('manual', 'valor_total', e.target.value)}
                  className="h-8 text-sm w-full px-2 bg-background/90 font-semibold"
                  disabled={manualItem.sin_ganancia}
                />
              </TableCell>
              <TableCell className="p-2 align-top text-xs">{formatPercentage(manualItem.margen)}</TableCell>
              <TableCell className="p-2 align-top text-right font-bold text-primary">{formatCLP(manualItem.valor_total * manualItem.cantidad)}</TableCell>
              <TableCell className="p-2 align-top text-center">
                <Button
                  size="sm"
                  className="h-8 w-full gap-1 text-xs shadow-xs"
                  onClick={handleAddManualToDraft}
                  disabled={!manualItem.servicio.trim()}
                  title="Añadir a la lista de borrador"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Añadir</span>
                </Button>
              </TableCell>
            </TableRow>

            {/* Empty State */}
            {editableSuggestions.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-12 text-center text-muted-foreground">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Sparkles className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-medium">El borrador está vacío</p>
                    <p className="text-xs text-muted-foreground max-w-md">
                      Utiliza los botones de IA arriba para generar sugerencias o escribe un ítem en la fila superior para añadirlo al borrador.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}

            {/* Draft Items List */}
            {editableSuggestions.map((item, index) => (
              <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="p-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground font-mono w-4">{index + 1}.</span>
                    <Input
                      value={item.servicio}
                      onChange={(e) => handleInputChange(item.id!, 'servicio', e.target.value)}
                      className="h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all font-medium"
                    />
                  </div>
                </TableCell>
                <TableCell className="p-2">
                  <Input
                    value={item.detalle}
                    onChange={(e) => handleInputChange(item.id!, 'detalle', e.target.value)}
                    className="h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <Input
                    type="number"
                    value={item.cantidad}
                    onChange={(e) => handleInputChange(item.id!, 'cantidad', e.target.value)}
                    className="h-8 text-sm w-full text-center px-1"
                    min="1"
                  />
                </TableCell>
                <TableCell className="p-2">
                  <div className="flex flex-col gap-1 w-full">
                    <Input
                      type="number"
                      value={item.costo}
                      onChange={(e) => handleInputChange(item.id!, 'costo', e.target.value)}
                      className="h-8 text-sm w-full px-2"
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange(item.id!, 'tipo_doc_costo', item.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta')}
                      className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center w-full transition-colors ${item.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
                    >
                      {item.tipo_doc_costo || 'factura'}
                    </button>
                  </div>
                </TableCell>
                <TableCell className="p-2 align-top">
                  <div className="flex flex-col gap-1 w-full">
                    <Input
                      type="number"
                      value={item.ganancia}
                      onChange={(e) => handleInputChange(item.id!, 'ganancia', e.target.value)}
                      className="h-8 text-sm w-full px-2"
                      disabled={item.sin_ganancia}
                    />
                    <button
                      type="button"
                      onClick={() => handleInputChange(item.id!, 'sin_ganancia', !item.sin_ganancia)}
                      className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center w-full transition-colors ${item.sin_ganancia ? 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`}
                    >
                      {item.sin_ganancia ? 'SIN GANANCIA' : 'CON GANANCIA'}
                    </button>
                  </div>
                </TableCell>
                <TableCell className="p-2 align-top text-xs font-medium">{formatCLP(item.valor_neto)}</TableCell>
                <TableCell className="p-2 align-top text-xs font-medium">{formatCLP(item.iva)}</TableCell>
                <TableCell className="p-2 align-top font-semibold">
                  <Input
                    type="number"
                    value={item.valor_total || ''}
                    onChange={(e) => handleInputChange(item.id!, 'valor_total', e.target.value)}
                    className="h-8 text-sm w-full px-2 font-semibold"
                    disabled={item.sin_ganancia}
                  />
                </TableCell>
                <TableCell className="p-2 align-top text-xs">{formatPercentage(item.margen)}</TableCell>
                <TableCell className="p-2 align-top text-right font-bold text-primary">{formatCLP(item.valor_total * item.cantidad)}</TableCell>
                <TableCell className="p-2 align-top text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-green-50 text-green-600 hover:bg-green-100 hover:text-green-700 border-green-200 transition-all shadow-2xs"
                      onClick={() => handleApprove(item)}
                      disabled={loadingId === item.id || approvingAll}
                      title="Aprobar e incorporar a Ítems Aprobados"
                    >
                      {loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 transition-all shadow-2xs"
                      onClick={() => handleRemove(item.id!)}
                      disabled={loadingId === item.id || approvingAll}
                      title="Descartar del borrador"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>

          {editableSuggestions.length > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={3} className="font-bold text-right">Totales en Borrador:</TableCell>
                <TableCell>{formatCLP(totals.costo)}</TableCell>
                <TableCell>{formatCLP(totals.ganancia)}</TableCell>
                <TableCell>{formatCLP(totals.valor_neto)}</TableCell>
                <TableCell>{formatCLP(totals.iva)}</TableCell>
                <TableCell className="font-bold text-foreground">{formatCLP(totals.valor_total)}</TableCell>
                <TableCell colSpan={1}></TableCell>
                <TableCell className="text-right font-bold text-primary text-base">{formatCLP(totals.valor_total)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

