'use client';

import React, { useState } from 'react';
import { EventItem } from '@/types';
import { formatCLP, formatPercentage, calculateFinancials, calculateGananciaFromTotal } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, FileUp, ExternalLink, ChevronDown, ChevronRight, Combine, Split, GitFork, X, Sparkles, GripVertical } from 'lucide-react';
import { useDragAutoScroll } from '@/hooks/use-drag-auto-scroll';
import { ConsolidateDialog } from './consolidate-dialog';
import { DistributeInsumoDialog } from './distribute-insumo-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from '@/components/ui/table';

interface EventItemsTableProps {
  items: EventItem[];
  onItemDeleted?: () => void;
  eventId: string;
  isCompleted?: boolean;
  hasRetailSales?: boolean;
}

export function EventItemsTable({ items, onItemDeleted, eventId, isCompleted, hasRetailSales = false }: EventItemsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [consolidationName, setConsolidationName] = useState('');
  const [expandedParents, setExpandedParents] = useState<string[]>([]);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [consolidateOpen, setConsolidateOpen] = useState(false);
  const [distributeOpen, setDistributeOpen] = useState(false);
  const [distributeItem, setDistributeItem] = useState<EventItem | null>(null);
  const [localItems, setLocalItems] = useState<EventItem[]>(items);
  const supabase = createClient();

  useDragAutoScroll({ isDragging: !!draggedItemId });

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleQuantityChange = (id: string, newQty: string) => {
    const qty = parseInt(newQty) || 0;
    setLocalItems(prev => {
      const target = prev.find(i => i.id === id);
      if (!target) return prev;

      // If parent item with children, recalculate unit cost dynamically!
      const children = prev.filter(s => s.parent_id === id);
      if (children.length > 0) {
        const totalChildrenCost = children.reduce((acc, c) => acc + (c.costo * c.cantidad), 0);
        const validQty = Math.max(1, qty);
        const newUnitCost = Math.round(totalChildrenCost / validQty);
        const fin = calculateFinancials(newUnitCost, target.ganancia, target.tipo_doc_costo || 'factura', target.iva_incluido ?? true, target.es_insumo ?? false);
        return prev.map(item => item.id === id ? {
          ...item,
          cantidad: qty,
          costo: newUnitCost,
          valor_neto: fin.valorNeto,
          iva: fin.ivaDebito,
          valor_total: fin.valorTotal,
          margen: fin.margen
        } : item);
      }

      return prev.map(item => item.id === id ? { ...item, cantidad: qty } : item);
    });
  };

  const handleQuantityBlur = async (id: string) => {
    const item = localItems.find(i => i.id === id);
    if (!item) return;
    try {
      const { error } = await (supabase.from('event_items') as any)
        .update({
          cantidad: item.cantidad,
          costo: item.costo,
          valor_neto: item.valor_neto,
          iva: item.iva,
          valor_total: item.valor_total,
          margen: item.margen
        })
        .eq('id', id);
      if (error) throw error;
      if (onItemDeleted) onItemDeleted(); // Refresh parent items to update FloatingFinancialAdvisor
    } catch (e) {
      console.error('Error updating quantity:', e);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const childrenIds = items.filter(s => s.parent_id === id).map(s => s.id);
      const idsToRemove = [id, ...childrenIds];
      
      const { error } = await (supabase.from('event_items') as any).delete().in('id', idsToRemove);
      if (error) throw error;
      
      setSelectedIds(prev => prev.filter(selId => !idsToRemove.includes(selId)));
      if (onItemDeleted) onItemDeleted();
    } catch (error) {
      console.error('Error deleting item:', error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleFileUpload = async (id: string, file: File) => {
    setUploadingId(id);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('facturas')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('facturas').getPublicUrl(filePath);
      
      const { error: updateError } = await (supabase.from('event_items') as any)
        .update({ factura_url: data.publicUrl })
        .eq('id', id);

      if (updateError) throw updateError;
      
      if (onItemDeleted) onItemDeleted(); 
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir la factura. Asegúrate de haber ejecutado el script SQL.');
    } finally {
      setUploadingId(null);
    }
  };

  const handleConsolidateClick = () => {
    if (selectedIds.length < 2) return;
    setConsolidateOpen(true);
  };

  const handleDropItem = async (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;

    const draggedItem = localItems.find(s => s.id === draggedId);
    const targetItem = localItems.find(s => s.id === targetId);
    if (!draggedItem || !targetItem) return;

    if (draggedItem.tipo_evento?.toLowerCase() === 'consolidado') {
      alert("No se pueden arrastrar productos consolidados dentro de otros.");
      return;
    }

    const isTargetConsolidated = targetItem.tipo_evento?.toLowerCase() === 'consolidado' || localItems.some(c => c.parent_id === targetId);

    if (isTargetConsolidated) {
      if (draggedItem.parent_id === targetId) return;

      try {
        const { error } = await (supabase.from('event_items') as any)
          .update({ parent_id: targetId, es_insumo: true })
          .eq('id', draggedId);

        if (error) throw error;

        // Recalculate parent's unit cost dynamically
        const targetSiblings = localItems.filter(s => s.parent_id === targetId && s.id !== draggedId);
        const newTotalChildrenCost = targetSiblings.reduce((acc, c) => acc + (c.costo * c.cantidad), 0) + (draggedItem.costo * draggedItem.cantidad);
        const targetQty = Math.max(1, targetItem.cantidad || 1);
        const newTargetUnitCost = Math.round(newTotalChildrenCost / targetQty);

        let targetGanancia = targetItem.ganancia;
        let targetFinancials;
        if (targetItem.valor_total && targetItem.valor_total > 0) {
          const fin = calculateGananciaFromTotal(newTargetUnitCost, targetItem.valor_total, targetItem.tipo_doc_costo || 'factura', targetItem.iva_incluido ?? true, false);
          targetGanancia = fin.ganancia;
          targetFinancials = fin;
        } else {
          targetFinancials = calculateFinancials(newTargetUnitCost, targetItem.ganancia, targetItem.tipo_doc_costo || 'factura', targetItem.iva_incluido ?? true, false);
        }

        await (supabase.from('event_items') as any).update({
          costo: newTargetUnitCost,
          ganancia: targetGanancia,
          valor_neto: targetFinancials.valorNeto,
          iva: targetFinancials.ivaDebito,
          valor_total: targetFinancials.valorTotal,
          margen: targetFinancials.margen,
        }).eq('id', targetId);

        // If dragged item had an old parent, update old parent too
        if (draggedItem.parent_id) {
          const oldParentId = draggedItem.parent_id;
          const oldParent = localItems.find(s => s.id === oldParentId);
          if (oldParent) {
            const oldSiblings = localItems.filter(s => s.parent_id === oldParentId && s.id !== draggedId);
            const oldCost = oldSiblings.reduce((acc, c) => acc + (c.costo * c.cantidad), 0);
            const oldQty = Math.max(1, oldParent.cantidad || 1);
            const oldUnitCost = Math.round(oldCost / oldQty);
            const oldFin = calculateFinancials(oldUnitCost, oldParent.ganancia, oldParent.tipo_doc_costo || 'factura', oldParent.iva_incluido ?? true, false);
            await (supabase.from('event_items') as any).update({
              costo: oldUnitCost,
              valor_neto: oldFin.valorNeto,
              iva: oldFin.ivaDebito,
              valor_total: oldFin.valorTotal,
              margen: oldFin.margen,
            }).eq('id', oldParentId);
          }
        }

        if (onItemDeleted) onItemDeleted();
      } catch (err: any) {
        console.error('Error dropping item:', err);
        alert('Error al consolidar ítem: ' + err.message);
      }
    } else {
      // Target is regular: select both items and open consolidation dialog
      setSelectedIds([draggedId, targetId]);
      setConsolidateOpen(true);
    }
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
      // 1. Process assignments to consolidated parents
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
          approved: true,
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
        const parent = localItems.find(p => p.id === parentId);
        if (parent) {
          const existingChildren = localItems.filter(c => c.parent_id === parentId);
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
          approved: true,
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

      if (onItemDeleted) onItemDeleted();
    } catch (err: any) {
      console.error('Error distributing item:', err);
      alert('Error al derivar el insumo: ' + err.message);
    }
  };

  const handleSplitItem = async (item: EventItem) => {
    if (!item.cantidad || item.cantidad <= 1) return;
    const promptVal = window.prompt(
      `¿Cuántas unidades deseas separar de "${item.servicio}" (disponibles: ${item.cantidad})?\nSe creará una nueva fila con la misma factura vinculada.`,
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
        approved: true,
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

      if (onItemDeleted) onItemDeleted();
    } catch (err: any) {
      console.error('Error splitting item:', err);
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
    const selectedItems = localItems.filter(s => selectedIds.includes(s.id!));
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
      approved: true,
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
            approved: true,
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
      if (onItemDeleted) onItemDeleted(); // Refresh items
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

  if (!localItems || localItems.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No hay ítems aprobados para este evento.</p>
      </div>
    );
  }

  const topLevelItems = localItems.filter(item => !item.parent_id);

  const facturables = topLevelItems.filter(item => !item.es_insumo);
  const insumos = topLevelItems.filter(item => item.es_insumo);

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
  const utilidadNeta = totalesFacturables.ganancia - totalesInsumos.costo; // Assuming ganancia here is basically V.Neto - Costo. Wait, if tipo_doc is boleta, ganancia is total - costo. It matches.
  // Actually Utility = (Facturable Revenue - Facturable Cost) - Sunk Costs
  const margenReal = costoTotalGlobal > 0 ? (utilidadNeta / costoTotalGlobal) * 100 : 0;

  const renderRow = (item: EventItem, isChild: boolean = false) => {
    const isSelected = selectedIds.includes(item.id!);
    const hasChildren = localItems.some(s => s.parent_id === item.id);
    const isExpanded = expandedParents.includes(item.id!);

    const isTarget = dragOverTargetId === item.id;
    const isDragged = draggedItemId === item.id;
    const isConsolidated = hasChildren || item.tipo_evento?.toLowerCase() === 'consolidado';

    return (
      <TableRow 
        key={item.id} 
        draggable={!isCompleted && !isChild}
        onDragStart={(e) => {
          if (isCompleted || isChild) return;
          setDraggedItemId(item.id!);
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData('text/plain', item.id!);
        }}
        onDragOver={(e) => {
          if (draggedItemId && draggedItemId !== item.id && !isChild) {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            if (dragOverTargetId !== item.id) {
              setDragOverTargetId(item.id!);
            }
          }
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            if (dragOverTargetId === item.id) setDragOverTargetId(null);
          }
        }}
        onDragEnd={() => {
          setDraggedItemId(null);
          setDragOverTargetId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverTargetId(null);
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
        }`}
      >
        {!isCompleted ? (
          <TableCell className="w-[50px] text-center p-2">
            {!isChild && (
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
            )}
          </TableCell>
        ) : (
          <TableCell className="w-[10px]"></TableCell>
        )}
        
        <TableCell className="font-medium p-2">
          <div className="flex items-center gap-2">
            {!isChild && hasChildren && (
              <button onClick={() => toggleExpand(item.id!)} className="p-0.5 hover:bg-muted rounded text-muted-foreground flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {!hasChildren && !isChild && <span className="w-5 flex-shrink-0" />}
            {isChild && <div className="w-4 h-px bg-border ml-2 mr-1 flex-shrink-0"></div>}
            
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={isChild ? 'text-muted-foreground font-normal text-sm' : 'text-sm'}>{item.servicio}</span>
              {isTarget && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-xs inline-flex items-center gap-1 animate-pulse shrink-0">
                  <Combine className="h-3 w-3" />
                  {isConsolidated ? `Sumar a ${item.servicio}` : `Consolidar con ${item.servicio}`}
                </span>
              )}
              {item.source_item_id && (
                <span className="text-[10px] text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded font-medium shrink-0" title="Fracción asignada desde una compra facturada">
                  De Compra Facturada
                </span>
              )}
              {!isChild && item.cantidad_original && item.cantidad_original > item.cantidad && (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded font-medium shrink-0" title="Cantidad restante disponible tras asignaciones a recetas">
                  Quedan {item.cantidad} de {item.cantidad_original}
                </span>
              )}
            </div>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-xs p-2">{item.detalle}</TableCell>
        <TableCell className="text-xs p-2">{item.tipo_evento}</TableCell>
        <TableCell className="p-2 border-r">
          {isCompleted ? (
            <span className="text-sm px-2">{item.cantidad}</span>
          ) : (
            <div className="flex items-center gap-1.5 justify-center">
              <div className="relative">
                <Input
                  type="number"
                  value={item.cantidad || ''}
                  onChange={(e) => handleQuantityChange(item.id!, e.target.value)}
                  onBlur={() => handleQuantityBlur(item.id!)}
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
              {!isChild && !hasChildren && (item.cantidad || 0) > 1 && !isCompleted && (
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
          )}
        </TableCell>
        
        {/* EGRESOS */}
        <TableCell className="p-2 bg-red-50/30">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium" title={hasChildren ? "Costo unitario resultante (Total insumos ÷ Cantidad)" : "Costo unitario"}>
              {formatCLP(item.costo)}
            </span>
            {hasChildren && (
              <span className="text-[10px] text-red-700 font-semibold whitespace-nowrap" title="Costo total de insumos consolidados">
                Total: {formatCLP(item.costo * item.cantidad)}
              </span>
            )}
            <span className={`text-[9px] px-1 py-0.5 rounded border font-bold uppercase tracking-wider text-center w-max ${item.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-blue-100 text-blue-800 border-blue-200'}`}>
              {item.tipo_doc_costo || 'factura'}
            </span>
          </div>
        </TableCell>
        <TableCell className={`p-2 text-right text-xs font-medium bg-red-50/30 ${isChild ? 'text-red-900/50' : 'text-red-900/70'}`}>
          {(() => {
             const fin = calculateFinancials(item.costo, item.ganancia, item.tipo_doc_costo || 'factura', item.iva_incluido ?? true);
             return formatCLP(fin.ivaCredito);
          })()}
        </TableCell>
        <TableCell className={`p-2 text-right font-bold bg-red-50/30 border-r ${isChild ? 'text-red-700/60' : 'text-red-700'}`}>{formatCLP(item.costo * item.cantidad)}</TableCell>

        {/* INGRESOS */}
        {(item.es_insumo ?? false) ? (
          <TableCell colSpan={6} className="p-2 align-middle text-center bg-muted/30 border-r">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest bg-muted/50 px-3 py-1 rounded">
              Costo Interno (Insumo)
            </span>
          </TableCell>
        ) : (
          <>
            <TableCell className={`p-2 text-sm bg-emerald-50/30 ${isChild ? 'text-emerald-900/60' : 'text-emerald-900/80 font-medium'}`}>{formatCLP(item.ganancia)}</TableCell>
            <TableCell className={`p-2 text-xs bg-emerald-50/30 ${isChild ? 'text-emerald-900/60' : 'text-emerald-900/80'}`}>{formatCLP(item.valor_neto)}</TableCell>
            <TableCell className="p-2 align-middle text-center bg-emerald-50/30">
               <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider text-center border ${
                   (item.iva_incluido ?? true)
                     ? 'bg-blue-100 text-blue-800 border-blue-200'
                     : 'bg-zinc-100 text-zinc-500 border-zinc-200'
                 }`}>
                 {(item.iva_incluido ?? true) ? 'CON IVA' : 'SIN IVA'}
               </span>
            </TableCell>
            <TableCell className={`p-2 text-xs bg-emerald-50/30 ${isChild ? 'text-emerald-900/60' : 'text-emerald-900/80'}`}>{formatCLP(item.iva)}</TableCell>
            <TableCell className={`p-2 text-sm font-semibold bg-emerald-50/30 ${isChild ? 'text-emerald-900/60' : 'text-emerald-900'}`}>{formatCLP(item.valor_total)}</TableCell>
            <TableCell className={`p-2 text-right font-bold bg-emerald-50/30 border-r ${isChild ? 'text-emerald-700/60' : 'text-emerald-700'}`}>{formatCLP(item.valor_total * item.cantidad)}</TableCell>
          </>
        )}
        
        {/* RESUMEN */}
        <TableCell className={`p-2 text-center text-xs font-semibold ${isChild ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>{formatPercentage(item.margen)}</TableCell>
        <TableCell className="p-2 text-center">
          {item.tipo_doc_costo === 'factura' && (
            item.factura_url ? (
              <a 
                href={item.factura_url} 
                target="_blank" 
                rel="noreferrer" 
                className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-blue-600 border border-blue-100 bg-blue-50"
                title={isChild ? "Ver Factura de la compra vinculada" : "Ver Factura"}
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : !isChild ? (
              <div>
                <input
                  type="file"
                  id={`file-${item.id}`}
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(item.id, e.target.files[0]);
                  }}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 text-muted-foreground hover:text-primary border-dashed"
                  onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                  disabled={uploadingId === item.id || isCompleted}
                  title="Subir Factura"
                >
                  {uploadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                </Button>
              </div>
            ) : null
          )}
        </TableCell>
        {!isCompleted && (
          <TableCell className="p-2 text-center">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => handleDelete(item.id)}
              disabled={deletingId === item.id}
              title={isChild ? "Eliminar insumo" : "Eliminar ítem"}
            >
              {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            </Button>
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <div className="space-y-3">
      {!isCompleted && hasRetailSales && selectedIds.length >= 2 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleConsolidateClick}
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs animate-in fade-in zoom-in"
          >
            <Combine className="h-3.5 w-3.5" />
            Consolidar {selectedIds.length} ítems
          </Button>
        </div>
      )}
      
      <div className="border rounded-md overflow-x-auto shadow-xs bg-card custom-scrollbar">
        <Table className="min-w-[1350px]">
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b-0">
              <TableHead colSpan={hasRetailSales ? 5 : 4} className="text-center font-bold text-muted-foreground border-r">INFORMACIÓN DEL ÍTEM</TableHead>
              <TableHead colSpan={3} className="text-center font-bold text-red-700 bg-red-50/50 border-r">EGRESOS (COSTOS EMPRESA)</TableHead>
              <TableHead colSpan={6} className="text-center font-bold text-emerald-700 bg-emerald-50/50 border-r">INGRESOS (VENTA CLIENTE)</TableHead>
              <TableHead colSpan={isCompleted ? 2 : 3} className="text-center font-bold text-muted-foreground">RESUMEN Y GESTIÓN</TableHead>
            </TableRow>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="min-w-[280px] text-xs font-bold uppercase tracking-wider">Servicio</TableHead>
              <TableHead className="min-w-[180px] text-xs font-bold uppercase tracking-wider">Detalle</TableHead>
              {hasRetailSales && (
                <TableHead className="w-[100px] text-xs font-bold uppercase tracking-wider">Tipo</TableHead>
              )}
              <TableHead className="w-[135px] min-w-[135px] text-xs font-bold uppercase tracking-wider text-center border-r">Cant.</TableHead>
              
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider bg-red-50/20 text-red-900/80">Costo Unit.</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-red-50/20 text-red-900/80">IVA Crédito</TableHead>
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider text-right bg-red-50/20 border-r text-red-900/80">Total Costos</TableHead>
              
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">Ganancia Unit.</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">V. Neto</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80 text-center">Facturable?</TableHead>
              <TableHead className="w-[90px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">IVA Débito</TableHead>
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider bg-emerald-50/20 text-emerald-900/80">V. Total Unit.</TableHead>
              <TableHead className="w-[110px] text-xs font-bold uppercase tracking-wider text-right bg-emerald-50/20 border-r text-emerald-900/80">Total Venta</TableHead>
              
              <TableHead className="w-[80px] text-xs font-bold uppercase tracking-wider text-center">Margen</TableHead>
              <TableHead className="w-[90px] text-center text-xs font-bold uppercase tracking-wider">Documento</TableHead>
              {!isCompleted && <TableHead className="w-[80px] text-center text-xs font-bold uppercase tracking-wider">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {topLevelItems.map((item) => {
              const children = localItems.filter(s => s.parent_id === item.id);
              const isExpanded = expandedParents.includes(item.id!);
              
              return (
                <React.Fragment key={item.id}>
                  {renderRow(item, false)}
                  {isExpanded && children.map(child => renderRow(child, true))}
                </React.Fragment>
              );
            })}
          </TableBody>
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
              
              <TableCell colSpan={isCompleted ? 2 : 3}></TableCell>
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
                <TableCell colSpan={isCompleted ? 2 : 3}></TableCell>
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
              <TableCell colSpan={isCompleted ? 1 : 2}></TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <ConsolidateDialog
        open={consolidateOpen}
        onOpenChange={(isOpen) => {
          setConsolidateOpen(isOpen);
          if (!isOpen) setConsolidationName('');
        }}
        selectedItems={localItems.filter(s => selectedIds.includes(s.id!))}
        initialName={consolidationName}
        onConsolidate={handlePerformConsolidate}
      />

      <DistributeInsumoDialog
        open={distributeOpen}
        onOpenChange={setDistributeOpen}
        sourceItem={distributeItem}
        consolidatedItems={localItems.filter(item => !item.parent_id && (item.tipo_evento?.toLowerCase() === 'consolidado' || localItems.some(c => c.parent_id === item.id)))}
        onDistribute={handlePerformDistribute}
      />

      {/* Barra flotante para consolidación rápida y directa */}
      {!isCompleted && selectedIds.length >= 2 && (
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
    </div>
  );
}
