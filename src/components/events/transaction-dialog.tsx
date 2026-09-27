'use client';

import { useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trash2, AlertTriangle, Calendar as CalendarIcon, FileText } from 'lucide-react';
import { EventItem } from '@/types';
import { createClient } from '@/lib/supabase/client';

type TransactionDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  type: 'ABONO' | 'GASTO';
  transactionToEdit?: EventItem;
  onSaved: () => void;
};

export function TransactionDialog({ isOpen, onOpenChange, eventId, type, transactionToEdit, onSaved }: TransactionDialogProps) {
  const [monto, setMonto] = useState<string>(
    transactionToEdit ? transactionToEdit.valor_total.toString() : ''
  );
  const [fecha, setFecha] = useState<string>(
    transactionToEdit?.detalle?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString().split('T')[0]
  );
  const [descripcion, setDescripcion] = useState<string>(
    transactionToEdit?.detalle?.replace(/\d{4}-\d{2}-\d{2}/, '').trim() || ''
  );
  const [isFactura, setIsFactura] = useState<boolean>(
    transactionToEdit?.tipo_doc_costo === 'factura'
  );
  const [loading, setLoading] = useState(false);
  
  // States for delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);

  const isGasto = type === 'GASTO';

  const resetForm = () => {
    setMonto('');
    setDescripcion('');
    setFecha(new Date().toISOString().split('T')[0]);
    setIsFactura(false);
    setDeleteStep(0);
    setIsDeleting(false);
  };

  const handleSave = async () => {
    const parsedMonto = parseInt(monto.replace(/\D/g, ''));
    if (!parsedMonto || isNaN(parsedMonto)) {
      alert('Debes ingresar un monto válido.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const fullDetail = `${fecha} | ${descripcion}`.trim();
    const isFacturaDoc = isGasto ? isFactura : false;

    const transactionData = {
      event_id: eventId,
      servicio: isGasto ? (isFacturaDoc ? "Factura de Proveedor" : "Boleta de Proveedor") : "Abono de Cliente",
      detalle: fullDetail,
      tipo_evento: isGasto ? "GASTO_REAL" : "ABONO_CLIENTE",
      cantidad: 1,
      costo: isGasto ? parsedMonto : 0,
      ganancia: isGasto ? 0 : parsedMonto,
      valor_neto: isFacturaDoc ? Math.round(parsedMonto / 1.19) : parsedMonto,
      iva: isFacturaDoc ? Math.round(parsedMonto - (parsedMonto / 1.19)) : 0,
      valor_total: parsedMonto,
      margen: isGasto ? 0 : 100,
      tipo_doc_costo: isGasto ? (isFacturaDoc ? 'factura' : 'boleta') : undefined,
      approved: true,
    };

    try {
      if (transactionToEdit) {
        const { error } = await supabase.from('event_items').update(transactionData).eq('id', transactionToEdit.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from('event_items') as any).insert([transactionData]);
        if (error) throw error;
      }
      onSaved();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error(error);
      alert('Hubo un error al guardar la transacción.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }

    // Double confirmation passed (step 2)
    if (!transactionToEdit) return;
    
    setIsDeleting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.from('event_items').delete().eq('id', transactionToEdit.id);
      if (error) throw error;
      onSaved();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al eliminar.');
    } finally {
      setIsDeleting(false);
      setDeleteStep(0);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogHeader>
          <DialogTitle>{transactionToEdit ? 'Editar Transacción' : (isGasto ? 'Registrar Gasto Real' : 'Agregar Abono')}</DialogTitle>
          <DialogDescription>
            {isGasto 
              ? 'Ingresa los detalles de la compra o servicio adquirido.' 
              : 'Registra un pago realizado por el cliente.'}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-2">
            <Label>Monto Total ($)</Label>
            <Input 
              type="text" 
              placeholder="Ej. 150000" 
              value={monto} 
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="space-y-2">
            <Label>Fecha</Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                type="date" 
                className="pl-9"
                value={fecha} 
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción / Observación (Opcional)</Label>
            <div className="relative">
              <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Ej. Transferencia Banco, Compra de luces..."
                className="pl-9"
                value={descripcion} 
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>
          </div>

          {isGasto && (
            <div className="flex items-center gap-3 pt-2">
              <input 
                type="checkbox" 
                id="isFactura" 
                className="rounded border-gray-300"
                checked={isFactura}
                onChange={(e) => setIsFactura(e.target.checked)}
              />
              <Label htmlFor="isFactura" className="cursor-pointer font-medium text-sm">
                Es una Factura (Tiene IVA deducible)
              </Label>
            </div>
          )}
        </DialogBody>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center sm:items-end">
          {transactionToEdit ? (
            <div className="w-full sm:w-auto">
              {deleteStep === 0 && (
                <Button variant="ghost" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-full sm:w-auto" onClick={handleDelete}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
              )}
              {deleteStep === 1 && (
                <Button variant="destructive" className="w-full sm:w-auto text-xs" onClick={handleDelete}>
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  ¿Seguro?
                </Button>
              )}
              {deleteStep === 2 && (
                <Button variant="destructive" className="w-full sm:w-auto text-xs font-bold bg-rose-700" onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Eliminación'}
                </Button>
              )}
            </div>
          ) : (
            <div className="w-full sm:w-auto"></div>
          )}
          
          <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || isDeleting}>Cancelar</Button>
            <Button onClick={handleSave} disabled={loading || isDeleting || !monto}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Guardar
            </Button>
          </div>
        </DialogFooter>
    </Dialog>
  );
}
