'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventItem } from '@/types';
import { formatCLP, formatPercentage } from '@/lib/utils';
import { Combine, Loader2, Sparkles, Layers, DollarSign, Calculator } from 'lucide-react';

interface ConsolidateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: EventItem[];
  onConsolidate: (params: {
    name: string;
    quantity: number;
    unitPrice?: number;
  }) => Promise<void>;
}

export function ConsolidateDialog({
  open,
  onOpenChange,
  selectedItems,
  onConsolidate,
}: ConsolidateDialogProps) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState<number>(100);
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = selectedItems.reduce(
    (acc, item) => acc + (item.costo || 0) * (item.cantidad || 1),
    0
  );

  const validQty = Math.max(1, quantity || 1);
  const realUnitCost = Math.round(totalCost / validQty);
  const parsedUnitPrice = parseInt(unitPrice) || 0;
  const totalRevenue = parsedUnitPrice > 0 ? parsedUnitPrice * validQty : 0;
  const unitProfit = parsedUnitPrice > realUnitCost ? parsedUnitPrice - realUnitCost : 0;
  const margin = realUnitCost > 0 && unitProfit > 0 ? (unitProfit / realUnitCost) * 100 : 0;

  useEffect(() => {
    if (open) {
      setName('');
      setQuantity(100);
      setUnitPrice('');
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor ingresa un nombre para el producto consolidado.');
      return;
    }
    if (validQty <= 0) {
      setError('La cantidad debe ser mayor a cero.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onConsolidate({
        name: name.trim(),
        quantity: validQty,
        unitPrice: parsedUnitPrice > 0 ? parsedUnitPrice : undefined,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al consolidar los ítems.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[inherit] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700 border border-blue-200 shadow-xs">
              <Combine className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Consolidar Insumos para Venta al por Menor</DialogTitle>
              <DialogDescription>
                Agrupa materias primas e insumos en un producto final para venta unitaria.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl">
              {error}
            </div>
          )}

          {/* Resumen de insumos a consolidar */}
          <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground pb-1 border-b border-border/50">
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {selectedItems.length} insumos seleccionados
              </span>
              <span className="text-foreground font-bold">
                Costo Total Insumos: <span className="text-red-600">{formatCLP(totalCost)}</span>
              </span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-xs">
              {selectedItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-muted-foreground py-0.5">
                  <span className="truncate max-w-[280px]">
                    <strong className="text-foreground">{item.cantidad}x</strong> {item.servicio}
                  </span>
                  <span className="font-medium text-red-700">
                    {formatCLP((item.costo || 0) * (item.cantidad || 1))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="cons-name" className="text-xs font-medium">
                Nombre del Producto a la Venta <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cons-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Terremotos (Vaso 400cc), Piscola, Hamburguesa"
                className="rounded-xl"
                required
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cons-qty" className="text-xs font-medium flex items-center justify-between">
                  <span>Cantidad / Rendimiento a la venta *</span>
                </Label>
                <Input
                  id="cons-qty"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                  placeholder="Ej: 100"
                  className="rounded-xl font-bold"
                  required
                />
                <p className="text-[11px] text-muted-foreground">
                  ¿Cuántas porciones o unidades resultan de estos insumos?
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cons-price" className="text-xs font-medium flex items-center justify-between">
                  <span>Precio de Venta Unitario (Opcional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground">$</span>
                  <Input
                    id="cons-price"
                    type="number"
                    min="0"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    placeholder="Ej: 3500"
                    className="rounded-xl pl-7"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Precio final con el que se venderá cada unidad.
                </p>
              </div>
            </div>
          </div>

          {/* Panel de Cálculo Matemático en Vivo */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Calculator className="h-4 w-4" />
              <span>Desglose Unitario y Financiero Resultante:</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              <div className="bg-background/80 rounded-lg p-2.5 border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Costo Insumos Total</span>
                <span className="text-sm font-bold text-red-600">{formatCLP(totalCost)}</span>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 border text-center">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Unidades a la Venta</span>
                <span className="text-sm font-bold text-foreground">{validQty} un</span>
              </div>
              <div className="bg-background/80 rounded-lg p-2.5 border border-primary/40 text-center col-span-2 sm:col-span-1 shadow-2xs">
                <span className="text-[10px] text-primary block uppercase font-bold">Costo Unitario Real</span>
                <span className="text-sm font-extrabold text-primary">{formatCLP(realUnitCost)} / un</span>
              </div>
            </div>

            {parsedUnitPrice > 0 && (
              <div className="flex flex-wrap items-center justify-between text-xs pt-1 border-t border-primary/20 text-muted-foreground">
                <span>Venta Total Estimada: <strong className="text-emerald-700">{formatCLP(totalRevenue)}</strong></span>
                <span>Ganancia Estimada: <strong className="text-emerald-600">+{formatCLP(totalRevenue - totalCost)}</strong></span>
                <span>Margen: <strong className="text-emerald-700">{formatPercentage(margin)}</strong></span>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="rounded-xl"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading || !name.trim() || validQty <= 0}
            className="rounded-xl gap-1.5 shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Consolidando...</span>
              </>
            ) : (
              <>
                <Combine className="h-4 w-4" />
                <span>Consolidar Producto</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
