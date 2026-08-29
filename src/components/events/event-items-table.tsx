'use client';

import { useState } from 'react';
import { EventItem } from '@/types';
import { formatCLP, formatPercentage } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Trash2, Loader2, FileUp, ExternalLink } from 'lucide-react';
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
  isCompleted?: boolean;
}

export function EventItemsTable({ items, onItemDeleted, isCompleted }: EventItemsTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const supabase = createClient();

  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from('event_items').delete().eq('id', id);
      if (error) throw error;
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
      
      if (onItemDeleted) onItemDeleted(); // Refresh items
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Error al subir la factura. Asegúrate de haber ejecutado el script SQL.');
    } finally {
      setUploadingId(null);
    }
  };

  if (!items || items.length === 0) {
    return (
      <div className="p-8 text-center border rounded-md bg-muted/20">
        <p className="text-muted-foreground">No hay ítems aprobados para este evento.</p>
      </div>
    );
  }

  const totals = items.reduce(
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
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
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
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.servicio}</TableCell>
              <TableCell className="text-muted-foreground text-sm">{item.detalle}</TableCell>
              <TableCell>{item.tipo_evento}</TableCell>
              <TableCell>{item.cantidad}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1">
                  {formatCLP(item.costo)}
                  <span className={`text-[10px] px-1 py-0.5 rounded border font-medium uppercase tracking-wider text-center w-max ${item.tipo_doc_costo === 'boleta' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                    {item.tipo_doc_costo || 'factura'}
                  </span>
                </div>
              </TableCell>
              <TableCell>{formatCLP(item.ganancia)}</TableCell>
              <TableCell>{formatCLP(item.valor_total)}</TableCell>
              <TableCell>{formatPercentage(item.margen)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCLP(item.valor_total * item.cantidad)}</TableCell>
              <TableCell className="text-center">
                {item.tipo_doc_costo === 'factura' && (
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
                  >
                    {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4} className="font-bold">Totales Globales</TableCell>
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
  );
}
