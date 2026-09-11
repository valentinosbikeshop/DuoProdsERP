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
import { Check, X, Loader2, Plus, CheckCheck, Trash2, Sparkles, ClipboardList, ChevronDown, ChevronRight, Combine, Copy, Split, GitFork, GripVertical } from 'lucide-react';
import { useDragAutoScroll } from '@/hooks/use-drag-auto-scroll';
import { ConsolidateDialog } from './consolidate-dialog';
import { DistributeInsumoDialog } from './distribute-insumo-dialog';
import { FloatingDraftAssistant } from './floating-draft-assistant';

interface AiSuggestionsGridProps {
  draftItems?: EventItem[];
  eventId: string;
  onDraftChanged?: () => void;
  hasRetailSales?: boolean;
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
  draftItems = [],
  eventId,
  onDraftChanged,
  hasRetailSales = false,
}: AiSuggestionsGridProps) {
  const [editableSuggestions, setEditableSuggestions] = useState<EventItem[]>(draftItems);
  const [manualItem, setManualItem] = useState<AiSuggestion>({ ...emptySuggestion, id: 'manual' });
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [consolidationName, setConsolidationName] = useState('');
  const [expandedParents, setExpandedParents] = useState<string[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverParentId, setDragOverParentId] = useState<string | null>(null);
  const [consolidateOpen, setConsolidateOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [distributeItem, setDistributeItem] = useState<EventItem | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<string[]>([]);
  const supabase = createClient();
  
  useDragAutoScroll({ isDragging: !!draggedItemId });

  useEffect(() => {
    setEditableSuggestions(draftItems);
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
        iva_incluido: updatedItem.iva_incluido ?? true,
        es_insumo: updatedItem.es_insumo ?? false,
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
    
    if (field === 'sin_ganancia') {
      if (newValue === true) {
        updatedItem.ganancia = 0;
      } else if (updatedItem.ganancia === 0 && updatedItem.costo > 0) {
        updatedItem.ganancia = Math.round(updatedItem.costo * 0.2);
      }
    }

    const currentTipoDoc = (updatedItem.tipo_doc_costo || 'factura') as 'factura' | 'boleta';
    const currentIvaIncluido = field === 'iva_incluido' ? newValue : (updatedItem.iva_incluido ?? true);
    const currentEsInsumo = field === 'es_insumo' ? newValue : (updatedItem.es_insumo ?? false);

    if (field === 'es_insumo') {
      updatedItem.es_insumo = newValue;
      if (newValue) {
        updatedItem.ganancia = 0;
        updatedItem.valor_total = 0;
      }
    }

    // Recalculate financials
    if (field === 'valor_total') {
      const financials = calculateGananciaFromTotal(updatedItem.costo, updatedItem.valor_total, currentTipoDoc, currentIvaIncluido, currentEsInsumo);
      updatedItem.ganancia = financials.ganancia;
      updatedItem.valor_neto = financials.valorNeto;
      updatedItem.iva = financials.ivaDebito;
      updatedItem.margen = financials.margen;
    } else if (['costo', 'ganancia', 'sin_ganancia', 'tipo_doc_costo', 'iva_incluido', 'es_insumo'].includes(field)) {
      const financials = calculateFinancials(updatedItem.costo, updatedItem.ganancia, currentTipoDoc, currentIvaIncluido, currentEsInsumo);
      updatedItem.valor_neto = financials.valorNeto;
      updatedItem.iva = financials.ivaDebito;
      updatedItem.valor_total = financials.valorTotal;
      updatedItem.margen = financials.margen;
    }

    if (isManual) {
      setManualItem(updatedItem as AiSuggestion);
    } else {
      let newSuggestions = editableSuggestions.map((item) => (item.id === id ? updatedItem : item));
      
      // If a child is updated, recalculate parent's unit cost (total children cost / parent quantity)
      if (updatedItem.parent_id && ['costo', 'cantidad', 'tipo_doc_costo'].includes(field)) {
        const siblingsAndSelf = newSuggestions.filter(s => s.parent_id === updatedItem.parent_id);
        const newTotalChildrenCost = siblingsAndSelf.reduce((sum, s) => sum + (s.costo * s.cantidad), 0);
        
        newSuggestions = newSuggestions.map(item => {
          if (item.id === updatedItem.parent_id) {
            const parentTipo = (item.tipo_doc_costo || 'factura') as 'factura' | 'boleta';
            const parentIvaIncluido = item.iva_incluido ?? true;
            const parentEsInsumo = item.es_insumo ?? false;
            const parentQty = (item.cantidad && item.cantidad > 0) ? item.cantidad : 1;
            const unitCost = Math.round(newTotalChildrenCost / parentQty);
            const parentFinancials = calculateFinancials(unitCost, item.ganancia, parentTipo, parentIvaIncluido, parentEsInsumo);
            const newParent = {
              ...item,
              costo: unitCost,
              valor_neto: parentFinancials.valorNeto,
              iva: parentFinancials.ivaDebito,
              valor_total: parentFinancials.valorTotal,
              margen: parentFinancials.margen
            };
            if (saveImmediately) updateSupabase(newParent);
            return newParent;
          }
          return item;
        });
      }

      // If a parent's cantidad is updated, recalculate its unit cost based on total children cost
      if (!updatedItem.parent_id && field === 'cantidad') {
        const children = newSuggestions.filter(s => s.parent_id === updatedItem.id);
        if (children.length > 0) {
          const totalChildrenCost = children.reduce((sum, s) => sum + (s.costo * s.cantidad), 0);
          const newQty = Number(newValue) > 0 ? Number(newValue) : 1;
          const unitCost = Math.round(totalChildrenCost / newQty);
          const parentTipo = (updatedItem.tipo_doc_costo || 'factura') as 'factura' | 'boleta';
          const parentIvaIncluido = updatedItem.iva_incluido ?? true;
          const parentFinancials = calculateFinancials(unitCost, updatedItem.ganancia, parentTipo, parentIvaIncluido, false);

          updatedItem.costo = unitCost;
          updatedItem.valor_neto = parentFinancials.valorNeto;
          updatedItem.iva = parentFinancials.ivaDebito;
          updatedItem.valor_total = parentFinancials.valorTotal;
          updatedItem.margen = parentFinancials.margen;
        }
      }

      setEditableSuggestions(newSuggestions);
      if (saveImmediately) {
        updateSupabase(updatedItem);
      }
    }
  };

  const handleBlur = (id: string, e?: React.FocusEvent<HTMLInputElement>) => {
    if (e && e.target.type === 'number') {
      e.target.value = Number(e.target.value).toString();
    }
    if (id === 'manual') {
      setManualItem(prev => ({ ...prev }));
      return;
    }
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

    const tipoDoc = (manualItem.tipo_doc_costo || 'factura') as 'factura' | 'boleta';
    const aplicaIva = manualItem.iva_incluido ?? true;
    const esInsumo = manualItem.es_insumo ?? false;
    const financials = calculateFinancials(manualItem.costo, manualItem.ganancia, tipoDoc, aplicaIva, esInsumo);

    const newItem = {
      event_id: eventId,
      servicio: manualItem.servicio.trim(),
      detalle: manualItem.detalle.trim(),
      tipo_evento: manualItem.tipo_evento,
      cantidad: manualItem.cantidad,
      costo: manualItem.costo,
      ganancia: esInsumo ? 0 : manualItem.ganancia,
      valor_neto: financials.valorNeto,
      iva: financials.ivaDebito,
      valor_total: financials.valorTotal,
      margen: financials.margen,
      tipo_doc_costo: tipoDoc,
      iva_incluido: aplicaIva,
      es_insumo: esInsumo,
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

    const handleDuplicate = async (id: string) => {
    try {
      const itemToDuplicate = editableSuggestions.find(s => s.id === id);
      if (!itemToDuplicate) return;

      const isParent = itemToDuplicate.tipo_evento === 'Consolidado';
      
      const { id: _, created_at: __, ...itemData } = itemToDuplicate as any;
      itemData.servicio = `${itemData.servicio} (Copia)`;
      
      const { data: newParentData, error: parentError } = await (supabase
        .from('event_items') as any)
        .insert(itemData)
        .select()
        .single();
        
      if (parentError) throw parentError;
      
      const createdParent = newParentData as EventItem;
      let newItems: EventItem[] = [createdParent];

      if (isParent) {
        const childrenToDuplicate = editableSuggestions.filter(s => s.parent_id === id);
        if (childrenToDuplicate.length > 0) {
          const childrenData = childrenToDuplicate.map(child => {
            const { id: _childId, created_at: _childCreatedAt, ...childData } = child as any;
            childData.parent_id = createdParent.id;
            return childData;
          });
          
          const { data: newChildrenData, error: childrenError } = await (supabase
            .from('event_items') as any)
            .insert(childrenData)
            .select();
            
          if (childrenError) throw childrenError;
          newItems = [...newItems, ...(newChildrenData as EventItem[])];
        }
      }
      
      setEditableSuggestions(prev => [...prev, ...newItems]);
      if (onDraftChanged) onDraftChanged();
      
    } catch (e) {
      console.error('Error duplicando:', e);
      alert('Error al duplicar el ítem.');
    }
  };

  const handleDropItem = async (draggedId: string, targetParentId: string) => {
    if (draggedId === targetParentId) return;
    
    const draggedItem = editableSuggestions.find(s => s.id === draggedId);
    const targetParent = editableSuggestions.find(s => s.id === targetParentId);
    
    if (!draggedItem || !targetParent) return;
    if (draggedItem.tipo_evento === 'Consolidado') {
      alert("No se pueden arrastrar ítems consolidados dentro de otros.");
      return;
    }

    const isTargetConsolidated = targetParent.tipo_evento?.toLowerCase() === 'consolidado' || editableSuggestions.some(s => s.parent_id === targetParentId);
    if (!isTargetConsolidated) {
      setSelectedIds([draggedId, targetParentId]);
      setConsolidateOpen(true);
      return;
    }
    
    const oldParentId = draggedItem.parent_id;
    if (oldParentId === targetParentId) return; 
    
    try {
      const updatedItem = { ...draggedItem, parent_id: targetParentId };
      const { error } = await (supabase
        .from('event_items') as any)
        .update({ parent_id: targetParentId })
        .eq('id', draggedId);
        
      if (error) throw error;
      
      let newSuggestions = editableSuggestions.map(item => item.id === draggedId ? updatedItem : item);
      
      const targetSiblings = newSuggestions.filter(s => s.parent_id === targetParentId);
      const newTargetCost = targetSiblings.reduce((acc, c) => acc + (c.costo * c.cantidad), 0);
      const targetQty = (targetParent.cantidad && targetParent.cantidad > 0) ? targetParent.cantidad : 1;
      const targetUnitCost = Math.round(newTargetCost / targetQty);
      const targetFin = calculateFinancials(targetUnitCost, targetParent.ganancia, targetParent.tipo_doc_costo || 'factura', targetParent.iva_incluido ?? true, targetParent.es_insumo ?? false);
      const updatedTargetParent: EventItem = {
        ...targetParent,
        costo: targetUnitCost,
        valor_neto: targetFin.valorNeto,
        iva: targetFin.ivaDebito,
        valor_total: targetFin.valorTotal,
        margen: targetFin.margen
      };
      
      let updatedOldParent: EventItem | null = null;
      if (oldParentId) {
        const oldParent = newSuggestions.find(s => s.id === oldParentId);
        if (oldParent) {
          const oldSiblings = newSuggestions.filter(s => s.parent_id === oldParentId);
          const newOldCost = oldSiblings.reduce((acc, c) => acc + (c.costo * c.cantidad), 0);
          const oldQty = (oldParent.cantidad && oldParent.cantidad > 0) ? oldParent.cantidad : 1;
          const oldUnitCost = Math.round(newOldCost / oldQty);
          const oldFin = calculateFinancials(oldUnitCost, oldParent.ganancia, oldParent.tipo_doc_costo || 'factura', oldParent.iva_incluido ?? true, oldParent.es_insumo ?? false);
          updatedOldParent = {
            ...oldParent,
            costo: oldUnitCost,
            valor_neto: oldFin.valorNeto,
            iva: oldFin.ivaDebito,
            valor_total: oldFin.valorTotal,
            margen: oldFin.margen
          };
        }
      }
      
      newSuggestions = newSuggestions.map(item => {
        if (item.id === targetParentId) return updatedTargetParent;
        if (oldParentId && item.id === oldParentId && updatedOldParent) return updatedOldParent;
        return item;
      });
      
      setEditableSuggestions(newSuggestions);
      
      await updateSupabase(updatedTargetParent);
      if (updatedOldParent) await updateSupabase(updatedOldParent);
      
      if (onDraftChanged) onDraftChanged();
      
    } catch (e) {
      console.error("Error al mover ítem", e);
      alert("Error al agrupar el ítem.");
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

  const handleUngroup = async (parentId: string) => {
    try {
      const children = editableSuggestions.filter(s => s.parent_id === parentId);
      
      for (const child of children) {
        await (supabase.from('event_items') as any).update({ 
          parent_id: null,
          es_insumo: false
        }).eq('id', child.id);
      }
      
      await (supabase.from('event_items') as any).delete().eq('id', parentId);
      
      setSelectedIds(prev => prev.filter(selId => selId !== parentId));
      setEditableSuggestions(prev => {
        let updated = prev.filter(item => item.id !== parentId);
        updated = updated.map(item => {
          if (item.parent_id === parentId) {
            return { ...item, parent_id: null, es_insumo: false };
          }
          return item;
        });
        return updated;
      });
      if (onDraftChanged) onDraftChanged();
    } catch (e) {
      console.error(e);
      alert('Error al desagrupar el ítem.');
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

  const handleConsolidateClick = () => {
    if (selectedIds.length < 2) return;
    setConsolidateOpen(true);
  };

  const handleOpenDistribute = (item: EventItem) => {
    setDistributeItem(item);
    setDistributeOpen(true);
  };

  const handlePerformDistribute = async ({
    consolidatedDistributions,
    standaloneSplitQty,
  }: {
    consolidatedDistributions: Record<string, number>;
    standaloneSplitQty: number;
  }) => {
    if (!distributeItem) return;

    const originalBase = distributeItem.cantidad_original || distributeItem.cantidad;
    const itemIvaIncluido = distributeItem.iva_incluido ?? true;
    let totalAssigned = 0;

    try {
      // 1. Process assignments to consolidated parents in draft
      for (const [parentId, qty] of Object.entries(consolidatedDistributions)) {
        if (!qty || qty <= 0) continue;
        totalAssigned += qty;

        const childFin = calculateFinancials(distributeItem.costo, 0, distributeItem.tipo_doc_costo || 'factura', itemIvaIncluido, true);
        const childItem = {
          event_id: eventId,
          servicio: distributeItem.servicio,
          detalle: `Porción derivada (${qty} de ${originalBase} un)`,
          tipo_evento: distributeItem.tipo_evento,
          cantidad: qty,
          costo: distributeItem.costo,
          ganancia: 0,
          valor_neto: childFin.valorNeto,
          iva: childFin.ivaDebito,
          valor_total: childFin.valorTotal,
          margen: childFin.margen,
          tipo_doc_costo: distributeItem.tipo_doc_costo || 'factura',
          factura_url: distributeItem.factura_url,
          iva_incluido: itemIvaIncluido,
          es_insumo: true,
          approved: false,
          parent_id: parentId,
          source_item_id: distributeItem.id,
          cantidad_original: originalBase,
        };

        const { error: childErr } = await (supabase.from('event_items') as any).insert(childItem);
        if (childErr && (childErr.message?.includes('source_item_id') || childErr.code === 'PGRST204')) {
          const { source_item_id: _, cantidad_original: __, ...fallbackChild } = childItem;
          await (supabase.from('event_items') as any).insert(fallbackChild);
        }

        // Recalculate parent's unit cost dynamically
        const parent = editableSuggestions.find(p => p.id === parentId);
        if (parent) {
          const existingChildren = editableSuggestions.filter(c => c.parent_id === parentId);
          const existingChildrenCost = existingChildren.reduce((acc, c) => acc + (c.costo * c.cantidad), 0);
          const newTotalChildrenCost = existingChildrenCost + (qty * distributeItem.costo);
          const newParentUnitCost = Math.round(newTotalChildrenCost / Math.max(1, parent.cantidad));

          let parentGanancia = parent.ganancia;
          let parentFinancials;
          if (parent.valor_total && parent.valor_total > 0) {
            const fin = calculateGananciaFromTotal(newParentUnitCost, parent.valor_total, parent.tipo_doc_costo || 'factura', parent.iva_incluido ?? true, false);
            parentGanancia = fin.ganancia;
            parentFinancials = fin;
          } else {
            parentFinancials = calculateFinancials(newParentUnitCost, parent.ganancia, parent.tipo_doc_costo || 'factura', parent.iva_incluido ?? true, false);
          }

          await (supabase.from('event_items') as any).update({
            costo: newParentUnitCost,
            ganancia: parentGanancia,
            valor_neto: parentFinancials.valorNeto,
            iva: parentFinancials.ivaDebito,
            valor_total: parentFinancials.valorTotal,
            margen: parentFinancials.margen,
          }).eq('id', parentId);
        }
      }

      // 2. Process standalone split if any
      if (standaloneSplitQty > 0) {
        totalAssigned += standaloneSplitQty;
        const splitFin = calculateFinancials(distributeItem.costo, distributeItem.ganancia, distributeItem.tipo_doc_costo || 'factura', itemIvaIncluido, distributeItem.es_insumo ?? true);
        const newSplitItem = {
          event_id: eventId,
          servicio: distributeItem.servicio,
          detalle: `Separado de compra (${standaloneSplitQty} de ${originalBase} un)`,
          tipo_evento: distributeItem.tipo_evento,
          cantidad: standaloneSplitQty,
          costo: distributeItem.costo,
          ganancia: distributeItem.ganancia,
          valor_neto: splitFin.valorNeto,
          iva: splitFin.ivaDebito,
          valor_total: splitFin.valorTotal,
          margen: splitFin.margen,
          tipo_doc_costo: distributeItem.tipo_doc_costo || 'factura',
          factura_url: distributeItem.factura_url,
          iva_incluido: itemIvaIncluido,
          es_insumo: distributeItem.es_insumo ?? true,
          approved: false,
          parent_id: null,
          source_item_id: distributeItem.id,
          cantidad_original: originalBase,
        };

        const { error: splitErr } = await (supabase.from('event_items') as any).insert(newSplitItem);
        if (splitErr && (splitErr.message?.includes('source_item_id') || splitErr.code === 'PGRST204')) {
          const { source_item_id: _, cantidad_original: __, ...fallbackSplit } = newSplitItem;
          await (supabase.from('event_items') as any).insert(fallbackSplit);
        }
      }

      // 3. Update original item remaining quantity
      const remainingQty = Math.max(0, distributeItem.cantidad - totalAssigned);
      const updateData: any = {
        cantidad: remainingQty,
        cantidad_original: originalBase,
        detalle: distributeItem.detalle
          ? `${distributeItem.detalle} (${remainingQty} restantes)`
          : `Compra original (${remainingQty} restantes de ${originalBase})`,
      };

      const { error: updateErr } = await (supabase.from('event_items') as any).update(updateData).eq('id', distributeItem.id);
      if (updateErr && (updateErr.message?.includes('cantidad_original') || updateErr.code === 'PGRST204')) {
        delete updateData.cantidad_original;
        await (supabase.from('event_items') as any).update(updateData).eq('id', distributeItem.id);
      }

      if (onDraftChanged) onDraftChanged();
    } catch (err: any) {
      console.error('Error distributing item in draft:', err);
      alert('Error al derivar el insumo: ' + err.message);
    }
  };

  const handleSplitItem = async (item: EventItem) => {
    if (!item.cantidad || item.cantidad <= 1) return;
    const promptVal = window.prompt(
      `¿Cuántas unidades deseas separar de "${item.servicio}" (disponibles: ${item.cantidad})?\nSe creará una nueva fila en borrador con la misma factura vinculada.`,
      Math.floor(item.cantidad / 2).toString()
    );
    if (!promptVal) return;
    const splitQty = parseInt(promptVal);
    if (isNaN(splitQty) || splitQty < 1 || splitQty >= item.cantidad) {
      alert(`La cantidad a separar debe ser entre 1 y ${item.cantidad - 1}.`);
      return;
    }

    const remainingQty = item.cantidad - splitQty;
    const originalBase = item.cantidad_original || item.cantidad;
    const itemIvaIncluido = item.iva_incluido ?? true;
    const splitFin = calculateFinancials(item.costo, item.ganancia, item.tipo_doc_costo || 'factura', itemIvaIncluido, item.es_insumo ?? true);

    try {
      // 1. Create separated row
      const newSplitItem = {
        event_id: eventId,
        servicio: item.servicio,
        detalle: `Separado de compra (${splitQty} de ${originalBase} un)`,
        tipo_evento: item.tipo_evento,
        cantidad: splitQty,
        costo: item.costo,
        ganancia: item.ganancia,
        valor_neto: splitFin.valorNeto,
        iva: splitFin.ivaDebito,
        valor_total: splitFin.valorTotal,
        margen: splitFin.margen,
        tipo_doc_costo: item.tipo_doc_costo || 'factura',
        factura_url: item.factura_url,
        iva_incluido: itemIvaIncluido,
        es_insumo: item.es_insumo ?? true,
        approved: false,
        parent_id: item.parent_id || null,
        source_item_id: item.id,
        cantidad_original: originalBase,
      };

      const { error: insertErr } = await (supabase.from('event_items') as any).insert(newSplitItem);
      if (insertErr && (insertErr.message?.includes('source_item_id') || insertErr.code === 'PGRST204')) {
        const { source_item_id: _, cantidad_original: __, ...fallbackItem } = newSplitItem;
        await (supabase.from('event_items') as any).insert(fallbackItem);
      }

      // 2. Update original row
      const updateData: any = {
        cantidad: remainingQty,
        cantidad_original: originalBase,
        detalle: item.detalle ? `${item.detalle} (${remainingQty} restantes)` : `Compra original (${remainingQty} restantes de ${originalBase})`,
      };

      const { error: updateErr } = await (supabase.from('event_items') as any).update(updateData).eq('id', item.id);
      if (updateErr && (updateErr.message?.includes('cantidad_original') || updateErr.code === 'PGRST204')) {
        delete updateData.cantidad_original;
        await (supabase.from('event_items') as any).update(updateData).eq('id', item.id);
      }

      if (onDraftChanged) onDraftChanged();
    } catch (err: any) {
      console.error('Error splitting item in draft:', err);
      alert('Error al separar el insumo: ' + err.message);
    }
  };

  const handlePerformConsolidate = async ({
    name,
    quantity,
    unitPrice,
    assignedQuantities,
  }: {
    name: string;
    quantity: number;
    unitPrice?: number;
    assignedQuantities: Record<string, number>;
  }) => {
    const selectedItems = editableSuggestions.filter(s => selectedIds.includes(s.id!));
    let totalCost = 0;
    selectedItems.forEach(item => {
      const assigned = (item.id && assignedQuantities[item.id] !== undefined)
        ? assignedQuantities[item.id]
        : (item.cantidad || 1);
      totalCost += (item.costo * assigned);
    });

    const validQty = Math.max(1, quantity);
    const realUnitCost = Math.round(totalCost / validQty);

    let gananciaCalculada = 0;
    let financials;
    if (unitPrice && unitPrice > 0) {
      const fin = calculateGananciaFromTotal(realUnitCost, unitPrice, 'factura', true, false);
      gananciaCalculada = fin.ganancia;
      financials = fin;
    } else {
      financials = calculateFinancials(realUnitCost, 0, 'factura', true, false);
      gananciaCalculada = 0;
    }

    const parentItem = {
      event_id: eventId,
      servicio: name.trim(),
      detalle: `Consolidado (${validQty} un)`,
      tipo_evento: 'Consolidado',
      cantidad: validQty,
      costo: realUnitCost,
      ganancia: gananciaCalculada,
      valor_neto: financials.valorNeto,
      iva: financials.ivaDebito,
      valor_total: financials.valorTotal,
      margen: financials.margen,
      tipo_doc_costo: 'factura',
      iva_incluido: true,
      es_insumo: false,
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

      // 2. Process children: partial assignment or full transfer
      for (const originalItem of selectedItems) {
        const assigned = (originalItem.id && assignedQuantities[originalItem.id] !== undefined)
          ? assignedQuantities[originalItem.id]
          : (originalItem.cantidad || 1);
        const childIvaIncluido = originalItem.iva_incluido ?? true;
        const childFinancials = calculateFinancials(originalItem.costo, 0, originalItem.tipo_doc_costo || 'factura', childIvaIncluido, true);

        if (assigned < originalItem.cantidad) {
          // A. Partial: Create a child item with the assigned portion referencing the original purchase
          const originalBase = originalItem.cantidad_original || originalItem.cantidad;
          const partialChild = {
            event_id: eventId,
            servicio: originalItem.servicio,
            detalle: `Porción asignada (${assigned} de ${originalBase} un)`,
            tipo_evento: originalItem.tipo_evento,
            cantidad: assigned,
            costo: originalItem.costo,
            ganancia: 0,
            valor_neto: childFinancials.valorNeto,
            iva: childFinancials.ivaDebito,
            valor_total: childFinancials.valorTotal,
            margen: childFinancials.margen,
            tipo_doc_costo: originalItem.tipo_doc_costo || 'factura',
            factura_url: originalItem.factura_url,
            iva_incluido: childIvaIncluido,
            es_insumo: true,
            approved: false,
            parent_id: insertedParent.id,
            source_item_id: originalItem.id,
            cantidad_original: originalBase,
          };

          const { error: childErr } = await (supabase.from('event_items') as any).insert(partialChild);
          if (childErr && (childErr.message?.includes('source_item_id') || childErr.code === 'PGRST204')) {
            const { source_item_id: _, cantidad_original: __, ...fallbackChild } = partialChild;
            await (supabase.from('event_items') as any).insert(fallbackChild);
          }

          // B. Reduce remaining quantity on original purchase row
          const remainingQty = originalItem.cantidad - assigned;
          const updateData: any = {
            cantidad: remainingQty,
            cantidad_original: originalBase,
            detalle: originalItem.detalle 
              ? `${originalItem.detalle} (${remainingQty} restantes)` 
              : `Compra original: ${originalBase} un (${remainingQty} restantes)`,
          };

          const { error: updateErr } = await (supabase.from('event_items') as any).update(updateData).eq('id', originalItem.id);
          if (updateErr && (updateErr.message?.includes('cantidad_original') || updateErr.code === 'PGRST204')) {
            delete updateData.cantidad_original;
            await (supabase.from('event_items') as any).update(updateData).eq('id', originalItem.id);
          }
        } else {
          // Full assignment: Absorb original item directly into parent
          await (supabase.from('event_items') as any).update({ 
            parent_id: insertedParent.id,
            es_insumo: true,
            ganancia: 0,
            valor_neto: childFinancials.valorNeto,
            iva: childFinancials.ivaDebito,
            valor_total: childFinancials.valorTotal,
            margen: childFinancials.margen
          }).eq('id', originalItem.id);
        }
      }
      
      setSelectedIds([]);
      setConsolidationName('');
      setExpandedParents(prev => [...prev, insertedParent.id]);
      if (onDraftChanged) onDraftChanged();
    } catch (e: any) {
      console.error("Error consolidating items", e);
      if (e?.message?.includes("parent_id") || e?.code === "PGRST204") {
        alert("Error en la Base de Datos: La columna 'parent_id' no existe en Supabase. Debes ejecutar el script 'add_parent_id.sql' en el SQL Editor de Supabase.");
      } else {
        alert(`Hubo un error al consolidar los ítems: ${e?.message || "Error desconocido"}`);
      }
      throw e;
    }
  };

  const handleAssistantActions = async (actions: any[]) => {
    let newSuggestions = [...editableSuggestions];
    const affectedIds: string[] = [];

    for (const action of actions) {
      try {
        // 1. CONSOLIDAR
        if (action.type === 'CONSOLIDATE') {
          let targetItemIds = action.itemIds || [];
          if (!Array.isArray(targetItemIds)) targetItemIds = [targetItemIds];

          // Fallback: Si Gemini envió nombres en lugar de IDs, los resolvemos
          const validIds = new Set(newSuggestions.map(s => s.id));
          targetItemIds = targetItemIds.flatMap((idStr: string) => {
            if (validIds.has(idStr)) return [idStr];
            const matches = newSuggestions.filter(s => s.servicio?.toLowerCase() === idStr.toLowerCase() || s.servicio?.toLowerCase().includes(idStr.toLowerCase()));
            return matches.map(m => m.id!);
          });

          if (targetItemIds.length === 0 && action.parentName) {
            const cleanName = action.parentName.toLowerCase().replace(/s$/, '').trim();
            const matchingItems = newSuggestions.filter(s => 
              !s.parent_id && (s.servicio?.toLowerCase().includes(cleanName) || s.detalle?.toLowerCase().includes(cleanName))
            );
            if (matchingItems.length > 0) {
              targetItemIds = matchingItems.map(m => m.id!);
            }
          }

          const selectedForConsolidation = newSuggestions.filter(s => targetItemIds.includes(s.id!));
          if (selectedForConsolidation.length > 0) {
            const parentQty = (action.parentQuantity && action.parentQuantity > 0) ? action.parentQuantity : 1;
            let totalCost = 0;
            let totalGanancia = 0;
            selectedForConsolidation.forEach(item => {
              totalCost += (item.costo * (item.cantidad || 1));
              totalGanancia += ((item.ganancia || 0) * (item.cantidad || 1));
            });

            const parentUnitCost = Math.round(totalCost / parentQty);
            const parentUnitGanancia = Math.round(totalGanancia / parentQty);
            const fin = calculateFinancials(parentUnitCost, parentUnitGanancia, 'factura', true, false);

            const parentItem = {
              event_id: eventId,
              servicio: action.parentName || 'Consolidado',
              detalle: action.parentDetail || 'Consolidado de ítems',
              tipo_evento: 'Consolidado',
              cantidad: parentQty,
              costo: parentUnitCost,
              ganancia: parentUnitGanancia,
              valor_neto: fin.valorNeto,
              iva: fin.ivaDebito,
              valor_total: fin.valorTotal,
              margen: fin.margen,
              tipo_doc_costo: 'factura',
              iva_incluido: true,
              es_insumo: false,
              approved: false,
              parent_id: null
            };

            const { data: insertedParent, error: insertError } = await (supabase.from('event_items') as any)
              .insert(parentItem)
              .select()
              .single();
              
            if (insertError || !insertedParent) throw insertError;
            affectedIds.push(insertedParent.id);

            for (const item of selectedForConsolidation) {
              await (supabase.from('event_items') as any).update({ 
                parent_id: insertedParent.id,
                es_insumo: true,
                ganancia: 0
              }).eq('id', item.id);
              
              const updatedChild = newSuggestions.find(s => s.id === item.id);
              if (updatedChild) {
                updatedChild.parent_id = insertedParent.id;
                updatedChild.es_insumo = true;
                updatedChild.ganancia = 0;
                affectedIds.push(updatedChild.id!);
              }
            }
            newSuggestions.push(insertedParent);
            setExpandedParents(prev => [...prev, insertedParent.id]);
          }
        }

        // 2. DESAGRUPAR (UNCONSOLIDATE)
        else if (action.type === 'UNCONSOLIDATE') {
          // Desarmar grupo padre completo
          if (action.parentId) {
            const parent = newSuggestions.find(s => s.id === action.parentId);
            const children = newSuggestions.filter(s => s.parent_id === action.parentId);
            
            for (const child of children) {
              const targetGanancia = child.ganancia > 0 ? child.ganancia : (child.costo > 0 ? Math.round(child.costo * 0.2) : 0);
              const childFin = calculateFinancials(
                child.costo, 
                targetGanancia, 
                (child.tipo_doc_costo || 'factura') as any, 
                child.iva_incluido ?? true, 
                false
              );

              await (supabase.from('event_items') as any).update({ 
                parent_id: null,
                es_insumo: false,
                ganancia: targetGanancia,
                valor_neto: childFin.valorNeto,
                iva: childFin.ivaDebito,
                valor_total: childFin.valorTotal,
                margen: childFin.margen
              }).eq('id', child.id);

              const childInState = newSuggestions.find(s => s.id === child.id);
              if (childInState) {
                childInState.parent_id = null;
                childInState.es_insumo = false;
                childInState.ganancia = targetGanancia;
                childInState.valor_neto = childFin.valorNeto;
                childInState.iva = childFin.ivaDebito;
                childInState.valor_total = childFin.valorTotal;
                childInState.margen = childFin.margen;
                affectedIds.push(childInState.id!);
              }
            }

            await (supabase.from('event_items') as any).delete().eq('id', action.parentId);
            newSuggestions = newSuggestions.filter(s => s.id !== action.parentId);
            setSelectedIds(prev => prev.filter(selId => selId !== action.parentId));
          }
          // Liberar ítems hijos específicos de su grupo
          else if (action.itemIds && action.itemIds.length > 0) {
            const parentsToRecalculate = new Set<string>();

            for (const childId of action.itemIds) {
              const child = newSuggestions.find(s => s.id === childId);
              if (child && child.parent_id) {
                parentsToRecalculate.add(child.parent_id);
                const targetGanancia = child.ganancia > 0 ? child.ganancia : (child.costo > 0 ? Math.round(child.costo * 0.2) : 0);
                const childFin = calculateFinancials(
                  child.costo, 
                  targetGanancia, 
                  (child.tipo_doc_costo || 'factura') as any, 
                  child.iva_incluido ?? true, 
                  false
                );

                await (supabase.from('event_items') as any).update({ 
                  parent_id: null,
                  es_insumo: false,
                  ganancia: targetGanancia,
                  valor_neto: childFin.valorNeto,
                  iva: childFin.ivaDebito,
                  valor_total: childFin.valorTotal,
                  margen: childFin.margen
                }).eq('id', child.id);

                child.parent_id = null;
                child.es_insumo = false;
                child.ganancia = targetGanancia;
                child.valor_neto = childFin.valorNeto;
                child.iva = childFin.ivaDebito;
                child.valor_total = childFin.valorTotal;
                child.margen = childFin.margen;
                affectedIds.push(child.id!);
              }
            }

            // Recalcular costos de los padres afectados
            for (const pId of Array.from(parentsToRecalculate)) {
              const remainingChildren = newSuggestions.filter(s => s.parent_id === pId);
              const parent = newSuggestions.find(s => s.id === pId);
              if (remainingChildren.length === 0 && parent) {
                await (supabase.from('event_items') as any).delete().eq('id', pId);
                newSuggestions = newSuggestions.filter(s => s.id !== pId);
              } else if (parent) {
                const newTotal = remainingChildren.reduce((sum, c) => sum + (c.costo * (c.cantidad || 1)), 0);
                const newUnitCost = Math.round(newTotal / (parent.cantidad || 1));
                const pFin = calculateFinancials(newUnitCost, parent.ganancia, (parent.tipo_doc_costo || 'factura') as any, parent.iva_incluido ?? true, false);
                
                await (supabase.from('event_items') as any).update({
                  costo: newUnitCost,
                  valor_neto: pFin.valorNeto,
                  iva: pFin.ivaDebito,
                  valor_total: pFin.valorTotal,
                  margen: pFin.margen
                }).eq('id', pId);

                parent.costo = newUnitCost;
                parent.valor_neto = pFin.valorNeto;
                parent.iva = pFin.ivaDebito;
                parent.valor_total = pFin.valorTotal;
                parent.margen = pFin.margen;
                affectedIds.push(pId);
              }
            }
          }
        }

        // 3. REORDENAR (REORDER)
        else if (action.type === 'REORDER' && action.orderedIds && action.orderedIds.length > 0) {
          const orderedMap = new Map<string, number>();
          action.orderedIds.forEach((id: string, idx: number) => orderedMap.set(id, idx));

          // Reordenar en memoria
          newSuggestions.sort((a, b) => {
            const aIdx = orderedMap.has(a.id!) ? orderedMap.get(a.id!)! : 999999;
            const bIdx = orderedMap.has(b.id!) ? orderedMap.get(b.id!)! : 999999;
            return aIdx - bIdx;
          });

          // Persistir orden secuencialmente en created_at
          const nowBase = Date.now();
          for (let i = 0; i < action.orderedIds.length; i++) {
            const id = action.orderedIds[i];
            const newCreatedAt = new Date(nowBase + (i * 1000)).toISOString();
            await (supabase.from('event_items') as any).update({ created_at: newCreatedAt }).eq('id', id);
            const target = newSuggestions.find(s => s.id === id);
            if (target) target.created_at = newCreatedAt;
            affectedIds.push(id);
          }
        }

        // 4. INTERCAMBIAR NOMBRE Y DETALLE (SWAP_NAME_DETAIL)
        else if (action.type === 'SWAP_NAME_DETAIL' && action.itemIds) {
          const itemIdsArray = Array.isArray(action.itemIds) ? action.itemIds : [action.itemIds];
          for (const idStr of itemIdsArray) {
            const item = newSuggestions.find(s => s.id === idStr || s.servicio?.toLowerCase() === idStr?.toLowerCase());
            if (item) {
              const oldServicio = item.servicio || '';
              const oldDetalle = item.detalle || '';
              const newServicio = oldDetalle.trim() ? oldDetalle.trim() : oldServicio;
              const newDetalle = oldServicio;

              item.servicio = newServicio;
              item.detalle = newDetalle;

              await (supabase.from('event_items') as any).update({
                servicio: newServicio,
                detalle: newDetalle
              }).eq('id', item.id);

              affectedIds.push(item.id!);
            }
          }
        }

        // 5. ACTUALIZAR ÍTEMS (UPDATE_ITEMS)
        else if (action.type === 'UPDATE_ITEMS' && action.updates) {
          const updatesArray = Array.isArray(action.updates) ? action.updates : [action.updates];
          if (updatesArray.length === 0) continue;
          
          const parentsToRecalculate = new Set<string>();

          for (const update of updatesArray) {
            const item = newSuggestions.find(s => s.id === update.id || s.servicio?.toLowerCase() === update.id?.toLowerCase() || s.servicio?.toLowerCase().includes(update.id?.toLowerCase() || '@@@'));
            if (!item) continue;

            if (update.servicio !== undefined) item.servicio = update.servicio;
            if (update.detalle !== undefined) item.detalle = update.detalle;
            if (update.cantidad !== undefined) item.cantidad = Number(update.cantidad) || 1;
            if (update.costo !== undefined) item.costo = Number(update.costo) || 0;
            if (update.ganancia !== undefined) item.ganancia = Number(update.ganancia) || 0;
            if (update.tipo_doc_costo !== undefined) {
              const td = String(update.tipo_doc_costo).toLowerCase();
              item.tipo_doc_costo = ['factura', 'boleta'].includes(td) ? td as 'factura' | 'boleta' : 'factura';
            }
            if (update.es_insumo !== undefined) item.es_insumo = Boolean(update.es_insumo);

            const fin = calculateFinancials(
              item.costo, 
              item.ganancia, 
              (item.tipo_doc_costo || 'factura') as any, 
              item.iva_incluido ?? true, 
              item.es_insumo ?? false
            );

            item.valor_neto = fin.valorNeto;
            item.iva = fin.ivaDebito;
            item.valor_total = fin.valorTotal;
            item.margen = fin.margen;

            await updateSupabase(item);
            affectedIds.push(item.id!);

            if (item.parent_id) {
              parentsToRecalculate.add(item.parent_id);
            }
          }

          // Si se actualizaron hijos, recalcular sus padres
          for (const pId of Array.from(parentsToRecalculate)) {
            const children = newSuggestions.filter(s => s.parent_id === pId);
            const parent = newSuggestions.find(s => s.id === pId);
            if (parent && children.length > 0) {
              const newTotal = children.reduce((sum, c) => sum + (c.costo * (c.cantidad || 1)), 0);
              const newUnitCost = Math.round(newTotal / (parent.cantidad || 1));
              const pFin = calculateFinancials(newUnitCost, parent.ganancia, (parent.tipo_doc_costo || 'factura') as any, parent.iva_incluido ?? true, false);
              
              parent.costo = newUnitCost;
              parent.valor_neto = pFin.valorNeto;
              parent.iva = pFin.ivaDebito;
              parent.valor_total = pFin.valorTotal;
              parent.margen = pFin.margen;
              await updateSupabase(parent);
              affectedIds.push(pId);
            }
          }
        }

        // 6. AGREGAR NUEVOS ÍTEMS (ADD_ITEMS o ADD_FROM_INVOICE)
        else if ((action.type === 'ADD_ITEMS' || action.type === 'ADD_FROM_INVOICE') && action.newItems) {
          const newItemsArray = Array.isArray(action.newItems) ? action.newItems : [action.newItems];
          if (newItemsArray.length === 0) continue;

          const isConsolidated = action.asConsolidated ?? (action.type === 'ADD_FROM_INVOICE' || !!action.parentName);

          if (isConsolidated) {
            let totalCost = 0;
            const validNewItems = newItemsArray.map((ni: any) => {
              const c = Number(ni.costo) || 0;
              const q = Number(ni.cantidad) || 1;
              totalCost += (c * q);
              return ni;
            });

            const parentQty = 1;
            const parentFin = calculateFinancials(totalCost, 0, 'factura', true, false);

            const parentItem = {
              event_id: eventId,
              servicio: action.parentName || 'Grupo Agregado',
              detalle: action.parentDetail || 'Consolidado generado por IA',
              tipo_evento: 'Consolidado',
              cantidad: parentQty,
              costo: totalCost,
              ganancia: 0,
              valor_neto: parentFin.valorNeto,
              iva: parentFin.ivaDebito,
              valor_total: parentFin.valorTotal,
              margen: parentFin.margen,
              tipo_doc_costo: 'factura',
              iva_incluido: true,
              es_insumo: false,
              approved: false,
              parent_id: null
            };

            const { data: insertedParent, error: insertError } = await (supabase.from('event_items') as any)
              .insert(parentItem)
              .select()
              .single();
              
            if (insertError || !insertedParent) throw insertError;
            affectedIds.push(insertedParent.id);

            const itemsToInsert = validNewItems.map((ni: any) => {
              const c = Number(ni.costo) || 0;
              const rawDoc = String(ni.tipo_doc_costo || 'factura').toLowerCase();
              const td = ['factura', 'boleta'].includes(rawDoc) ? rawDoc as 'factura' | 'boleta' : 'factura';
              
              const fin = calculateFinancials(c, 0, td, true, true);

              return {
                event_id: eventId,
                servicio: ni.servicio || 'Insumo',
                detalle: ni.detalle || '',
                tipo_evento: 'Insumo',
                cantidad: Number(ni.cantidad) || 1,
                costo: c,
                ganancia: 0,
                valor_neto: fin.valorNeto,
                iva: fin.ivaDebito,
                valor_total: fin.valorTotal,
                margen: fin.margen,
                tipo_doc_costo: td,
                iva_incluido: true,
                es_insumo: true,
                approved: false,
                parent_id: insertedParent.id
              };
            });

            const { data: insertedChildren, error: childrenError } = await (supabase.from('event_items') as any)
              .insert(itemsToInsert)
              .select();

            if (childrenError) throw childrenError;

            newSuggestions.push(insertedParent);
            if (insertedChildren) {
              newSuggestions.push(...insertedChildren);
              insertedChildren.forEach((c: any) => affectedIds.push(c.id));
            }
            setExpandedParents(prev => [...prev, insertedParent.id]);
          } else {
            // Ítems sueltos independientes
            const itemsToInsert = newItemsArray.map((ni: any) => {
              const costo = Number(ni.costo) || 0;
              const ganancia = Number(ni.ganancia) || Math.round(costo * 0.2);
              const rawDoc = String(ni.tipo_doc_costo || 'factura').toLowerCase();
              const tipoDoc = ['factura', 'boleta'].includes(rawDoc) ? rawDoc as 'factura' | 'boleta' : 'factura';
              const esInsumo = Boolean(ni.es_insumo ?? false);
              const fin = calculateFinancials(costo, ganancia, tipoDoc, true, esInsumo);

              return {
                event_id: eventId,
                servicio: ni.servicio || 'Insumo generado',
                detalle: ni.detalle || '',
                tipo_evento: ni.tipo_evento || 'AI',
                cantidad: ni.cantidad || 1,
                costo,
                ganancia,
                valor_neto: fin.valorNeto,
                iva: fin.ivaDebito,
                valor_total: fin.valorTotal,
                margen: fin.margen,
                tipo_doc_costo: tipoDoc,
                iva_incluido: true,
                es_insumo: esInsumo,
                approved: false,
                parent_id: null
              };
            });

            const { data: inserted, error: insertError } = await (supabase.from('event_items') as any)
              .insert(itemsToInsert)
              .select();

            if (insertError) throw insertError;
            if (inserted) {
              newSuggestions.push(...inserted);
              inserted.forEach((it: any) => affectedIds.push(it.id));
            }
          }
        }

        // 7. ELIMINAR ÍTEMS (DELETE_ITEMS)
        else if (action.type === 'DELETE_ITEMS' && action.itemIds && action.itemIds.length > 0) {
          const idsToRemove = [...action.itemIds];
          for (const id of action.itemIds) {
            const children = newSuggestions.filter(s => s.parent_id === id).map(s => s.id);
            idsToRemove.push(...children);
          }

          await (supabase.from('event_items') as any).delete().in('id', idsToRemove);
          newSuggestions = newSuggestions.filter(s => !idsToRemove.includes(s.id!));
          setSelectedIds(prev => prev.filter(selId => !idsToRemove.includes(selId)));
        }

      } catch (actionErr) {
        console.error(`Error ejecutando acción AI ${action.type}:`, actionErr);
      }
    }

    setEditableSuggestions(newSuggestions);
    if (onDraftChanged) onDraftChanged();
    
    if (affectedIds.length > 0) {
      setHighlightedIds(affectedIds);
      setTimeout(() => setHighlightedIds([]), 3500);
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
  
  const facturables = topLevelItems.filter(item => !(item.es_insumo ?? false));
  const insumos = topLevelItems.filter(item => (item.es_insumo ?? false));

  const totalesFacturables = facturables.reduce(
    (acc, item) => ({
      costo: acc.costo + (item.costo * item.cantidad),
      ganancia: acc.ganancia + (item.ganancia * item.cantidad),
      valor_neto: acc.valor_neto + (item.valor_neto * item.cantidad),
      iva: acc.iva + (item.iva * item.cantidad),
      valor_total: acc.valor_total + (item.valor_total * item.cantidad),
    }),
    { costo: 0, ganancia: 0, valor_neto: 0, iva: 0, valor_total: 0 }
  );

  const totalesInsumos = insumos.reduce(
    (acc, item) => ({
      costo: acc.costo + (item.costo * item.cantidad),
    }),
    { costo: 0 }
  );

  const costoTotalGlobal = totalesFacturables.costo + totalesInsumos.costo;
  const utilidadNeta = totalesFacturables.ganancia - totalesInsumos.costo;
  const margenReal = costoTotalGlobal > 0 ? (utilidadNeta / costoTotalGlobal) * 100 : 0;

  const renderRow = (item: EventItem, index: number, isChild: boolean = false) => {
    const isSelected = selectedIds.includes(item.id!);
    const hasChildren = editableSuggestions.some(s => s.parent_id === item.id);
    const isExpanded = expandedParents.includes(item.id!);

    const isTarget = dragOverParentId === item.id;
    const isDragged = draggedItemId === item.id;
    const isConsolidated = hasChildren || item.tipo_evento?.toLowerCase() === 'consolidado';
    const isHighlighted = highlightedIds.includes(item.id!);

    return (
      <TableRow 
        key={item.id} 
        draggable={!isChild}
        onDragStart={(e) => {
          if (isChild) return;
          setDraggedItemId(item.id!);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData('text/plain', item.id!);
        }}
        onDragOver={(e) => {
          if (draggedItemId && draggedItemId !== item.id && !isChild) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverParentId !== item.id) {
              setDragOverParentId(item.id!);
            }
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverParentId === item.id) setDragOverParentId(null);
          }
        }}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDragOverParentId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverParentId(null);
          if (draggedItemId && draggedItemId !== item.id) {
            handleDropItem(draggedItemId, item.id!);
          }
          setDraggedItemId(null);
        }}
        className={`transition-all ${
          isChild ? 'bg-muted/10 border-l-4 border-l-primary/30' : ''
        } ${
          isDragged ? 'opacity-30 border-dashed border-primary/50 bg-primary/5 scale-[0.99]' : ''
        } ${
          isTarget
            ? isConsolidated
              ? 'ring-2 ring-indigo-500 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-lg scale-[1.008] z-20 relative'
              : 'ring-2 ring-blue-500 bg-blue-50/80 dark:bg-blue-950/60 shadow-lg scale-[1.008] z-20 relative'
            : ''
        } ${
          isHighlighted ? 'bg-violet-100/50 dark:bg-violet-900/30 animate-pulse ring-2 ring-violet-500 shadow-md relative z-10' : ''
        }`}
      >
        {!isChild ? (
          <TableCell className="p-2 text-center w-[50px]">
            <div className="flex items-center justify-center gap-1">
              <span 
                className="cursor-grab active:cursor-grabbing p-0.5 text-muted-foreground/40 hover:text-foreground transition-colors rounded hover:bg-muted/60"
                title="Arrastrar para consolidar con otro ítem"
              >
                <GripVertical className="h-3.5 w-3.5" />
              </span>
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={() => toggleSelect(item.id!)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            </div>
          </TableCell>
        ) : (
          <TableCell className="w-[10px]"></TableCell>
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
            
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2">
                <Input
                  value={item.servicio}
                  onChange={(e) => handleInputChange(item.id!, 'servicio', e.target.value)}
                  onBlur={(e) => handleBlur(item.id!, e)}
                  className={`h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all ${!isChild ? 'font-semibold' : 'font-medium text-muted-foreground'}`}
                  readOnly={hasChildren && !isExpanded} 
                />
                {isTarget && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs inline-flex items-center gap-1 animate-pulse shrink-0 whitespace-nowrap">
                    <Combine className="h-3 w-3" />
                    {isConsolidated ? `Sumar a ${item.servicio}` : `Consolidar con ${item.servicio}`}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-1 px-1">
                {item.source_item_id && (
                  <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium" title="Fracción asignada desde una compra facturada">
                    De Compra Facturada
                  </span>
                )}
                {!isChild && item.cantidad_original && item.cantidad_original > item.cantidad && (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium" title="Cantidad restante disponible tras asignaciones a recetas">
                    Quedan {item.cantidad} de {item.cantidad_original}
                  </span>
                )}
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell className="p-2">
          <Input
            value={item.detalle || ''}
            onChange={(e) => handleInputChange(item.id!, 'detalle', e.target.value)}
            onBlur={(e) => handleBlur(item.id!, e)}
            className="h-8 text-sm w-full bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-all"
          />
        </TableCell>
        <TableCell className="p-2 align-middle text-center">
          <button
            type="button"
            onClick={() => handleInputChange(item.id!, 'es_insumo', !(item.es_insumo ?? false), true)}
            className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer border font-bold uppercase tracking-wider transition-colors ${
              (item.es_insumo ?? false)
                ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'
            }`}
            title="¿Es un insumo (solo costo) o un producto de venta (con ganancia)?"
            disabled={hasChildren}
          >
            {(item.es_insumo ?? false) ? 'INSUMO' : 'VENTA'}
          </button>
        </TableCell>
        <TableCell className="p-2 border-r">
          <div className="flex items-center gap-1.5 justify-center">
            <div className="relative">
              <Input
                type="number"
                value={item.cantidad}
                onChange={(e) => handleInputChange(item.id!, 'cantidad', e.target.value)}
                onBlur={(e) => handleBlur(item.id!, e)}
                className="h-8 w-14 text-center px-1 text-sm font-bold bg-background shadow-2xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                min="1"
                title={hasChildren ? "Rendimiento / Unidades a la venta" : "Cantidad"}
              />
              {hasChildren && (
                <span className="block text-[9px] text-primary/80 font-semibold text-center whitespace-nowrap mt-0.5">
                  A la venta
                </span>
              )}
            </div>
            {!isChild && !hasChildren && (item.cantidad || 0) > 1 && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 gap-1 shrink-0 shadow-2xs"
                onClick={() => handleOpenDistribute(item)}
                title="Derivar / Distribuir unidades a consolidados (recetas)"
              >
                <GitFork className="h-3 w-3" />
                <span className="hidden xl:inline">Derivar</span>
              </Button>
            )}
          </div>
        </TableCell>
        
        {/* EGRESOS */}
        <TableCell className="p-2 bg-red-50/30">
          <div className="flex flex-col gap-1 w-full">
            <Input
              type="number"
              value={item.costo}
              onChange={(e) => handleInputChange(item.id!, 'costo', e.target.value)}
              onBlur={(e) => handleBlur(item.id!, e)}
              className="h-8 text-sm w-full px-2"
              disabled={hasChildren} 
              title={hasChildren ? "Costo unitario resultante (Total insumos ÷ Unidades a la venta)" : "Costo unitario"}
            />
            {hasChildren && (
              <span className="text-[10px] text-red-700 font-semibold text-center whitespace-nowrap" title="Costo total de insumos consolidados">
                Total: {formatCLP(item.costo * item.cantidad)}
              </span>
            )}
            <div className="flex items-center gap-1 w-full">
              <button
                type="button"
                onClick={() => handleInputChange(item.id!, 'tipo_doc_costo', item.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta', true)}
                className={`flex-1 text-[9px] px-1.5 py-0.5 rounded cursor-pointer border font-bold uppercase tracking-wider text-center transition-colors ${
                  item.tipo_doc_costo === 'boleta'
                    ? 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 shadow-2xs'
                    : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 shadow-2xs'
                }`}
                title="Clic para alternar entre Factura y Boleta"
              >
                {item.tipo_doc_costo || 'factura'}
              </button>
              {(item.tipo_doc_costo || 'factura') === 'factura' ? (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap cursor-default"
                  title="Factura con IVA compra incluido en el costo. Desglosado automáticamente a neto."
                >
                  IVA inc.
                </span>
              ) : (
                <span
                  className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 whitespace-nowrap cursor-default"
                  title="Boleta sin crédito fiscal de IVA. Se recarga el 19% al total final."
                >
                  +19% total
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="p-2 align-top text-right text-xs font-medium text-red-900/70 bg-red-50/30">
          {(() => {
             const fin = calculateFinancials(item.costo, item.ganancia, item.tipo_doc_costo || 'factura', item.iva_incluido ?? true);
             return formatCLP(fin.ivaCredito * item.cantidad);
          })()}
        </TableCell>
        <TableCell className="p-2 align-top text-right font-bold text-red-700 bg-red-50/30 border-r">{formatCLP(item.costo * item.cantidad)}</TableCell>

        {/* INGRESOS */}
        {(item.es_insumo ?? false) ? (
          <TableCell colSpan={6} className="p-2 align-middle text-center bg-muted/30 border-r">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted/50 px-3 py-1 rounded">
              Costo Interno (Insumo) - Sin Venta Directa
            </span>
          </TableCell>
        ) : (
          <>
            <TableCell className="p-2 align-top bg-emerald-50/30">
              <div className="flex flex-col gap-1 w-full">
                <Input
                  type="number"
                  value={item.ganancia}
                  onChange={(e) => handleInputChange(item.id!, 'ganancia', e.target.value)}
                  onBlur={(e) => handleBlur(item.id!, e)}
                  className="h-8 text-sm w-full px-2"
                   
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
            <TableCell className="p-2 align-top text-xs font-medium bg-emerald-50/30 text-emerald-900/80">{formatCLP(item.valor_neto)}</TableCell>
            <TableCell className="p-2 align-top text-center bg-emerald-50/30">
              <button
                type="button"
                onClick={() => handleInputChange(item.id!, 'iva_incluido', !(item.iva_incluido ?? true), true)}
                className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer border font-bold uppercase tracking-wider text-center transition-colors ${
                  (item.iva_incluido ?? true)
                    ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                    : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                }`}
                title="¿Este ítem incluye recargo de IVA Débito al cliente?"
              >
                {(item.iva_incluido ?? true) ? 'CON IVA' : 'SIN IVA'}
              </button>
            </TableCell>
            <TableCell className={`p-2 text-xs bg-emerald-50/30 ${isChild ? 'text-emerald-900/60' : 'text-emerald-900/80'}`}>{formatCLP(item.iva * item.cantidad)}</TableCell>
            <TableCell className="p-2 align-top font-semibold bg-emerald-50/30">
              <Input
                type="number"
                value={item.valor_total || ''}
                onChange={(e) => handleInputChange(item.id!, 'valor_total', e.target.value)}
                onBlur={(e) => handleBlur(item.id!, e)}
                className="h-8 text-sm w-full px-2 font-semibold border-emerald-200 focus:border-emerald-500"
              />
            </TableCell>
            <TableCell className="p-2 align-top text-right font-bold text-emerald-700 bg-emerald-50/30 border-r">{formatCLP(item.valor_total * item.cantidad)}</TableCell>
          </>
        )}
        
        {/* RESUMEN Y ACCIONES */}
        <TableCell className="p-2 align-top text-center text-xs font-semibold text-muted-foreground">{formatPercentage(item.margen)}</TableCell>
        <TableCell className="p-2 align-top text-center">
          <div className="flex items-center justify-center gap-1.5">
            {!isChild && hasChildren && (
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 bg-orange-50 text-orange-600 hover:bg-orange-100 hover:text-orange-700 border-orange-200 transition-all shadow-2xs"
                onClick={() => handleUngroup(item.id!)}
                disabled={loadingId === item.id || approvingAll}
                title="Desagrupar y separar ítems"
              >
                <Split className="h-4 w-4" />
              </Button>
            )}
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
          {hasRetailSales && selectedIds.length >= 2 && (
            <Button
              size="sm"
              onClick={handleConsolidateClick}
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
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-0">
              <TableHead colSpan={5} className="text-center font-bold text-muted-foreground border-r">INFORMACIÓN DEL ÍTEM</TableHead>
              <TableHead colSpan={3} className="text-center font-bold text-red-700 bg-red-50/50 border-r">EGRESOS (COSTOS EMPRESA)</TableHead>
              <TableHead colSpan={6} className="text-center font-bold text-emerald-700 bg-emerald-50/50 border-r">INGRESOS (VENTA CLIENTE)</TableHead>
              <TableHead colSpan={2} className="text-center font-bold text-muted-foreground">RESUMEN</TableHead>
            </TableRow>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="min-w-[280px] text-xs font-bold uppercase tracking-wider">Servicio / Insumo</TableHead>
              <TableHead className="min-w-[180px] text-xs font-bold uppercase tracking-wider">Detalle</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider text-center">Tipo</TableHead>
              <TableHead className="w-[135px] min-w-[135px] text-xs font-bold uppercase tracking-wider text-center border-r">Cant.</TableHead>
              
              <TableHead className="w-[120px] text-xs font-bold uppercase tracking-wider bg-red-50/20 text-red-900/80">Costo Unit.</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-red-50/20 text-red-900/80">IVA Crédito</TableHead>
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider text-right bg-red-50/20 border-r text-red-900/80">Total Costos</TableHead>
              
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">Ganancia Unit.</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">V. Neto</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80 text-center">Facturable?</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">IVA Débito</TableHead>
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">V. Total Unit.</TableHead>
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider text-right bg-emerald-50/20 border-r text-emerald-900/80">Total Venta</TableHead>
              
              <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-center">Margen</TableHead>
              <TableHead className="w-[100px] text-center text-xs font-bold uppercase tracking-wider">Acciones</TableHead>
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
                  placeholder="Detalle o especificación..."
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
              {hasRetailSales && (
                <TableCell className="p-2 align-middle text-center">
                  <button
                    type="button"
                    onClick={() => handleInputChange('manual', 'es_insumo', !(manualItem.es_insumo ?? false))}
                    className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer border font-bold uppercase tracking-wider transition-colors ${
                      (manualItem.es_insumo ?? false)
                        ? 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200'
                        : 'bg-indigo-100 text-indigo-800 border-indigo-200 hover:bg-indigo-200'
                    }`}
                    title="¿Es un insumo (solo costo) o un producto de venta (con ganancia)?"
                  >
                    {(manualItem.es_insumo ?? false) ? 'INSUMO' : 'VENTA'}
                  </button>
                </TableCell>
              )}
              <TableCell className="p-2 border-r">
                <Input
                  type="number"
                  value={manualItem.cantidad || ''}
                  onChange={(e) => handleInputChange('manual', 'cantidad', e.target.value)}
                  onBlur={(e) => handleBlur('manual', e)}
                  className="h-8 text-sm w-full text-center px-1 bg-background/90"
                  min="1"
                />
              </TableCell>
              
              {/* EGRESOS MANUAL */}
              <TableCell className="p-2 bg-red-50/30">
                <div className="flex flex-col gap-1 w-full">
                  <Input
                    type="number"
                    placeholder="0"
                    value={manualItem.costo || ''}
                    onChange={(e) => handleInputChange('manual', 'costo', e.target.value)}
                    onBlur={(e) => handleBlur('manual', e)}
                    className="h-8 text-sm w-full px-2 bg-background/90"
                  />
                  <div className="flex items-center gap-1 w-full">
                    <button
                      type="button"
                      onClick={() => handleInputChange('manual', 'tipo_doc_costo', manualItem.tipo_doc_costo === 'boleta' ? 'factura' : 'boleta')}
                      className={`flex-1 text-[9px] px-1.5 py-0.5 rounded cursor-pointer border font-bold uppercase tracking-wider text-center transition-colors ${
                        manualItem.tipo_doc_costo === 'boleta'
                          ? 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 shadow-2xs'
                          : 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 shadow-2xs'
                      }`}
                      title="Clic para alternar entre Factura y Boleta"
                    >
                      {manualItem.tipo_doc_costo || 'factura'}
                    </button>
                    {(manualItem.tipo_doc_costo || 'factura') === 'factura' ? (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap cursor-default"
                        title="Factura con IVA compra incluido en el costo. Desglosado automáticamente a neto."
                      >
                        IVA inc.
                      </span>
                    ) : (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 whitespace-nowrap cursor-default"
                        title="Boleta sin crédito fiscal de IVA. Se recarga el 19% al total final."
                      >
                        +19% total
                      </span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell className="p-2 align-top text-right text-xs font-medium text-red-900/70 bg-red-50/30">
                {(() => {
                  const fin = calculateFinancials(manualItem.costo, manualItem.ganancia, manualItem.tipo_doc_costo || 'factura', manualItem.iva_incluido ?? true);
                  return formatCLP(fin.ivaCredito);
                })()}
              </TableCell>
              <TableCell className="p-2 align-top text-right font-bold text-red-700 bg-red-50/30 border-r">{formatCLP(manualItem.costo * manualItem.cantidad)}</TableCell>

              {/* INGRESOS MANUAL */}
              {(manualItem.es_insumo ?? false) ? (
                <TableCell colSpan={6} className="p-2 align-middle text-center bg-muted/30 border-r">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted/50 px-3 py-1 rounded">
                    Costo Interno (Insumo)
                  </span>
                </TableCell>
              ) : (
                <>
                  <TableCell className="p-2 align-top bg-emerald-50/30">
                    <div className="flex flex-col gap-1 w-full">
                      <Input
                        type="number"
                        placeholder="0"
                        value={manualItem.ganancia || ''}
                        onChange={(e) => handleInputChange('manual', 'ganancia', e.target.value)}
                        onBlur={(e) => handleBlur('manual', e)}
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
                  <TableCell className="p-2 align-top text-xs font-medium bg-emerald-50/30 text-emerald-900/80">{formatCLP(manualItem.valor_neto)}</TableCell>
                  <TableCell className="p-2 align-top text-center bg-emerald-50/30">
                    <button
                      type="button"
                      onClick={() => handleInputChange('manual', 'iva_incluido', !(manualItem.iva_incluido ?? true))}
                      className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer border font-bold uppercase tracking-wider text-center transition-colors ${
                        (manualItem.iva_incluido ?? true)
                          ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200'
                          : 'bg-zinc-100 text-zinc-500 border-zinc-200 hover:bg-zinc-200'
                      }`}
                      title="¿Este ítem incluye recargo de IVA Débito al cliente?"
                    >
                      {(manualItem.iva_incluido ?? true) ? 'CON IVA' : 'SIN IVA'}
                    </button>
                  </TableCell>
                  <TableCell className="p-2 align-top text-xs font-medium bg-emerald-50/30 text-emerald-900/80">{formatCLP(manualItem.iva)}</TableCell>
                  <TableCell className="p-2 align-top font-semibold text-emerald-700 bg-emerald-50/30">
                    <Input
                      type="number"
                      placeholder="0"
                      value={manualItem.valor_total || ''}
                      onChange={(e) => handleInputChange('manual', 'valor_total', e.target.value)}
                      onBlur={(e) => handleBlur('manual', e)}
                      className="h-8 text-sm w-full px-2 font-semibold bg-background/90 border-emerald-200 focus:border-emerald-500"
                    />
                  </TableCell>
                  <TableCell className="p-2 align-top text-right font-bold text-emerald-700 bg-emerald-50/30 border-r">{formatCLP(manualItem.valor_total * manualItem.cantidad)}</TableCell>
                </>
              )}
              
              {/* RESUMEN Y ACCIONES MANUAL */}
              <TableCell className="p-2 align-top text-center text-xs font-semibold text-muted-foreground">{formatPercentage(manualItem.margen)}</TableCell>
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
                <TableCell colSpan={13} className="py-12 text-center text-muted-foreground">
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
              {/* Fila 1: Productos Facturables */}
              <TableRow className="bg-emerald-50/10 font-semibold border-b">
                <TableCell colSpan={hasRetailSales ? 5 : 4} className="font-bold text-right border-r text-emerald-900/80">(+) Total Productos Facturables:</TableCell>
                <TableCell className="bg-red-50/20"></TableCell>
                <TableCell className="bg-red-50/20"></TableCell>
                <TableCell className="bg-red-50/20 border-r text-right text-red-700">{formatCLP(totalesFacturables.costo)}</TableCell>
                
                <TableCell className="bg-emerald-50/20 text-emerald-900/80">{formatCLP(totalesFacturables.ganancia)}</TableCell>
                <TableCell className="bg-emerald-50/20 text-emerald-900/80">{formatCLP(totalesFacturables.valor_neto)}</TableCell>
                <TableCell className="bg-emerald-50/20"></TableCell>
                <TableCell className="bg-emerald-50/20 text-emerald-900/80">{formatCLP(totalesFacturables.iva)}</TableCell>
                <TableCell className="bg-emerald-50/20 text-emerald-900/80"></TableCell>
                <TableCell className="bg-emerald-50/20 border-r text-right font-bold text-emerald-700">{formatCLP(totalesFacturables.valor_total)}</TableCell>
                
                <TableCell colSpan={2}></TableCell>
              </TableRow>
              
              {/* Fila 2: Insumos / Costos Operativos */}
              {totalesInsumos.costo > 0 && (
                <TableRow className="bg-red-50/10 font-semibold border-b">
                  <TableCell colSpan={hasRetailSales ? 5 : 4} className="font-bold text-right border-r text-red-900/80">(-) Total Insumos y Operación:</TableCell>
                  <TableCell className="bg-red-50/20"></TableCell>
                  <TableCell className="bg-red-50/20"></TableCell>
                  <TableCell className="bg-red-50/20 border-r text-right font-bold text-red-700">{formatCLP(totalesInsumos.costo)}</TableCell>
                  
                  <TableCell colSpan={6} className="bg-muted/20 border-r text-center text-xs text-muted-foreground italic">
                    Costos hundidos que merman la utilidad final
                  </TableCell>
                  <TableCell colSpan={2}></TableCell>
                </TableRow>
              )}

              {/* Fila 3: Gran Total / Utilidad Neta */}
              <TableRow className="bg-muted/80 font-bold border-t-2 border-black/20">
                <TableCell colSpan={hasRetailSales ? 5 : 4} className="text-right border-r uppercase tracking-wider">RESUMEN GLOBAL (Rentabilidad Real):</TableCell>
                <TableCell className="bg-red-50/40"></TableCell>
                <TableCell className="bg-red-50/40"></TableCell>
                <TableCell className="bg-red-50/40 border-r text-right text-red-800 text-base">{formatCLP(costoTotalGlobal)}</TableCell>
                
                <TableCell colSpan={5} className="bg-emerald-50/40 text-right text-emerald-900 pr-4">
                  Utilidad Neta (Ingresos - TODOS los Costos): 
                  <span className={`ml-2 text-base ${utilidadNeta >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {formatCLP(utilidadNeta)}
                  </span>
                </TableCell>
                <TableCell className="bg-emerald-50/40 border-r text-right font-black text-emerald-800 text-lg">
                  {formatCLP(totalesFacturables.valor_total)}
                </TableCell>
                
                <TableCell className="text-center font-black text-primary text-base border-r">{formatPercentage(margenReal)}</TableCell>
                <TableCell colSpan={1}></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <ConsolidateDialog
        open={consolidateOpen}
        onOpenChange={(isOpen) => {
          setConsolidateOpen(isOpen);
          if (!isOpen) setConsolidationName('');
        }}
        selectedItems={editableSuggestions.filter(s => selectedIds.includes(s.id!))}
        initialName={consolidationName}
        onConsolidate={handlePerformConsolidate}
      />

      <DistributeInsumoDialog
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        sourceItem={distributeItem}
        consolidatedItems={editableSuggestions.filter(item => !item.parent_id && (item.tipo_evento?.toLowerCase() === 'consolidado' || editableSuggestions.some(c => c.parent_id === item.id)))}
        onDistribute={handlePerformDistribute}
      />

      {/* Barra flotante para consolidación rápida y directa */}
      {selectedIds.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 rounded-2xl bg-card/95 backdrop-blur-xl border border-primary/40 shadow-2xl shadow-black/30 animate-in slide-in-from-bottom-5 duration-300 ring-1 ring-primary/20">
          <div className="flex items-center gap-2 pl-1 pr-2 border-r border-border/60 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-xs shadow-2xs">
              {selectedIds.length}
            </div>
            <div className="hidden sm:block">
              <span className="text-xs font-bold text-foreground block leading-tight">Ítems elegidos</span>
              <span className="text-[10px] text-muted-foreground block leading-tight">Para consolidar</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Nombre del consolidado (ej. Piscolas)..."
              value={consolidationName}
              onChange={(e) => setConsolidationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleConsolidateClick();
                }
              }}
              className="h-9 w-44 sm:w-64 bg-background/90 text-xs sm:text-sm font-medium rounded-xl border-border/80 focus-visible:ring-primary/40 shadow-2xs"
              autoFocus
            />

            <Button
              type="button"
              size="sm"
              onClick={handleConsolidateClick}
              className="h-9 px-3.5 sm:px-4 text-xs sm:text-sm font-bold gap-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shrink-0 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Combine className="h-4 w-4" />
              <span>Consolidar</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedIds([]);
                setConsolidationName('');
              }}
              className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-xl shrink-0"
              title="Deseleccionar todos"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <FloatingDraftAssistant 
        draftItems={editableSuggestions} 
        onApplyActions={handleAssistantActions} 
      />
    </div>
  );
}
