'use client';

import React, { useState } from 'react';
import { MasterCost } from '@/types';
import { createClient } from '@/lib/supabase/client';
import { formatCLP, formatPercentage } from '@/lib/utils';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
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
} from '@/components/ui/table';
import { Sparkles, Check, X, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';

interface StrategicPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCosts: MasterCost[];
  onSuccess: () => void;
  userEmail?: string;
}

interface ProposalItem {
  id: string;
  servicio: string;
  tiempo_detalle: string;
  tipo_evento: string;
  selected: boolean;
  // Valores actuales
  costoActual: number;
  gananciaActual: number;
  netoActual: number;
  // Valores propuestos editables
  costoPropuesto: number;
  gananciaPropuesta: number;
  netoPropuesto: number;
  totalPropuesto: number;
  margenPropuesto: number;
  nota: string;
}

// Factor de retención de Boleta de Honorarios 2026 (15.25%)
const RETENCION_HONORARIOS_2026 = 0.1525;
const calcularBrutoBoleta = (liquido: number) => Math.round(liquido / (1 - RETENCION_HONORARIOS_2026));

export function StrategicPricingDialog({
  open,
  onOpenChange,
  currentCosts,
  onSuccess,
  userEmail = '',
}: StrategicPricingDialogProps) {
  const [proposals, setProposals] = useState<ProposalItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const supabase = createClient();

  // Inicializar propuestas basadas en el benchmark estratégico del plan
  React.useEffect(() => {
    if (open && !initialized && currentCosts.length > 0) {
      const items: ProposalItem[] = currentCosts.map((c) => {
        const servLower = c.servicio.toLowerCase();
        let costoProp = c.costo;
        let netoProp = c.valor_neto;
        let nota = 'Mantiene precio actual';

        if (servLower === 'solista') {
          // Solista: Líquido $70k -> Bruto boleta $82.596 -> Neto sugerido $160.000
          costoProp = calcularBrutoBoleta(70000);
          netoProp = 160000;
          nota = 'Costo bruto con retención Boleta 15,25% ($70k líq.)';
        } else if (servLower === 'duo' || servLower === 'dúo') {
          // Dúo: Líquido $100k -> Bruto boleta $117.994 -> Neto sugerido $235.000
          costoProp = calcularBrutoBoleta(100000);
          netoProp = 235000;
          nota = 'Costo bruto con retención Boleta 15,25% ($100k líq.)';
        } else if (servLower === 'trío' || servLower === 'trio') {
          // Trío: Líquido $150k -> Bruto boleta $176.991 -> Neto sugerido $330.000
          costoProp = calcularBrutoBoleta(150000);
          netoProp = 330000;
          nota = 'Costo bruto con retención Boleta 15,25% ($150k líq.)';
        } else if (servLower.includes('sexteto fiamma')) {
          // Sexteto Fiamma: Convenio agencia $480.000 líq -> Bruto $566.372 -> Neto sugerido $890.000
          costoProp = calcularBrutoBoleta(480000);
          netoProp = 890000;
          nota = 'Convenio agencia -20% ($480k líq. con Boleta)';
        } else if (servLower.includes('orquesta fiamma')) {
          costoProp = calcularBrutoBoleta(960000);
          netoProp = 185000;
          nota = 'Convenio orquesta cámara con Boleta';
        } else if (servLower.includes('canciones especiales')) {
          costoProp = calcularBrutoBoleta(10000);
          netoProp = 35000;
          nota = 'Arreglo exclusivo personalizado';
        } else if (servLower.includes('animador')) {
          costoProp = calcularBrutoBoleta(70000);
          netoProp = 175000;
          nota = 'Animador 4 horas con Boleta 15,25%';
        } else if (servLower.includes('amplificación') || servLower.includes('gestser')) {
          costoProp = 50000; // Factura
          netoProp = 95000;
          nota = 'Refuerzo sonoro instrumentos';
        } else if (c.tiempo_detalle?.includes('25 a 50 fotos') || (servLower.includes('fotografía') && c.costo === 65000)) {
          // Fotografía 25 a 50 fotos: mantener costo de $65.000 exactamente como instruyó el usuario
          costoProp = 65000;
          netoProp = 95000;
          nota = 'Costo oficial pactado de $65.000 mantenido';
        } else if (c.tiempo_detalle?.includes('ceremonia hasta el final') || (servLower.includes('fotografía') && c.costo === 300000)) {
          costoProp = calcularBrutoBoleta(300000);
          netoProp = 560000;
          nota = 'Fotografía boda ceremonia hasta fiesta';
        } else if (c.tiempo_detalle?.includes('preparación de los novios') || (servLower.includes('fotografía') && c.costo === 350000)) {
          costoProp = calcularBrutoBoleta(350000);
          netoProp = 690000;
          nota = 'Fotografía boda full día completo';
        }

        const gananciaProp = Math.max(0, netoProp - costoProp);
        const totalProp = Math.round(netoProp * 1.19);
        const margenProp = costoProp > 0 ? (gananciaProp / costoProp) * 100 : 0;

        return {
          id: c.id,
          servicio: c.servicio,
          tiempo_detalle: c.tiempo_detalle,
          tipo_evento: c.tipo_evento,
          selected: true,
          costoActual: c.costo,
          gananciaActual: c.ganancia,
          netoActual: c.valor_neto,
          costoPropuesto: costoProp,
          gananciaPropuesta: gananciaProp,
          netoPropuesto: netoProp,
          totalPropuesto: totalProp,
          margenPropuesto: Math.round(margenProp * 10) / 10,
          nota,
        };
      });

      setProposals(items);
      setInitialized(true);
    }
  }, [open, initialized, currentCosts]);

  // Edición reactiva de cada casilla
  const handleFieldChange = (id: string, field: 'costoPropuesto' | 'gananciaPropuesta' | 'netoPropuesto', value: string) => {
    const num = Math.max(0, parseFloat(value) || 0);

    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        let nuevoCosto = item.costoPropuesto;
        let nuevaGanancia = item.gananciaPropuesta;
        let nuevoNeto = item.netoPropuesto;

        if (field === 'costoPropuesto') {
          nuevoCosto = num;
          nuevaGanancia = Math.max(0, nuevoNeto - nuevoCosto);
        } else if (field === 'gananciaPropuesta') {
          nuevaGanancia = num;
          nuevoNeto = nuevoCosto + nuevaGanancia;
        } else if (field === 'netoPropuesto') {
          nuevoNeto = num;
          nuevaGanancia = Math.max(0, nuevoNeto - nuevoCosto);
        }

        const nuevoTotal = Math.round(nuevoNeto * 1.19);
        const nuevoMargen = nuevoCosto > 0 ? (nuevaGanancia / nuevoCosto) * 100 : 0;

        return {
          ...item,
          costoPropuesto: nuevoCosto,
          gananciaPropuesta: nuevaGanancia,
          netoPropuesto: nuevoNeto,
          totalPropuesto: nuevoTotal,
          margenPropuesto: Math.round(nuevoMargen * 10) / 10,
        };
      })
    );
  };

  const toggleSelect = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, selected: !p.selected } : p))
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    setProposals((prev) => prev.map((p) => ({ ...p, selected: checked })));
  };

  // Guardar definitivamente en Supabase master_costs
  const handleSaveDefinitive = async () => {
    const selectedItems = proposals.filter((p) => p.selected);
    if (selectedItems.length === 0) {
      alert('Debe seleccionar al menos un servicio para actualizar.');
      return;
    }

    setLoading(true);
    try {
      const updates = selectedItems.map((item) =>
        (supabase.from('master_costs') as any).update({
          costo: item.costoPropuesto,
          ganancia: item.gananciaPropuesta,
          valor_neto: item.netoPropuesto,
          valor_total: item.totalPropuesto,
        }).eq('id', item.id)
      );

      await Promise.all(updates);
      alert(`Se han actualizado exitosamente ${selectedItems.length} tarifas en el Catálogo Maestro de forma definitiva.`);
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      alert('Error al guardar las tarifas: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedCount = proposals.filter((p) => p.selected).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-5xl max-h-[90vh]">
      <DialogHeader className="space-y-1">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white">
            <Sparkles className="h-4 w-4" />
          </div>
          <DialogTitle className="text-xl font-bold">
            Propuesta Estratégica de Tarifas & Retención 2026–2027
          </DialogTitle>
        </div>
        <DialogDescription className="text-xs text-muted-foreground">
          Ajuste sugerido post-auditoría comercial y tributaria (incorporando retención legal del 15,25% de Boletas de Honorarios y benchmark competitivo de la Zona Central). Puede editar cualquier celda a su criterio antes de aplicar los cambios para siempre.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {/* Panel Informativo de Gobernanza */}
        <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 rounded-lg p-3 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
            <ShieldCheck className="h-4 w-4 text-indigo-600 shrink-0" />
            <span>
              <strong>Decisión y Gobernanza:</strong> Las modificaciones aceptadas aquí se guardarán de forma permanente en el Catálogo Maestro de DUO Producciones y regirán todas las futuras cotizaciones.
            </span>
          </div>
          <Badge variant="outline" className="text-[11px] font-bold bg-background text-indigo-700 border-indigo-300 shrink-0">
            {selectedCount} seleccionados
          </Badge>
        </div>

        {/* Tabla Editable */}
        <div className="flex-1 overflow-auto border rounded-lg bg-card mt-2">
          <Table className="min-w-[900px]">
            <TableHeader className="bg-muted/50 sticky top-0 z-10 text-[11px]">
              <TableRow>
                <TableHead className="w-[40px] text-center">
                  <input
                    type="checkbox"
                    checked={selectedCount === proposals.length && proposals.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                </TableHead>
                <TableHead className="font-bold">Servicio / Detalle</TableHead>
                <TableHead className="text-right font-bold text-muted-foreground w-[120px]">Costo Actual</TableHead>
                <TableHead className="text-right font-bold text-red-700 bg-red-50/30 w-[140px]">
                  Costo Propuesto (Boleta 15,25%)
                </TableHead>
                <TableHead className="text-right font-bold text-muted-foreground w-[120px]">Neto Actual</TableHead>
                <TableHead className="text-right font-bold text-emerald-700 bg-emerald-50/30 w-[140px]">
                  Neto Sugerido (Cliente)
                </TableHead>
                <TableHead className="text-right font-bold text-emerald-700 bg-emerald-50/30 w-[120px]">
                  Ganancia Neta
                </TableHead>
                <TableHead className="text-center font-bold w-[90px]">Margen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-xs divide-y">
              {proposals.map((item) => (
                <TableRow
                  key={item.id}
                  className={`transition-colors ${item.selected ? 'bg-background hover:bg-muted/40' : 'opacity-40 bg-muted/20'}`}
                >
                  <TableCell className="text-center">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="font-bold text-foreground">{item.servicio}</div>
                    <div className="text-[11px] text-muted-foreground">{item.tiempo_detalle} min</div>
                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5">{item.nota}</div>
                  </TableCell>

                  {/* Costo Actual */}
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {formatCLP(item.costoActual)}
                  </TableCell>

                  {/* Costo Propuesto Editable */}
                  <TableCell className="bg-red-50/20 text-right p-1.5">
                    <Input
                      type="number"
                      value={item.costoPropuesto}
                      onChange={(e) => handleFieldChange(item.id, 'costoPropuesto', e.target.value)}
                      disabled={!item.selected}
                      className="h-7 text-xs text-right font-bold text-red-700 w-full"
                    />
                  </TableCell>

                  {/* Neto Actual */}
                  <TableCell className="text-right font-medium text-muted-foreground">
                    {formatCLP(item.netoActual)}
                  </TableCell>

                  {/* Neto Propuesto Editable */}
                  <TableCell className="bg-emerald-50/20 text-right p-1.5">
                    <Input
                      type="number"
                      value={item.netoPropuesto}
                      onChange={(e) => handleFieldChange(item.id, 'netoPropuesto', e.target.value)}
                      disabled={!item.selected}
                      className="h-7 text-xs text-right font-bold text-emerald-700 w-full"
                    />
                  </TableCell>

                  {/* Ganancia Propuesta */}
                  <TableCell className="bg-emerald-50/20 text-right font-bold text-emerald-800 p-2">
                    {formatCLP(item.gananciaPropuesta)}
                  </TableCell>

                  {/* Margen */}
                  <TableCell className="text-center font-bold text-xs p-2">
                    <Badge variant="outline" className="text-[10px] font-bold bg-background border-emerald-300 text-emerald-700">
                      {formatPercentage(item.margenPropuesto)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

      </DialogBody>

      <DialogFooter className="mt-auto pt-3 border-t flex flex-row items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={loading}
          className="text-xs"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          Descartar / Cancelar
        </Button>

        <Button
          type="button"
          onClick={handleSaveDefinitive}
          disabled={loading || selectedCount === 0}
          className="text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          Aceptar y Guardar Tarifas Definitivas ({selectedCount})
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
