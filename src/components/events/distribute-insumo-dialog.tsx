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
import { formatCLP } from '@/lib/utils';
import { GitFork, Loader2, Sparkles, Layers, AlertCircle, CheckCircle2, Box } from 'lucide-react';

interface DistributeInsumoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceItem: EventItem | null;
  consolidatedItems: EventItem[];
  onDistribute: (allocations: {
    consolidatedDistributions: Record<string, number>; // parentId -> quantity
    standaloneSplitQty: number;
  }) => Promise<void>;
}

export function DistributeInsumoDialog({
  open,
  onOpenChange,
  sourceItem,
  consolidatedItems,
  onDistribute,
}: DistributeInsumoDialogProps) {
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [standaloneSplit, setStandaloneSplit] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxAvailable = sourceItem ? (sourceItem.cantidad || 1) : 1;
  const unitCost = sourceItem ? (sourceItem.costo || 0) : 0;

  useEffect(() => {
    if (open && sourceItem) {
      setAllocations({});
      setStandaloneSplit(0);
      setError(null);
    }
  }, [open, sourceItem]);

  const totalAssignedConsolidated = Object.values(allocations).reduce(
    (acc, qty) => acc + (qty || 0),
    0
  );
  const totalAssigned = totalAssignedConsolidated + (standaloneSplit || 0);
  const remainingStock = maxAvailable - totalAssigned;
  const isOverAllocated = remainingStock < 0;
  const hasNoAllocation = totalAssigned <= 0;

  const handleQtyChange = (parentId: string, valStr: string) => {
    const parsed = parseInt(valStr);
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setAllocations((prev) => ({ ...prev, [parentId]: val }));
  };

  const handleStandaloneChange = (valStr: string) => {
    const parsed = parseInt(valStr);
    const val = isNaN(parsed) || parsed < 0 ? 0 : parsed;
    setStandaloneSplit(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sourceItem) return;
    if (hasNoAllocation) {
      setError('Por favor asigna al menos 1 unidad a algún producto consolidado o como separación libre.');
      return;
    }
    if (isOverAllocated) {
      setError(`Has asignado ${totalAssigned} unidades, pero solo hay ${maxAvailable} disponibles.`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onDistribute({
        consolidatedDistributions: allocations,
        standaloneSplitQty: standaloneSplit,
      });
      onOpenChange(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al derivar el insumo.');
    } finally {
      setLoading(false);
    }
  };

  if (!sourceItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[inherit] overflow-hidden">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-xs">
              <GitFork className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Derivar Insumo a Productos Consolidados</DialogTitle>
              <DialogDescription>
                Distribuye las unidades de esta compra entre las diferentes preparaciones o recetas de una sola vez.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 custom-scrollbar">
          {error && (
            <div className="p-3 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Tarjeta Informativa del Insumo de Origen */}
          <div className="rounded-xl border border-border/80 bg-muted/25 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-primary" />
                Compra / Insumo a Distribuir:
              </span>
              <span className="font-bold text-foreground">
                Costo Unitario: <span className="text-red-600">{formatCLP(unitCost)}</span>
              </span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-border/40">
              <span className="text-sm font-bold text-foreground">{sourceItem.servicio}</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 border border-blue-200">
                {maxAvailable} unidades disponibles
              </span>
            </div>
            {sourceItem.factura_url && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                📄 Cuenta con factura adjunta. Cada consolidado receptor mantendrá el vínculo a esta misma factura.
              </p>
            )}
          </div>

          {/* Lista de Consolidados para Asignar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Productos Consolidados Disponibles
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Indica cuántas unidades derivar a cada uno:
              </span>
            </div>

            {consolidatedItems.length === 0 ? (
              <div className="p-4 text-center rounded-xl border border-dashed bg-muted/20 space-y-2">
                <Layers className="h-6 w-6 text-muted-foreground mx-auto" />
                <p className="text-xs font-medium text-muted-foreground">
                  Aún no hay productos consolidados creados en este evento (ej. Piscolas, Terremotos).
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Primero crea un producto consolidado agrupando insumos, o bien separa unidades a una nueva fila independiente abajo.
                </p>
              </div>
            ) : (
              <div className="max-h-56 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {consolidatedItems.map((parent) => {
                  const assigned = allocations[parent.id!] || 0;
                  const itemCost = assigned * unitCost;

                  return (
                    <div
                      key={parent.id}
                      className={`p-3 rounded-xl border transition-all ${
                        assigned > 0
                          ? 'bg-indigo-50/40 border-indigo-200 shadow-2xs'
                          : 'bg-card border-border/70 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-foreground truncate">
                              {parent.servicio}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground whitespace-nowrap">
                              Rendimiento: {parent.cantidad} un
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            {parent.detalle || 'Producto Consolidado'}
                          </p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground block">Derivar:</span>
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                min="0"
                                max={maxAvailable}
                                value={assigned === 0 ? '' : assigned}
                                placeholder="0"
                                onChange={(e) => handleQtyChange(parent.id!, e.target.value)}
                                className="h-8 w-16 text-center font-bold text-sm rounded-lg"
                              />
                              <span className="text-xs font-semibold text-muted-foreground">un</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {assigned > 0 && (
                        <div className="mt-2 pt-2 border-t border-indigo-100 flex items-center justify-between text-xs text-indigo-900 font-medium">
                          <span>Costo que se sumará a {parent.servicio}:</span>
                          <span className="font-bold text-red-600">+{formatCLP(itemCost)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Opción Adicional: Separar a fila libre independiente */}
            <div className="pt-2 border-t border-border/50">
              <div className="p-3 rounded-xl border border-dashed border-border bg-muted/10 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-semibold text-foreground block">
                      Separar unidades a una nueva fila libre (no consolidada)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Crea un ítem separado conservando la misma factura para otros fines.
                    </span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Input
                      type="number"
                      min="0"
                      max={maxAvailable}
                      value={standaloneSplit === 0 ? '' : standaloneSplit}
                      placeholder="0"
                      onChange={(e) => handleStandaloneChange(e.target.value)}
                      className="h-8 w-16 text-center font-bold text-sm rounded-lg"
                    />
                    <span className="text-xs font-semibold text-muted-foreground">un</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Barra de Resumen de Inventario y Validación */}
          <div
            className={`rounded-xl p-3.5 border transition-all ${
              isOverAllocated
                ? 'bg-destructive/10 border-destructive/30 text-destructive'
                : 'bg-primary/5 border-primary/20'
            }`}
          >
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-background/80 border">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Disponible</span>
                <span className="text-sm font-bold text-foreground">{maxAvailable} un</span>
              </div>
              <div className="p-2 rounded-lg bg-background/80 border">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Asignado Total</span>
                <span className={`text-sm font-bold ${isOverAllocated ? 'text-destructive' : 'text-primary'}`}>
                  {totalAssigned} un
                </span>
              </div>
              <div className="p-2 rounded-lg bg-background/80 border">
                <span className="text-[10px] text-muted-foreground block uppercase font-medium">Restante en Bodega</span>
                <span
                  className={`text-sm font-bold ${
                    isOverAllocated
                      ? 'text-destructive'
                      : remainingStock === 0
                      ? 'text-emerald-600'
                      : 'text-amber-700'
                  }`}
                >
                  {remainingStock} un
                </span>
              </div>
            </div>

            {isOverAllocated && (
              <p className="text-[11px] text-destructive text-center font-semibold mt-2">
                ⚠️ Superaste el stock disponible por {Math.abs(remainingStock)} unidades. Reduce alguna asignación.
              </p>
            )}

            {!isOverAllocated && remainingStock === 0 && totalAssigned > 0 && (
              <p className="text-[11px] text-emerald-700 text-center font-medium mt-2 flex items-center justify-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Se distribuirá el 100% de la compra entre las preparaciones seleccionadas.
              </p>
            )}

            {!isOverAllocated && remainingStock > 0 && totalAssigned > 0 && (
              <p className="text-[11px] text-amber-800 text-center font-medium mt-2">
                💡 Quedarán {remainingStock} unidades ({formatCLP(remainingStock * unitCost)}) en la compra original para futuros usos.
              </p>
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
            disabled={loading || hasNoAllocation || isOverAllocated}
            className="rounded-xl gap-1.5 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Derivando insumo...</span>
              </>
            ) : (
              <>
                <GitFork className="h-4 w-4" />
                <span>Confirmar Derivación</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
