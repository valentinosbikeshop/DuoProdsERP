'use client';

import React, { useState } from 'react';
import { EventItem } from '@/types';
import { formatCLP, formatPercentage, calculateFinancials } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Loader2, FileUp, ExternalLink, ChevronDown, ChevronRight, Combine } from 'lucide-react';
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
}

export function EventItemsTable({ items, onItemDeleted, eventId, isCompleted }: EventItemsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedParents, setExpandedParents] = useState<string[]>([]);
  const [localItems, setLocalItems] = useState<EventItem[]>(items);
  const supabase = createClient();

  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const handleQuantityChange = (id: string, newQty: string) => {
    const qty = parseInt(newQty) || 0;
    setLocalItems(prev => prev.map(item => item.id === id ? { ...item, cantidad: qty } : item));
  };

  const handleQuantityBlur = async (id: string) => {
    const item = localItems.find(i => i.id === id);
    if (!item) return;
    try {
      const { error } = await (supabase.from('event_items') as any)
        .update({ cantidad: item.cantidad })
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

  const handleConsolidate = async () => {
    if (selectedIds.length < 2) return;
    
    const name = window.prompt("Ingresa el nombre del producto consolidado (Ej: Piscolas (100 un)):");
    if (!name || !name.trim()) return;

    const selectedItems = localItems.filter(s => selectedIds.includes(s.id!));
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
      if (onItemDeleted) onItemDeleted(); // Refresh items
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

  if (!localItems || localItems.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No hay ítems aprobados para este evento.</p>
      </div>
    );
  }

  const topLevelItems = localItems.filter(item => !item.parent_id);

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

  const renderRow = (item: EventItem, isChild: boolean = false) => {
    const isSelected = selectedIds.includes(item.id!);
    const hasChildren = localItems.some(s => s.parent_id === item.id);
    const isExpanded = expandedParents.includes(item.id!);

    return (
      <TableRow key={item.id} className={`${isChild ? 'bg-muted/10 border-l-4 border-l-primary/30' : ''}`}>
        {!isCompleted ? (
          <TableCell className="w-[40px] text-center">
            {!isChild && (
              <input 
                type="checkbox" 
                checked={isSelected} 
                onChange={() => toggleSelect(item.id!)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
              />
            )}
          </TableCell>
        ) : (
          <TableCell className="w-[10px]"></TableCell>
        )}
        
        <TableCell className="font-medium">
          <div className="flex items-center gap-2">
            {!isChild && hasChildren && (
              <button onClick={() => toggleExpand(item.id!)} className="p-0.5 hover:bg-muted rounded text-muted-foreground flex-shrink-0">
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            )}
            {!hasChildren && !isChild && <span className="w-5 flex-shrink-0" />}
            {isChild && <div className="w-4 h-px bg-border ml-2 mr-1 flex-shrink-0"></div>}
            
            <span className={isChild ? 'text-muted-foreground font-normal' : ''}>{item.servicio}</span>
          </div>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm">{item.detalle}</TableCell>
        <TableCell>{item.tipo_evento}</TableCell>
        <TableCell>
          {isCompleted ? (
            item.cantidad
          ) : (
            <Input
              type="number"
              value={item.cantidad || ''}
              onChange={(e) => handleQuantityChange(item.id!, e.target.value)}
              onBlur={() => handleQuantityBlur(item.id!)}
              className="h-8 w-16 text-center px-1"
              min="1"
            />
          )}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            {formatCLP(item.costo)}
            <span className={`text-[10px] px-1 py-0.5 rounded border font-medium uppercase tracking-wider text-center w-max ${item.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
              {item.tipo_doc_costo || 'factura'}
            </span>
          </div>
        </TableCell>
        <TableCell className={isChild ? 'text-muted-foreground/60' : ''}>{formatCLP(item.ganancia)}</TableCell>
        <TableCell className={isChild ? 'text-muted-foreground/60' : ''}>{formatCLP(item.valor_total)}</TableCell>
        <TableCell className={isChild ? 'text-muted-foreground/60' : ''}>{formatPercentage(item.margen)}</TableCell>
        <TableCell className={`text-right font-semibold ${isChild ? 'text-muted-foreground/60' : ''}`}>{formatCLP(item.valor_total * item.cantidad)}</TableCell>
        <TableCell className="text-center">
          {item.tipo_doc_costo === 'factura' && !isChild && (
            item.factura_url ? (
              <a href={item.factura_url} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-muted text-blue-600">
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : (
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
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => document.getElementById(`file-${item.id}`)?.click()}
                  disabled={uploadingId === item.id || isCompleted}
                >
                  {uploadingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                </Button>
              </div>
            )
          )}
        </TableCell>
        {!isCompleted && (
          <TableCell>
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
      {!isCompleted && selectedIds.length >= 2 && (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={handleConsolidate}
            className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white shadow-xs animate-in fade-in zoom-in"
          >
            <Combine className="h-3.5 w-3.5" />
            Consolidar {selectedIds.length} ítems
          </Button>
        </div>
      )}
      
      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Servicio</TableHead>
              <TableHead>Detalle</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cant.</TableHead>
              <TableHead>Costo Unit.</TableHead>
              <TableHead>Ganancia Unit.</TableHead>
              <TableHead>V. Total Unit.</TableHead>
              <TableHead>Margen</TableHead>
              <TableHead className="text-right">Subtotal Fila</TableHead>
              <TableHead className="w-[100px] text-center">Documento</TableHead>
              {!isCompleted && <TableHead className="w-[80px]">Acciones</TableHead>}
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
            <TableRow>
              <TableCell colSpan={5} className="font-bold">Totales Globales</TableCell>
              <TableCell>{formatCLP(totals.costo)}</TableCell>
              <TableCell>{formatCLP(totals.ganancia)}</TableCell>
              <TableCell colSpan={2}></TableCell>
              <TableCell className="text-right font-bold text-primary text-lg">{formatCLP(totals.valor_total)}</TableCell>
              <TableCell></TableCell>
              {!isCompleted && <TableCell></TableCell>}
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
