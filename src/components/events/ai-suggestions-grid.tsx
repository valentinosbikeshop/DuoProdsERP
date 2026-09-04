'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EventItem, AiSuggestion } from '@/types';
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
import { Check, X, Loader2, Plus, CheckCheck, Trash2, Sparkles, ClipboardList, ChevronDown, ChevronRight, Combine } from 'lucide-react';

interface AiSuggestionsGridProps {
  draftItems?: EventItem[];
  eventId: string;
  onDraftChanged?: () => void;
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
  iva_incluido: true,
  costo_desglosado: false,
};

export function AiSuggestionsGrid({
  draftItems = [],
  eventId,
  onDraftChanged,
}: AiSuggestionsGridProps) {
  const [editableSuggestions, setEditableSuggestions] = useState<EventItem[]>(draftItems);
  const [manualItem, setManualItem] = useState<AiSuggestion>({ ...emptySuggestion, id: 'manual' });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedParents, setExpandedParents] = useState<string[]>([]);
  const supabase = createClient();
  
  useEffect(() => {
    setEditableSuggestions(draftItems.map(item => ({
      ...item,
      iva_incluido: (item as any).iva_incluido !== undefined ? (item as any).iva_incluido : (item.tipo_doc_costo || 'factura') === 'factura',
      costo_desglosado: true,
    })));
  }, [draftItems]);

  const updateSupabase = async (updatedItem: EventItem) => {
    if (!updatedItem.id) return;
    try {
      await (supabase.from('event_items') as any).update({
        servicio: updatedItem.servicio,
        detalle: updatedItem.detalle,
        cantidad: updatedItem.cantidad,
        costo: updatedItem.costo,
        ganancia: updatedItem.ganancia,
        valor_neto: updatedItem.valor_neto,
        iva: updatedItem.iva,
        valor_total: updatedItem.valor_total,
        margen: updatedItem.margen,
        tipo_doc_costo: updatedItem.tipo_doc_costo,
        parent_id: updatedItem.parent_id,
      }).eq('id', updatedItem.id);
    } catch (e) {
      console.error("Error updating item", e);
    }
  };

  const handleInputChange = (id: string, field: string, value: any, saveImmediately: boolean = false) => {
    const isManual = id === 'manual';
    const targetItem = isManual ? manualItem : editableSuggestions.find(s => s.id === id);
    if (!targetItem) return;

    let newValue = value;
    if (['costo', 'ganancia', 'cantidad', 'valor_total'].includes(field)) {
      newValue = parseFloat(value) || 0;
    }

    const updatedItem = { ...targetItem, [field]: newValue } as any;
    
    if (field === 'sin_ganancia' && newValue === true) {
      updatedItem.ganancia = 0;
    }

    if (field === 'tipo_doc_costo') {
      const isSwitchingToFactura = value === 'factura';
      if (isSwitchingToFactura) {
        // Al pasar a factura, automáticamente se aplica la opción de IVA incluido (desglose neto = costo / 1.19)
        updatedItem.iva_incluido = true;
        updatedItem.costo_desglosado = true;
        if (updatedItem.costo > 0) {
          updatedItem.costo = Math.round(updatedItem.costo / 1.19);
        }
      } else {
        // Al pasar a boleta, no hay crédito fiscal de IVA, se desactiva IVA incluido y vuelve a costo bruto
        const wasIvaIncluido = (targetItem as any).iva_incluido !== false;
        updatedItem.iva_incluido = false;
        updatedItem.costo_desglosado = false;
        if (wasIvaIncluido && updatedItem.costo > 0) {
          updatedItem.costo = Math.round(updatedItem.costo * 1.19);
        }
      }
    } else if (field === 'costo') {
      updatedItem.costo_desglosado = false;
    }

    // Recalculate financials
    if (field === 'valor_total') {
      const financials = calculateGananciaFromTotal(updatedItem.costo, updatedItem.valor_total);
      updatedItem.ganancia = financials.ganancia;
      updatedItem.valor_neto = financials.valorNeto;
      updatedItem.iva = financials.iva;
      updatedItem.margen = financials.margen;
    } else if (['costo', 'ganancia', 'sin_ganancia', 'tipo_doc_costo'].includes(field)) {
      const financials = calculateFinancials(updatedItem.costo, updatedItem.ganancia);
      updatedItem.valor_neto = financials.valorNeto;
      updatedItem.iva = financials.iva;
      updatedItem.valor_total = financials.valorTotal;
      updatedItem.margen = financials.margen;
    }

    if (isManual) {
      setManualItem(updatedItem as AiSuggestion);
    } else {
      let newSuggestions = editableSuggestions.map((item) => (item.id === id ? updatedItem : item));
      
      // If a child is updated, recalculate parent's cost
      if (updatedItem.parent_id && ['costo', 'cantidad'].includes(field)) {
        const siblingsAndSelf = newSuggestions.filter(s => s.parent_id === updatedItem.parent_id);
        const newParentCost = siblingsAndSelf.reduce((sum, s) => sum + (s.costo * s.cantidad), 0);
        
        newSuggestions = newSuggestions.map(item => {
          if (item.id === updatedItem.parent_id) {
            const parentFinancials = calculateFinancials(newParentCost, item.ganancia);
            const newParent = {
              ...item,
              costo: newParentCost,
              valor_neto: parentFinancials.valorNeto,
              iva: parentFinancials.iva,
              valor_total: parentFinancials.valorTotal,
              margen: parentFinancials.margen
            };
            if (saveImmediately) updateSupabase(newParent);
            return newParent;
          }
          return item;
        });
      }

      setEditableSuggestions(newSuggestions);
      if (saveImmediately) {
        updateSupabase(updatedItem);
      }
    }
  };

  const toggleIvaIncluido = (id: string) => {
    const isManual = id === 'manual';
    const targetItem = isManual ? manualItem : editableSuggestions.find(s => s.id === id);
    if (!targetItem) return;

    const currentIvaIncluido = (targetItem as any).iva_incluido !== false;
    const isDesglosado = Boolean((targetItem as any).costo_desglosado);
    
    let newIvaIncluido = !currentIvaIncluido;
    let newCosto = targetItem.costo;
    let newDesglosado = false;

    if (targetItem.costo > 0) {
      if (currentIvaIncluido && !isDesglosado) {
        // El usuario escribió un costo bruto nuevo y presiona IVA INCL. para desglosarlo
        newCosto = Math.round(targetItem.costo / 1.19);
        newIvaIncluido = true;
        newDesglosado = true;
      } else if (newIvaIncluido) {
        // Se activa IVA incluido -> desglosar dividiendo por 1.19
        newCosto = Math.round(targetItem.costo / 1.19);
        newDesglosado = true;
      } else {
        // Se desactiva IVA incluido -> revertir multiplicando por 1.19
        newCosto = Math.round(targetItem.costo * 1.19);
        newDesglosado = false;
      }
    }

    const financials = calculateFinancials(newCosto, targetItem.ganancia);
    const updatedItem = {
      ...targetItem,
      costo: newCosto,
      valor_neto: financials.valorNeto,
      iva: financials.iva,
      valor_total: financials.valorTotal,
      margen: financials.margen,
      iva_incluido: newIvaIncluido,
      costo_desglosado: newDesglosado,
    } as any;

    if (isManual) {
      setManualItem(updatedItem as AiSuggestion);
    } else {
      setEditableSuggestions(prev => prev.map(item => item.id === id ? updatedItem : item));
      updateSupabase(updatedItem);
      if (onDraftChanged) onDraftChanged();
    }
  };

  const handleBlur = (id: string) => {
    if (id === 'manual') return;
    const item = editableSuggestions.find(s => s.id === id);
    if (item) {
      updateSupabase(item);
      if (item.parent_id) {
         const parent = editableSuggestions.find(s => s.id === item.parent_id);
         if (parent) updateSupabase(parent);
      }
    }
  };

  const handleAddManualToDraft = async () => {
    if (!manualItem.servicio.trim()) return;

    const isFactura = (manualItem.tipo_doc_costo || 'factura') === 'factura';
    const isIvaIncluido = (manualItem as any).iva_incluido !== false;
    const isDesglosado = Boolean((manualItem as any).costo_desglosado);

    // Con factura y opción de IVA incluido activa, se desglosa automáticamente si aún no se había desglosado
    let finalCosto = manualItem.costo;
    if (isFactura && isIvaIncluido && manualItem.costo > 0 && !isDesglosado) {
      finalCosto = Math.round(manualItem.costo / 1.19);
    }
    const financials = calculateFinancials(finalCosto, manualItem.ganancia);

    const newItem = {
      event_id: eventId,
      servicio: manualItem.servicio.trim(),
      detalle: manualItem.detalle.trim(),
      tipo_evento: manualItem.tipo_evento,
      cantidad: manualItem.cantidad,
      costo: finalCosto,
      ganancia: manualItem.ganancia,
      valor_neto: financials.valorNeto,
      iva: financials.iva,
      valor_total: financials.valorTotal,
      margen: financials.margen,
      tipo_doc_costo: manualItem.tipo_doc_costo || 'factura',
      approved: false,
    };

    setManualItem({ ...emptySuggestion, id: 'manual' });
    
    try {
      await (supabase.from('event_items') as any).insert(newItem);
      if (onDraftChanged) onDraftChanged();
    } catch (e) {
      console.error(e);
      alert('Error al agregar el ítem manual.');
    }
  };

  const handleApprove = async (item: EventItem) => {
    if (!item.servicio) return;
    setLoadingId(item.id || 'unknown');
    
    try {
      await updateSupabase(item); 
      // If it's a parent, approve children too
      const childrenIds = editableSuggestions.filter(s => s.parent_id === item.id).map(s => s.id);
      const idsToApprove = [item.id, ...childrenIds];
      
      const { error } = await (supabase.from('event_items') as any).update({ approved: true }).in('id', idsToApprove);
      if (error) throw error;
      setEditableSuggestions(prev => prev.filter(s => !idsToApprove.includes(s.id!)));
      if (onDraftChanged) onDraftChanged();
    } catch (error) {
      console.error('Error approving item:', error);
      alert('Error al aprobar el ítem');
    } finally {
      setLoadingId(null);
    }
  };

  const handleApproveAll = async () => {
    if (editableSuggestions.length === 0) return;
    setApprovingAll(true);

    try {
      for (const item of editableSuggestions) {
        await updateSupabase(item);
      }
      
      const ids = editableSuggestions.map(i => i.id);
      const { error } = await (supabase.from('event_items') as any).update({ approved: true }).in('id', ids);
      if (error) throw error;
      setEditableSuggestions([]);
      if (onDraftChanged) onDraftChanged();
    } catch (error) {
      console.error('Error approving all items:', error);
      alert('Error al aprobar todos los ítems del borrador.');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const childrenIds = editableSuggestions.filter(s => s.parent_id === id).map(s => s.id);
      const idsToRemove = [id, ...childrenIds];
      await (supabase.from('event_items') as any).delete().in('id', idsToRemove);
      setSelectedIds(prev => prev.filter(selId => !idsToRemove.includes(selId)));
      setEditableSuggestions(prev => prev.filter(item => !idsToRemove.includes(item.id!)));
      if (onDraftChanged) onDraftChanged();
    } catch (e) {
      console.error(e);
      alert('Error al rechazar el ítem.');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm('¿Deseas vaciar todos los ítems del borrador?')) {
      try {
        const ids = editableSuggestions.map(i => i.id);
        await (supabase.from('event_items') as any).delete().in('id', ids);
        setSelectedIds([]);
        setEditableSuggestions([]);
        if (onDraftChanged) onDraftChanged();
      } catch (e) {
        console.error(e);
        alert('Error al vaciar los ítems.');
      }
    }
  };

  const handleConsolidate = async () => {
    if (selectedIds.length < 2) return;
    
    const name = window.prompt("Ingresa el nombre del producto consolidado (Ej: Piscolas (100 un)):");
    if (!name || !name.trim()) return;

    const selectedItems = editableSuggestions.filter(s => selectedIds.includes(s.id!));
    const totalCost = selectedItems.reduce((acc, item) => acc + (item.costo * item.cantidad), 0);
    const financials = calculateFinancials(totalCost, 0);

    const parentItem = {
      event_id: eventId,
      servicio: name.trim(),
      detalle: 'Consolidado',
      tipo_evento: 'Consolidado',
      cantidad: 1,
      costo: totalCost,
      ganancia: 0,
      valor_neto: financials.valorNeto,
      iva: financials.iva,
      valor_total: financials.valorTotal,
      margen: financials.margen,
      tipo_doc_costo: 'factura',
      approved: false,
      parent_id: null
    };

    try {
      // 1. Insert parent
      const { data: insertedParent, error: insertError } = await (supabase.from('event_items') as any)
        .insert(parentItem)
        .select()
        .single();
        
      if (insertError || !insertedParent) throw insertError || new Error("Failed to insert parent");

      // 2. Update children to set parent_id, and reset their ganancia to 0 to prevent double margin if we want
      for (const child of selectedItems) {
        const childFinancials = calculateFinancials(child.costo, 0); 
        await (supabase.from('event_items') as any).update({ 
          parent_id: insertedParent.id,
          ganancia: 0,
          valor_neto: childFinancials.valorNeto,
          iva: childFinancials.iva,
          valor_total: childFinancials.valorTotal,
          margen: childFinancials.margen
        }).eq('id', child.id);
      }
      
      setSelectedIds([]);
      setExpandedParents(prev => [...prev, insertedParent.id]);
      if (onDraftChanged) onDraftChanged();
    } catch (e: any) {
      console.error("Error consolidating items", e);
      if (e?.message?.includes("parent_id") || e?.code === "PGRST204") {
        alert("Error en la Base de Datos: La columna 'parent_id' no existe en Supabase. Debes ejecutar el script 'add_parent_id.sql' en el SQL Editor de Supabase.");
      } else {
        alert(`Hubo un error al consolidar los ítems: ${e?.message || "Error desconocido"}`);
      }
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleExpand = (id: string) => {
    setExpandedParents(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const topLevelItems = editableSuggestions.filter(s => !s.parent_id);
  
  // Calculate totals only from top level items to prevent double counting
  const totals = topLevelItems.reduce(
    (acc, item) => ({
      costo: acc.costo + (item.costo * item.cantidad),
      ganancia: acc.ganancia + (item.ganancia * item.cantidad),
      valor_neto: acc.valor_neto + (item.valor_neto * item.cantidad),
      iva: acc.iva + (item.iva * item.cantidad),
      valor_total: acc.valor_total + (item.valor_total * item.cantidad),
    }),
    { costo: 0, ganancia: 0, valor_neto: 0, iva: 0, valor_total: 0 }
  );

  const renderRow = (item: EventItem, index: number, isChild: boolean = false) => {
    const isSelected = selectedIds.includes(item.id!);
    const hasChildren = editableSuggestions.some(s => s.parent_id === item.id);
    const isExpanded = expandedParents.includes(item.id!);

    return (
      <TableRow key={item.id} className={`hover:bg-muted/30 transition-colors ${isChild ? 'bg-muted/10 border-l-4 border-l-primary/30' : ''}`}>
        {!isChild ? (
          <TableCell className="p-2 text-center w-[40px]">
             <input 
               type="checkbox" 
               checked={isSelected} 
               onChange={() => toggleSelect(item.id!)}
               className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
             />
          </TableCell>
        ) : (
          <TableCell className="w-[40px]"></TableCell>
        )}
        
        <TableCell className="p-2">
          <div className="flex items-center gap-2">
            {!isChild && hasChildren && (
              <button onClick={() => toggleExpand(item.id!)} className="p-0.5 hover:bg-muted rounded text-muted-foreground flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {!hasChildren && !isChild && <span className="w-5 flex-shrink-0" />}
            {isChild && <div className="w-4 h-px bg-border ml-2 mr-1 flex-shrink-0"></div>}
            
            <Input
              value={item.servicio}
              onChange={(e) => handleInputChange(item.id!, 'servicio', e.target.value)}
              onBlur={() => handleBlur(item.id!)}
              className={`h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all ${!isChild ? 'font-semibold' : 'font-medium text-muted-foreground'}`}
              readOnly={hasChildren && !isExpanded} 
            />
          </div>
        </TableCell>
        <TableCell className="p-2">
          <Input
            value={item.detalle || ''}
            onChange={(e) => handleInputChange(item.id!, 'detalle', e.target.value)}
            onBlur={() => handleBlur(item.id!)}
            className="h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all"
          />
        </TableCell>
        <TableCell className="p-2">
          <Input
            type="number"
            value={item.cantidad}
            onChange={(e) => handleInputChange(item.id!, 'cantidad', e.target.value)}
            onBlur={() => handleBlur(item.id!)}
            className="h-8 text-sm w-full text-center px-1"
            min="1"
            disabled={hasChildren} 
          />
        </TableCell>
        <TableCell className="p-2">
          <div className="flex flex-col gap-1 w-full">
            <Input
              type="number"
              value={item.costo}
              onChange={(e) => handleInputChange(item.id!, 'costo', e.target.value)}
              onBlur={() => handleBlur(item.id!)}
              className="h-8 text-sm w-full px-2"
              disabled={hasChildren} 
            />
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => handleInputChange(item.id!, 'tipo_doc_costo', item.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta', true)}
                className={`text-[9px] px-1 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center transition-colors ${item.tipo_doc_costo === 'boleta' ? 'w-full bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'flex-1 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
              >
                {item.tipo_doc_costo || 'factura'}
              </button>
              {(item.tipo_doc_costo || 'factura') === 'factura' && (
                <button
                  type="button"
                  onClick={() => toggleIvaIncluido(item.id!)}
                  className={`flex-1 text-[9px] px-1 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center transition-colors ${
                    (item as any).iva_incluido !== false
                      ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 font-bold'
                      : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                  }`}
                  title={(item as any).iva_incluido !== false ? "IVA incluido aplicado (desglosado). Clic para cambiar a costo neto (+ IVA)." : "Costo neto sin IVA (+ IVA). Clic para aplicar IVA incluido (desglosar)."}
                >
                  {(item as any).iva_incluido !== false ? 'IVA INCL.' : '+ IVA'}
                </button>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="p-2 align-top">
          <div className="flex flex-col gap-1 w-full">
            <Input
              type="number"
              value={item.ganancia}
              onChange={(e) => handleInputChange(item.id!, 'ganancia', e.target.value)}
              onBlur={() => handleBlur(item.id!)}
              className="h-8 text-sm w-full px-2"
              disabled={item.ganancia === 0 && item.valor_total > 0} 
            />
            <button
              type="button"
              onClick={() => handleInputChange(item.id!, 'sin_ganancia', item.ganancia !== 0, true)}
              className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center w-full transition-colors ${(item.ganancia === 0 && item.costo > 0) ? 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200' : 'bg-green-100 text-green-700 border-green-200 hover:bg-green-200'}`}
            >
              {(item.ganancia === 0 && item.costo > 0) ? 'SIN GANANCIA' : 'CON GANANCIA'}
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
            onBlur={() => handleBlur(item.id!)}
            className="h-8 text-sm w-full px-2 font-semibold"
          />
        </TableCell>
        <TableCell className="p-2 align-top text-xs">{formatPercentage(item.margen)}</TableCell>
        <TableCell className="p-2 align-top text-right font-bold text-primary">{formatCLP(item.valor_total * item.cantidad)}</TableCell>
        <TableCell className="p-2 align-top text-center">
          <div className="flex items-center justify-center gap-1.5">
            {!isChild && (
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
            )}
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 border-red-200 transition-all shadow-2xs"
              onClick={() => handleRemove(item.id!)}
              disabled={loadingId === item.id || approvingAll}
              title={isChild ? "Eliminar insumo" : "Descartar del borrador"}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

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
                {topLevelItems.length} {topLevelItems.length === 1 ? 'ítem principal' : 'ítems principales'}
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground">
              Añade servicios manualmente o mediante IA. Revisa y aprueba cada ítem para transferirlo al presupuesto oficial.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length >= 2 && (
            <Button
              size="sm"
              onClick={handleConsolidate}
              className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs animate-in fade-in zoom-in"
            >
              <Combine className="h-3.5 w-3.5" />
              Consolidar {selectedIds.length} ítems
            </Button>
          )}

          {editableSuggestions.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                className="h-8 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 border-border/80 gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Vaciar
              </Button>
              <Button
                size="sm"
                onClick={handleApproveAll}
                disabled={approvingAll}
                className="h-8 text-xs gap-1.5 bg-green-600 hover:bg-green-700 text-white shadow-xs"
              >
                {approvingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
                Aprobar Todos ({topLevelItems.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="border rounded-xl overflow-x-auto shadow-xs bg-card custom-scrollbar">
        <Table className="min-w-[1350px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="min-w-[200px] text-xs font-bold uppercase tracking-wider">Servicio / Insumo</TableHead>
              <TableHead className="min-w-[250px] text-xs font-bold uppercase tracking-wider">Detalle / Especificación</TableHead>
              <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-center">Cant.</TableHead>
              <TableHead className="w-[140px] text-xs font-bold uppercase tracking-wider">Costo Unit.</TableHead>
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
              <TableCell className="w-[40px]"></TableCell>
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
                  value={manualItem.detalle || ''}
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
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleInputChange('manual', 'tipo_doc_costo', manualItem.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta')}
                      className={`text-[9px] px-1 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center transition-colors ${manualItem.tipo_doc_costo === 'boleta' ? 'w-full bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-200' : 'flex-1 bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200'}`}
                    >
                      {manualItem.tipo_doc_costo || 'factura'}
                    </button>
                    {(manualItem.tipo_doc_costo || 'factura') === 'factura' && (
                      <button
                        type="button"
                        onClick={() => toggleIvaIncluido('manual')}
                        className={`flex-1 text-[9px] px-1 py-0.5 rounded cursor-pointer border font-semibold uppercase tracking-wider text-center transition-colors ${
                          (manualItem as any).iva_incluido !== false
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-300 hover:bg-emerald-200 font-bold'
                            : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                        }`}
                        title={(manualItem as any).iva_incluido !== false ? "IVA incluido aplicado (desglosado). Clic para cambiar a costo neto (+ IVA)." : "Costo neto sin IVA (+ IVA). Clic para aplicar IVA incluido (desglosar)."}
                      >
                        {(manualItem as any).iva_incluido !== false ? 'IVA INCL.' : '+ IVA'}
                      </button>
                    )}
                  </div>
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
                <TableCell colSpan={12} className="py-12 text-center text-muted-foreground">
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

            {/* Draft Items List (Tree Rendering) */}
            {topLevelItems.map((item, index) => {
              const children = editableSuggestions.filter(s => s.parent_id === item.id);
              const isExpanded = expandedParents.includes(item.id!);
              
              return (
                <React.Fragment key={item.id}>
                  {renderRow(item, index, false)}
                  {isExpanded && children.map((child, childIdx) => (
                    renderRow(child, childIdx, true)
                  ))}
                </React.Fragment>
              );
            })}
          </TableBody>

          {editableSuggestions.length > 0 && (
            <TableFooter>
              <TableRow className="bg-muted/50 font-semibold">
                <TableCell colSpan={4} className="font-bold text-right">Totales en Borrador:</TableCell>
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
