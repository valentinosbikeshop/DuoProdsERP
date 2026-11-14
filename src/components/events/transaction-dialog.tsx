'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogBody } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Loader2, Trash2, AlertTriangle, Calendar as CalendarIcon, FileText, CreditCard, Receipt, Users } from 'lucide-react';
import { EventItem } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatCLP } from '@/lib/utils';

type ExpenseDocMode = 'factura' | 'honorarios' | 'boleta';

type TransactionDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  type: 'ABONO' | 'GASTO';
  transactionToEdit?: EventItem;
  onSaved: () => void;
};

function inferInitialDocMode(item?: EventItem): ExpenseDocMode {
  if (!item) return 'factura';
  if (item.tipo_doc_costo === 'factura') return 'factura';
  if (
    item.servicio?.toLowerCase().includes('honorarios') ||
    item.detalle?.toLowerCase().includes('honorarios')
  ) {
    return 'honorarios';
  }
  return 'boleta';
}

export function TransactionDialog({
  isOpen,
  onOpenChange,
  eventId,
  type,
  transactionToEdit,
  onSaved,
}: TransactionDialogProps) {
  const [monto, setMonto] = useState<string>(
    transactionToEdit ? transactionToEdit.valor_total.toString() : ''
  );
  const [fecha, setFecha] = useState<string>(
    transactionToEdit?.detalle?.match(/\d{4}-\d{2}-\d{2}/)?.[0] || new Date().toISOString().split('T')[0]
  );
  const [descripcion, setDescripcion] = useState<string>(
    transactionToEdit?.detalle?.replace(/^\d{4}-\d{2}-\d{2}\s*\|\s*/, '').replace(/\d{4}-\d{2}-\d{2}/, '').trim() || ''
  );
  const [docMode, setDocMode] = useState<ExpenseDocMode>(() => inferInitialDocMode(transactionToEdit));
  const [aplicaIvaAbono, setAplicaIvaAbono] = useState<boolean>(
    transactionToEdit ? (transactionToEdit.iva_incluido ?? true) : true
  );

  const getInitialMetodoPago = () => {
    if (!transactionToEdit) return 'transferencia';
    if (transactionToEdit.tipo_doc_costo === 'factura' || transactionToEdit.tipo_doc_costo === 'boleta') {
      return 'transferencia';
    }
    return transactionToEdit.tipo_doc_costo || 'transferencia';
  };

  const [metodoPago, setMetodoPago] = useState<string>(
    !type || type === 'ABONO' ? getInitialMetodoPago() : 'transferencia'
  );
  const [loading, setLoading] = useState(false);

  // States for delete confirmation
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState(0);

  const isGasto = type === 'GASTO';
  const parsedMonto = parseInt(monto.replace(/\D/g, ''), 10) || 0;

  useEffect(() => {
    if (isOpen) {
      setMonto(transactionToEdit ? transactionToEdit.valor_total.toString() : '');
      setFecha(
        transactionToEdit?.detalle?.match(/\d{4}-\d{2}-\d{2}/)?.[0] ||
          new Date().toISOString().split('T')[0]
      );
      setDescripcion(
        transactionToEdit?.detalle
          ?.replace(/^\d{4}-\d{2}-\d{2}\s*\|\s*/, '')
          .replace(/\d{4}-\d{2}-\d{2}/, '')
          .trim() || ''
      );
      setDocMode(inferInitialDocMode(transactionToEdit));
      setAplicaIvaAbono(transactionToEdit ? (transactionToEdit.iva_incluido ?? true) : true);
      setMetodoPago(
        !transactionToEdit
          ? 'transferencia'
          : transactionToEdit.tipo_doc_costo === 'factura' || transactionToEdit.tipo_doc_costo === 'boleta'
          ? 'transferencia'
          : transactionToEdit.tipo_doc_costo || 'transferencia'
      );
      setDeleteStep(0);
      setIsDeleting(false);
    }
  }, [isOpen, transactionToEdit]);

  const resetForm = () => {
    setMonto('');
    setDescripcion('');
    setFecha(new Date().toISOString().split('T')[0]);
    setDocMode('factura');
    setAplicaIvaAbono(true);
    setMetodoPago('transferencia');
    setDeleteStep(0);
    setIsDeleting(false);
  };

  // Live tax math
  const facturaNeto = Math.round(parsedMonto / 1.19);
  const facturaIvaCredito = docMode === 'factura' ? parsedMonto - facturaNeto : 0;
  const honorariosRetencion = docMode === 'honorarios' ? Math.round(parsedMonto * 0.1375) : 0;
  const abonoNeto = aplicaIvaAbono ? Math.round(parsedMonto / 1.19) : parsedMonto;
  const abonoIvaDebito = aplicaIvaAbono ? parsedMonto - abonoNeto : 0;

  const handleSave = async () => {
    if (!parsedMonto || isNaN(parsedMonto)) {
      alert('Debes ingresar un monto válido.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const fullDetail = `${fecha} | ${descripcion}`.trim();
    const isFacturaDoc = isGasto && docMode === 'factura';

    const servicioLabel = isGasto
      ? docMode === 'factura'
        ? 'Factura de Proveedor'
        : docMode === 'honorarios'
        ? 'Boleta de Honorarios (Personal)'
        : 'Boleta de Proveedor'
      : 'Abono de Cliente';

    const transactionData = {
      event_id: eventId,
      servicio: servicioLabel,
      detalle: fullDetail,
      tipo_evento: isGasto ? 'GASTO_REAL' : 'ABONO_CLIENTE',
      cantidad: 1,
      costo: isGasto ? parsedMonto : 0,
      ganancia: isGasto ? 0 : parsedMonto,
      valor_neto: isGasto
        ? isFacturaDoc
          ? facturaNeto
          : parsedMonto
        : abonoNeto,
      iva: isGasto
        ? isFacturaDoc
          ? facturaIvaCredito
          : 0
        : abonoIvaDebito,
      valor_total: parsedMonto,
      margen: isGasto ? 0 : 100,
      tipo_doc_costo: isGasto ? (isFacturaDoc ? 'factura' : 'boleta') : metodoPago,
      iva_incluido: isGasto ? isFacturaDoc : aplicaIvaAbono,
      approved: true,
    };

    try {
      if (transactionToEdit) {
        const { error } = await (supabase.from('event_items') as any)
          .update(transactionData)
          .eq('id', transactionToEdit.id);
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

    if (!transactionToEdit) return;

    setIsDeleting(true);
    const supabase = createClient();
    try {
      const { error } = await (supabase.from('event_items') as any)
        .delete()
        .eq('id', transactionToEdit.id);
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
    <Dialog
      open={isOpen}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogHeader>
        <DialogTitle>
          {transactionToEdit
            ? 'Editar Transacción'
            : isGasto
            ? 'Registrar Gasto Real'
            : 'Agregar Abono de Cliente'}
        </DialogTitle>
        <DialogDescription>
          {isGasto
            ? 'Ingresa el documento tributario de respaldo para calcular el IVA Crédito Fiscal.'
            : 'Registra el pago recibido e identifica el IVA Débito Fiscal asociado.'}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Monto Total ($)</Label>
            <Input
              type="text"
              placeholder="Ej. 150000"
              value={monto}
              onChange={(e) => setMonto(e.target.value.replace(/\D/g, ''))}
            />
          </div>

          <div className="space-y-1.5">
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
        </div>

        <div className="space-y-1.5">
          <Label>Descripción / Observación</Label>
          <div className="relative">
            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={
                isGasto
                  ? 'Ej. Factura arriendo pantallas / Boleta honorarios técnicos'
                  : 'Ej. Transferencia Banco Reserva 50%'
              }
              className="pl-9"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>
        </div>

        {!isGasto ? (
          <>
            <div className="space-y-1.5">
              <Label>Método de Pago</Label>
              <div className="relative flex items-center">
                <CreditCard className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Select
                  className="pl-9"
                  value={metodoPago}
                  onChange={(e) => setMetodoPago(e.target.value)}
                  options={[
                    { value: 'transferencia', label: 'Transferencia Bancaria' },
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'tarjeta', label: 'Tarjeta (Débito/Crédito)' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'otro', label: 'Otro' },
                  ]}
                />
              </div>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="aplicaIvaAbono"
                className="rounded border-gray-300"
                checked={aplicaIvaAbono}
                onChange={(e) => setAplicaIvaAbono(e.target.checked)}
              />
              <Label htmlFor="aplicaIvaAbono" className="cursor-pointer text-xs font-medium">
                Cobro afecto a IVA Débito Fiscal (19% incluido en el monto recibido)
              </Label>
            </div>

            {parsedMonto > 0 && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs flex flex-wrap justify-between gap-2">
                <div>
                  <span className="text-muted-foreground block text-[10px]">Ingreso Neto Empresa</span>
                  <span className="font-bold text-slate-900">{formatCLP(abonoNeto)}</span>
                </div>
                <div className="text-right">
                  <span className="text-amber-800 block text-[10px] font-medium">
                    IVA Débito Fiscal (SII F29)
                  </span>
                  <span className="font-bold text-amber-700">
                    {aplicaIvaAbono ? formatCLP(abonoIvaDebito) : '$0 (Exento)'}
                  </span>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2.5">
            <Label className="text-xs font-semibold">Documento Tributario Recibido</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDocMode('factura')}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  docMode === 'factura'
                    ? 'border-blue-400 bg-blue-50 text-blue-950 ring-1 ring-blue-300'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Receipt className="h-3.5 w-3.5 text-blue-600" />
                  Factura Afecta
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">Recupera 19% IVA Crédito</p>
              </button>

              <button
                type="button"
                onClick={() => setDocMode('honorarios')}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  docMode === 'honorarios'
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-950 ring-1 ring-indigo-300'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  Boleta Honorarios
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">Personal RR.HH. ($0 IVA Créd.)</p>
              </button>

              <button
                type="button"
                onClick={() => setDocMode('boleta')}
                className={`rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                  docMode === 'boleta'
                    ? 'border-amber-400 bg-amber-50 text-amber-950 ring-1 ring-amber-300'
                    : 'border-border bg-background text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-semibold">
                  <FileText className="h-3.5 w-3.5 text-amber-600" />
                  Boleta / Recibo
                </div>
                <p className="text-[10px] mt-0.5 opacity-80">Sin IVA Crédito Fiscal</p>
              </button>
            </div>

            {parsedMonto > 0 && (
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 text-xs flex flex-wrap justify-between gap-2">
                {docMode === 'factura' ? (
                  <>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Costo Neto Factura</span>
                      <span className="font-bold">{formatCLP(facturaNeto)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-700 block text-[10px] font-medium">
                        IVA Crédito Recuperable (19%)
                      </span>
                      <span className="font-bold text-blue-700">+{formatCLP(facturaIvaCredito)}</span>
                    </div>
                  </>
                ) : docMode === 'honorarios' ? (
                  <>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Líquido / Retención SII (13,75%)</span>
                      <span className="font-semibold text-indigo-900">
                        {formatCLP(parsedMonto - honorariosRetencion)} + Ret. {formatCLP(honorariosRetencion)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px]">IVA Crédito</span>
                      <span className="font-bold text-amber-700">$0 (Boleta Honorarios)</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-muted-foreground block text-[10px]">Gasto Directo</span>
                      <span className="font-bold">{formatCLP(parsedMonto)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-muted-foreground block text-[10px]">IVA Crédito</span>
                      <span className="font-bold text-amber-700">$0 (Boleta Simple)</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </DialogBody>

      <DialogFooter className="flex flex-col sm:flex-row gap-2 justify-between items-center sm:items-end">
        {transactionToEdit ? (
          <div className="w-full sm:w-auto">
            {deleteStep === 0 && (
              <Button
                variant="ghost"
                className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 w-full sm:w-auto"
                onClick={handleDelete}
              >
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
              <Button
                variant="destructive"
                className="w-full sm:w-auto text-xs font-bold bg-rose-700"
                onClick={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Eliminación'}
              </Button>
            )}
          </div>
        ) : (
          <div className="w-full sm:w-auto"></div>
        )}

        <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading || isDeleting}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || isDeleting || !monto}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Guardar
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
