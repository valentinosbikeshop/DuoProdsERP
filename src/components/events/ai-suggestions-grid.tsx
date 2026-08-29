'use client';

import { useState, useEffect } from 'react';
import { AiSuggestion } from '@/types';
import { formatCLP, formatPercentage, calculateFinancials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';
import { Check, X, Loader2, Plus } from 'lucide-react';

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
  const supabase = createClient();
  
  // Track how many we've ingested so we only append new ones
  const [ingestedCount, setIngestedCount] = useState(0);

  useEffect(() => {
    if (initialSuggestions.length > ingestedCount) {
      const newItems = initialSuggestions.slice(ingestedCount).map((s, i) => ({ 
        ...s, 
        id: `temp-${Date.now()}-${i}` 
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
    if (['costo', 'ganancia', 'cantidad'].includes(field as string)) {
      newValue = parseFloat(value) || 0;
    }

    const updatedItem = { ...targetItem, [field]: newValue };
    
    // Si marcamos sin_ganancia, forzamos ganancia a 0
    if (field === 'sin_ganancia' && newValue === true) {
      updatedItem.ganancia = 0;
    }

    if (['costo', 'ganancia', 'sin_ganancia'].includes(field as string)) {
      const financials = calculateFinancials(updatedItem.costo, updatedItem.ganancia);
      Object.assign(updatedItem, financials);
    }

    if (isManual) {
      setManualItem(updatedItem as AiSuggestion);
    } else {
      setEditableSuggestions((prev) => prev.map((item) => (item.id === id ? (updatedItem as AiSuggestion) : item)));
    }
  };

  const handleApprove = async (item: AiSuggestion, isManual = false) => {
    if (!item.servicio) return;
    setLoadingId(item.id || 'manual');
    
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
      
      if (isManual) {
        setManualItem({ ...emptySuggestion, id: 'manual' });
      } else {
        setEditableSuggestions((prev) => prev.filter((s) => s.id !== item.id));
      }
      onItemApproved();
    } catch (error) {
      console.error('Error approving item:', error);
    } finally {
      setLoadingId(null);
    }
  };

  const handleRemove = (id: string) => {
    setEditableSuggestions((prev) => prev.filter((item) => item.id !== id));
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
    <div className="border rounded-md overflow-x-auto pb-4">
      <Table className="min-w-[1300px]">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[200px]">Servicio</TableHead>
            <TableHead className="min-w-[250px]">Detalle</TableHead>
            <TableHead className="w-[80px]">Cant.</TableHead>
            <TableHead className="w-[120px]">Costo</TableHead>
            <TableHead className="w-[120px]">Ganancia</TableHead>
            <TableHead className="w-[100px]">V. Neto</TableHead>
            <TableHead className="w-[100px]">IVA</TableHead>
            <TableHead className="w-[120px]">V. Total</TableHead>
            <TableHead className="w-[80px]">Margen</TableHead>
            <TableHead className="text-right w-[120px]">Subtotal Fila</TableHead>
            <TableHead className="w-[100px] text-center">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Fila de Ingreso Manual */}
          <TableRow className="bg-primary/5">
            <TableCell className="p-2">
              <Input
                placeholder="Nuevo ítem..."
                value={manualItem.servicio}
                onChange={(e) => handleInputChange('manual', 'servicio', e.target.value)}
                className="h-8 text-sm w-full"
              />
            </TableCell>
            <TableCell className="p-2">
              <Input
                placeholder="Detalle..."
                value={manualItem.detalle}
                onChange={(e) => handleInputChange('manual', 'detalle', e.target.value)}
                className="h-8 text-sm w-full"
              />
            </TableCell>
            <TableCell className="p-2">
              <Input
                type="number"
                value={manualItem.cantidad || ''}
                onChange={(e) => handleInputChange('manual', 'cantidad', e.target.value)}
                className="h-8 text-sm w-full text-center px-1"
                min="1"
              />
            </TableCell>
            <TableCell className="p-2">
              <div className="flex flex-col gap-1 w-full">
                <Input
                  type="number"
                  value={manualItem.costo || ''}
                  onChange={(e) => handleInputChange('manual', 'costo', e.target.value)}
                  className="h-8 text-sm w-full px-2"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('manual', 'tipo_doc_costo', manualItem.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta')}
                  className={`text-[10px] px-1 py-0.5 rounded cursor-pointer border font-medium uppercase tracking-wider text-center w-full ${manualItem.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
                >
                  {manualItem.tipo_doc_costo || 'factura'}
                </button>
              </div>
            </TableCell>
            <TableCell className="p-2 align-top">
              <div className="flex flex-col gap-1 w-full">
                <Input
                  type="number"
                  value={manualItem.ganancia || ''}
                  onChange={(e) => handleInputChange('manual', 'ganancia', e.target.value)}
                  className="h-8 text-sm w-full px-2"
                  disabled={manualItem.sin_ganancia}
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('manual', 'sin_ganancia', !manualItem.sin_ganancia)}
                  className={`text-[10px] px-1 py-0.5 rounded cursor-pointer border font-medium uppercase tracking-wider text-center w-full ${manualItem.sin_ganancia ? 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`}
                >
                  {manualItem.sin_ganancia ? 'SIN GANANCIA' : 'CON GANANCIA'}
                </button>
              </div>
            </TableCell>
            <TableCell className="p-2 align-top">{formatCLP(manualItem.valor_neto)}</TableCell>
            <TableCell className="p-2 align-top">{formatCLP(manualItem.iva)}</TableCell>
            <TableCell className="p-2 align-top font-semibold text-primary">{formatCLP(manualItem.valor_total)}</TableCell>
            <TableCell className="p-2 align-top">{formatPercentage(manualItem.margen)}</TableCell>
            <TableCell className="p-2 align-top text-right font-bold text-primary">{formatCLP(manualItem.valor_total * manualItem.cantidad)}</TableCell>
            <TableCell className="p-2 align-top text-center">
              <Button
                size="sm"
                className="h-8 w-full gap-1"
                onClick={() => handleApprove(manualItem, true)}
                disabled={loadingId === 'manual' || !manualItem.servicio}
              >
                {loadingId === 'manual' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Añadir
              </Button>
            </TableCell>
          </TableRow>

          {/* Filas de Sugerencias de IA */}
          {editableSuggestions.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="p-2">
                <Input
                  value={item.servicio}
                  onChange={(e) => handleInputChange(item.id!, 'servicio', e.target.value)}
                  className="h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background"
                />
              </TableCell>
              <TableCell className="p-2">
                <Input
                  value={item.detalle}
                  onChange={(e) => handleInputChange(item.id!, 'detalle', e.target.value)}
                  className="h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background"
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
                    className={`text-[10px] px-1 py-0.5 rounded cursor-pointer border font-medium uppercase tracking-wider text-center w-full ${item.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
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
                    className={`text-[10px] px-1 py-0.5 rounded cursor-pointer border font-medium uppercase tracking-wider text-center w-full ${item.sin_ganancia ? 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`}
                  >
                    {item.sin_ganancia ? 'SIN GANANCIA' : 'CON GANANCIA'}
                  </button>
                </div>
              </TableCell>
              <TableCell className="p-2 align-top">{formatCLP(item.valor_neto)}</TableCell>
              <TableCell className="p-2 align-top">{formatCLP(item.iva)}</TableCell>
              <TableCell className="p-2 align-top font-semibold">{formatCLP(item.valor_total)}</TableCell>
              <TableCell className="p-2 align-top">{formatPercentage(item.margen)}</TableCell>
              <TableCell className="p-2 align-top text-right font-semibold text-primary">{formatCLP(item.valor_total * item.cantidad)}</TableCell>
              <TableCell className="p-2 align-top text-center">
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                    onClick={() => handleApprove(item)}
                    disabled={loadingId === item.id}
                  >
                    {loadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                    onClick={() => handleRemove(item.id!)}
                    disabled={loadingId === item.id}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={3} className="font-bold text-right">Totales Sugeridos:</TableCell>
            <TableCell>{formatCLP(totals.costo)}</TableCell>
            <TableCell>{formatCLP(totals.ganancia)}</TableCell>
            <TableCell>{formatCLP(totals.valor_neto)}</TableCell>
            <TableCell>{formatCLP(totals.iva)}</TableCell>
            <TableCell className="font-bold">{formatCLP(totals.valor_total)}</TableCell>
            <TableCell colSpan={2}></TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
