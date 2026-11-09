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
import { 
  Sparkles, 
  Check, 
  X, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Info, 
  TrendingUp, 
  Receipt, 
  DollarSign, 
  ChevronDown, 
  ChevronUp,
  Search,
  Scale
} from 'lucide-react';

interface StrategicPricingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentCosts: MasterCost[];
  onSuccess: () => void;
  userEmail?: string;
}

export interface ProposalItem {
  id: string;
  servicio: string;
  tiempo_detalle: string;
  tipo_evento: string;
  selected: boolean;

  // Régimen Tributario
  tipo_doc: 'boleta' | 'factura';

  // Costos Proveedor & Empresa (Modelo 50/50 CEO)
  liquidoProveedor: number;          // Lo que recibe el contratado "en mano" tras su 7.625%
  aporteRetencionDUO: number;       // 7.625% asumido por DUO Producciones
  aporteRetencionProveedor: number; // 7.625% asumido por el contratado en su boleta
  retencionSII: number;              // 15.25% legal total que DUO entera al SII en F29
  costoBrutoTotal: number;           // Desembolso real para DUO (Base + 7.625%)
  costoAnterior: number;             // Costo anterior en ERP
  difCosto: number;                  // Variación de costo para DUO (+7.625%)

  // Precios Venta Cliente
  netoAnterior: number;              // Lo que DUO cobraba antes al cliente
  netoSugerido: number;              // Nuevo valor de venta neto recomendado
  totalClienteIva: number;           // netoSugerido * 1.19 (con IVA)

  // Rentabilidad Real
  gananciaNeta: number;              // netoSugerido - costoBrutoTotal
  margenRentabilidad: number;        // (gananciaNeta / costoBrutoTotal) * 100

  // Justificación detallada
  justificacion: string;             // Explicación técnica y comercial
  benchmarkCompetencia: string;      // Comparativa con mercado chileno (Trémolo, etc.)
}

// Tasa legal de retención de Boletas de Honorarios año comercial 2026 (Ley N° 21.133)
const RETENCION_TOTAL_2026 = 0.1525; // 15.25%
// Directiva de la CEO: Reparto 50/50 del impacto tributario
const TASA_REPARTO_50_50 = 0.07625; // 7.625% para cada parte

// 1. Costo Bruto Empresa: DUO asume un recargo del +7.625% sobre la tarifa base histórica
const calcularBruto5050 = (baseHistorica: number) => Math.round(baseHistorica * (1 + TASA_REPARTO_50_50));
// 2. Retención total legal 15.25% que se entera al SII en F29
const calcularRetencionSII = (bruto: number) => Math.round(bruto * RETENCION_TOTAL_2026);
// 3. Líquido que percibe en mano el contratado (asume su 7.625%)
const calcularLiquido5050 = (bruto: number) => bruto - calcularRetencionSII(bruto);

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showExplanation, setShowExplanation] = useState(true);
  const supabase = createClient();

  // Inicializar propuestas detalladas con el modelo 50/50 de la CEO
  React.useEffect(() => {
    if (open && !initialized && currentCosts.length > 0) {
      const items: ProposalItem[] = currentCosts.map((c) => {
        const servLower = c.servicio.toLowerCase();
        
        let tipo_doc: 'boleta' | 'factura' = 'boleta';
        let baseHistorica = c.costo;
        let costoBruto = c.costo;
        let netoSugerido = c.valor_neto;
        let justificacion = 'Servicio sin ajustes mayores de benchmark.';
        let benchmarkCompetencia = 'Precios alineados con el estándar promedio local.';

        // 1. SOLISTA (Violín / Cello / Saxo)
        if (servLower === 'solista') {
          tipo_doc = 'boleta';
          baseHistorica = 70000;
          costoBruto = calcularBruto5050(baseHistorica); // $75.338 (+7,625% DUO)
          netoSugerido = 160000;
          justificacion = 'Directiva CEO 50/50: DUO aporta +$5.338 (7,625%) y el músico asume -$6.151 de retención en su líquido ($63.849 en mano). DUO entera $11.489 al SII en F29. Al cotizar a $160.000 neto, la productora percibe $84.662 de ganancia limpia.';
          benchmarkCompetencia = 'Grupo Trémolo y productoras de Santiago cotizan solistas entre $180.000 y $220.000 neto.';
        
        // 2. DÚO (Violín & Chelo)
        } else if (servLower === 'duo' || servLower === 'dúo') {
          tipo_doc = 'boleta';
          baseHistorica = 100000; // $50k base c/u
          costoBruto = calcularBruto5050(baseHistorica); // $107.625 (+7,625% DUO)
          netoSugerido = 235000;
          justificacion = 'Directiva CEO 50/50: Retención dividida en partes iguales. DUO asume un recargo de +$7.625 (costo bruto $107.625) y los músicos reciben $91.212 en mano ($45.606 c/u). Se declara $16.413 al SII. Venta de $235.000 neto asegura $127.375 de utilidad.';
          benchmarkCompetencia = 'Dúos de cuerdas similares en la Zona Central cotizan entre $280.000 y $340.000 neto.';
        
        // 3. TRÍO DE CÁMARA
        } else if (servLower === 'trío' || servLower === 'trio') {
          tipo_doc = 'boleta';
          baseHistorica = 150000; // $50k base c/u x 3
          costoBruto = calcularBruto5050(baseHistorica); // $161.438 (+7,625% DUO)
          netoSugerido = 330000;
          justificacion = 'Directiva CEO 50/50: DUO aporta +$11.438 y los 3 músicos aportan $13.181 de la retención total ($136.819 en mano). Retención total de $24.619. Venta de $330.000 neto consolida $168.562 de utilidad.';
          benchmarkCompetencia = 'Benchmark de mercado en eventos corporativos y bodas: $380.000 a $440.000 neto.';
        
        // 4. SEXTETO FIAMMA
        } else if (servLower.includes('sexteto fiamma')) {
          tipo_doc = 'boleta';
          baseHistorica = 480000; // Convenio preferente
          costoBruto = calcularBruto5050(baseHistorica); // $516.600 (+7,625% DUO)
          netoSugerido = 890000;
          justificacion = 'Directiva CEO 50/50: Reparto equitativo con el elenco. DUO ahorra $49.772 en costos tributarios frente al modelo 100% empresa, desembolsando $516.600. El elenco recibe $437.818 en mano. Ganancia neta para DUO de $373.400.';
          benchmarkCompetencia = 'Sextetos clásicos de gala en Santiago cotizan entre $1.100.000 y $1.400.000 neto.';

        // 5. ORQUESTA FIAMMA
        } else if (servLower.includes('orquesta fiamma')) {
          tipo_doc = 'boleta';
          baseHistorica = 960000; // 12 músicos en escena
          costoBruto = calcularBruto5050(baseHistorica); // $1.033.200 (+7,625% DUO)
          netoSugerido = 1850000;
          justificacion = 'Directiva CEO 50/50: DUO asume +$73.200 (desembolso bruto $1.033.200) y los 12 músicos asumen $84.363 de retención ($875.637 en mano). Retención F29 de $157.563. Ganancia neta récord de $816.800 para la productora.';
          benchmarkCompetencia = 'Orquestas de cámara completas para galas corporativas cotizan sobre $2.400.000 neto.';

        // 6. CANCIONES ESPECIALES / ARREGLOS
        } else if (servLower.includes('canciones especiales')) {
          tipo_doc = 'boleta';
          baseHistorica = 10000;
          costoBruto = calcularBruto5050(baseHistorica); // $10.763 (+7,625% DUO)
          netoSugerido = 35000;
          justificacion = 'Directiva CEO 50/50: Arreglo musical con costo empresa de $10.763 y líquido de $9.122. Margen de 225% ($24.237 de utilidad limpia).';
          benchmarkCompetencia = 'Arreglos a medida se cobran entre $40.000 y $60.000.';

        // 7. ANIMADOR DE EVENTOS
        } else if (servLower.includes('animador')) {
          tipo_doc = 'boleta';
          baseHistorica = 70000;
          costoBruto = calcularBruto5050(baseHistorica); // $75.338 (+7,625% DUO)
          netoSugerido = 175000;
          justificacion = 'Directiva CEO 50/50: 7,625% asumido por DUO ($75.338 bruto) y 7,625% por el locutor ($63.849 en mano). Retención de $11.489. Ganancia neta de $99.662 para la empresa.';
          benchmarkCompetencia = 'Animación corporativa y matrimonios en O’Higgins cotiza entre $180.000 y $260.000 neto.';

        // 8. AMPLIFICACIÓN / REFUERZO SONORO (GESTSER)
        } else if (servLower.includes('amplificación') || servLower.includes('gestser')) {
          tipo_doc = 'factura';
          baseHistorica = 50000;
          costoBruto = 50000; // Factura sin retención de honorarios
          netoSugerido = 95000;
          justificacion = 'Factura comercial: Genera IVA Crédito Fiscal. No aplica retención de honorarios. Ganancia neta de $45.000.';
          benchmarkCompetencia = 'Sonido básico para ceremonia/cóctel en la industria: $100.000 a $130.000 neto.';

        // 9. FOTOGRAFÍA CORPORATIVA 25 A 50 FOTOS (RODRIGO ABARCA)
        } else if (c.tiempo_detalle?.includes('25 a 50 fotos') || (servLower.includes('fotografía') && c.costo === 65000)) {
          tipo_doc = 'factura';
          baseHistorica = 65000;
          costoBruto = 65000; // REGLA INMUTABLE: Mantenido en $65.000
          netoSugerido = 95000;
          justificacion = 'Costo oficial pactado de $65.000 con Rodrigo Abarca MANTENIDO FIRME según su instrucción. Factura comercial sin retención de boleta. Venta a $95.000 neto ($30.000 ganancia).';
          benchmarkCompetencia = 'Sesión fotográfica corporativa express promediada en $110.000 neto.';

        // 10. FOTOGRAFÍA BODA COMPLETA (CEREMONIA A FIESTA)
        } else if (c.tiempo_detalle?.includes('ceremonia hasta el final') || (servLower.includes('fotografía') && c.costo === 300000)) {
          tipo_doc = 'boleta';
          baseHistorica = 300000;
          costoBruto = calcularBruto5050(baseHistorica); // $322.875 (+7,625% DUO)
          netoSugerido = 560000;
          justificacion = 'Directiva CEO 50/50: DUO aporta +$22.875 y el fotógrafo asume -$26.363 de retención ($273.637 en mano). Retención F29 de $49.238. Ganancia neta para DUO de $237.125.';
          benchmarkCompetencia = 'Fotógrafos de bodas en la Zona Central cotizan entre $650.000 y $890.000 neto.';

        // 11. FOTOGRAFÍA BODA FULL DAY (PREPARACIÓN A FIESTA)
        } else if (c.tiempo_detalle?.includes('preparación de los novios') || (servLower.includes('fotografía') && c.costo === 350000)) {
          tipo_doc = 'boleta';
          baseHistorica = 350000;
          costoBruto = calcularBruto5050(baseHistorica); // $376.688 (+7,625% DUO)
          netoSugerido = 690000;
          justificacion = 'Directiva CEO 50/50: Cobertura integral 12-14 hrs. Costo bruto DUO de $376.688 y líquido de $319.243. Retención de $57.445. Utilidad neta limpia de $313.312 para la productora.';
          benchmarkCompetencia = 'Full day de bodas premium en Santiago: $850.000 a $1.200.000 neto.';

        // SERVICIOS GENÉRICOS DE CATÁLOGO
        } else {
          tipo_doc = c.tipo_doc_costo || 'boleta';
          baseHistorica = c.costo;
          costoBruto = tipo_doc === 'boleta' ? calcularBruto5050(baseHistorica) : baseHistorica;
          netoSugerido = Math.max(c.valor_neto, Math.round(costoBruto * 1.35));
          justificacion = 'Directiva CEO 50/50: Impacto tributario dividido a partes iguales (7,625% empresa / 7,625% contratado).';
          benchmarkCompetencia = 'Tarifa referencial estándar de mercado.';
        }

        const retencionSII = tipo_doc === 'boleta' ? calcularRetencionSII(costoBruto) : 0;
        const liquido = tipo_doc === 'boleta' ? calcularLiquido5050(costoBruto) : costoBruto;
        const aporteRetencionDUO = tipo_doc === 'boleta' ? (costoBruto - baseHistorica) : 0;
        const aporteRetencionProveedor = tipo_doc === 'boleta' ? (baseHistorica - liquido) : 0;
        const gananciaNeta = Math.max(0, netoSugerido - costoBruto);
        const margen = costoBruto > 0 ? (gananciaNeta / costoBruto) * 100 : 0;
        const totalClienteIva = Math.round(netoSugerido * 1.19);
        const difCosto = costoBruto - c.costo;

        return {
          id: c.id,
          servicio: c.servicio,
          tiempo_detalle: c.tiempo_detalle || '',
          tipo_evento: c.tipo_evento || 'General',
          selected: true,
          tipo_doc,
          liquidoProveedor: liquido,
          aporteRetencionDUO,
          aporteRetencionProveedor,
          retencionSII,
          costoBrutoTotal: costoBruto,
          costoAnterior: c.costo,
          difCosto,
          netoAnterior: c.valor_neto,
          netoSugerido,
          totalClienteIva,
          gananciaNeta,
          margenRentabilidad: Math.round(margen * 10) / 10,
          justificacion,
          benchmarkCompetencia,
        };
      });

      setProposals(items);
      setInitialized(true);
    }
  }, [open, initialized, currentCosts]);

  // Edición reactiva del Líquido Proveedor (con recalibración bajo la regla 50/50)
  const handleLiquidoChange = (id: string, value: string) => {
    const newLiquido = Math.max(0, parseInt(value.replace(/\D/g, '')) || 0);

    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        // Si es boleta, el líquido equivale a la base descontada en 7.625%
        // Bruto = Líquido / (1 - 0.1525)
        const costoBruto = item.tipo_doc === 'boleta' 
          ? Math.round(newLiquido / (1 - RETENCION_TOTAL_2026)) 
          : newLiquido;
        const retencion = item.tipo_doc === 'boleta' ? Math.round(costoBruto * RETENCION_TOTAL_2026) : 0;
        const aporteDUO = item.tipo_doc === 'boleta' ? Math.round(retencion / 2) : 0;
        const aporteProv = retencion - aporteDUO;
        const ganancia = Math.max(0, item.netoSugerido - costoBruto);
        const margen = costoBruto > 0 ? (ganancia / costoBruto) * 100 : 0;
        const dif = costoBruto - item.costoAnterior;

        return {
          ...item,
          liquidoProveedor: newLiquido,
          aporteRetencionDUO: aporteDUO,
          aporteRetencionProveedor: aporteProv,
          retencionSII: retencion,
          costoBrutoTotal: costoBruto,
          difCosto: dif,
          gananciaNeta: ganancia,
          margenRentabilidad: Math.round(margen * 10) / 10,
        };
      })
    );
  };

  // Edición reactiva del Precio Neto Sugerido al Cliente
  const handleNetoChange = (id: string, value: string) => {
    const newNeto = Math.max(0, parseInt(value.replace(/\D/g, '')) || 0);

    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const ganancia = Math.max(0, newNeto - item.costoBrutoTotal);
        const margen = item.costoBrutoTotal > 0 ? (ganancia / item.costoBrutoTotal) * 100 : 0;
        const totalIva = Math.round(newNeto * 1.19);

        return {
          ...item,
          netoSugerido: newNeto,
          totalClienteIva: totalIva,
          gananciaNeta: ganancia,
          margenRentabilidad: Math.round(margen * 10) / 10,
        };
      })
    );
  };

  // Cambio de Régimen Tributario (Boleta 15,25% vs Factura)
  const handleTipoDocToggle = (id: string) => {
    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const newTipo: 'boleta' | 'factura' = item.tipo_doc === 'boleta' ? 'factura' : 'boleta';
        const costoBruto = newTipo === 'boleta' 
          ? calcularBruto5050(item.costoAnterior) 
          : item.costoAnterior;
        const retencion = newTipo === 'boleta' ? calcularRetencionSII(costoBruto) : 0;
        const liquido = newTipo === 'boleta' ? calcularLiquido5050(costoBruto) : costoBruto;
        const aporteDUO = newTipo === 'boleta' ? (costoBruto - item.costoAnterior) : 0;
        const aporteProv = newTipo === 'boleta' ? (item.costoAnterior - liquido) : 0;
        const ganancia = Math.max(0, item.netoSugerido - costoBruto);
        const margen = costoBruto > 0 ? (ganancia / costoBruto) * 100 : 0;
        const dif = costoBruto - item.costoAnterior;

        return {
          ...item,
          tipo_doc: newTipo,
          liquidoProveedor: liquido,
          aporteRetencionDUO: aporteDUO,
          aporteRetencionProveedor: aporteProv,
          retencionSII: retencion,
          costoBrutoTotal: costoBruto,
          difCosto: dif,
          gananciaNeta: ganancia,
          margenRentabilidad: Math.round(margen * 10) / 10,
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

  // Guardar definitivamente en Supabase master_costs y REGISTRAR EL CONSUMO ÚNICO
  const handleSaveDefinitive = async () => {
    const selectedItems = proposals.filter((p) => p.selected);
    if (selectedItems.length === 0) {
      alert('Debe seleccionar al menos un servicio para actualizar.');
      return;
    }

    const confirmSave = window.confirm(
      `¿Está segura/o de aplicar definitivamente estas ${selectedItems.length} tarifas en el Catálogo Maestro?\n\n` +
      `Se aplicará la directiva de la CEO: Reparto 50/50 del impacto tributario (7,625% Empresa / 7,625% Contratado).\n` +
      `De acuerdo a sus instrucciones, esta propuesta es de UN SOLO USO y desaparecerá permanentemente tras su aplicación.`
    );
    if (!confirmSave) return;

    setLoading(true);
    try {
      // 1. Actualizar las tarifas de los ítems seleccionados
      const updates = selectedItems.map((item) =>
        (supabase.from('master_costs') as any).update({
          costo: item.costoBrutoTotal,
          ganancia: item.gananciaNeta,
          valor_neto: item.netoSugerido,
          valor_total: item.totalClienteIva,
          tipo_doc_costo: item.tipo_doc,
        }).eq('id', item.id)
      );

      await Promise.all(updates);

      // 2. Insertar registro persistente de control para que desaparezca para siempre
      await (supabase.from('master_costs') as any).insert({
        servicio: '__SYSTEM_STRATEGIC_PROPOSAL_2026_APPLIED__',
        tiempo_detalle: '2026_applied_50_50',
        tipo_evento: 'System',
        costo: 0,
        ganancia: 0,
        valor_neto: 0,
        valor_total: 0,
        tipo_doc_costo: 'factura',
      });

      // 3. Guardar en localStorage como capa de redundancia
      if (typeof window !== 'undefined') {
        localStorage.setItem('duo_strategic_proposal_2026_applied', 'true');
      }

      alert(
        `¡Propuesta Estratégica 2026 (Esquema 50/50) aplicada con total éxito!\n\n` +
        `Se han actualizado ${selectedItems.length} tarifas en el Catálogo Maestro.\n` +
        `El asistente ha cumplido su objetivo de un solo uso y se ha retirado de la interfaz.`
      );

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
  const filteredProposals = proposals.filter(
    (p) =>
      p.servicio.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.tiempo_detalle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.justificacion.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Métricas consolidadas
  const totalGananciaProyectada = proposals
    .filter((p) => p.selected)
    .reduce((acc, curr) => acc + curr.gananciaNeta, 0);
  const totalGananciaAnterior = proposals
    .filter((p) => p.selected)
    .reduce((acc, curr) => acc + (curr.netoAnterior - curr.costoAnterior), 0);
  const incrementoGanancia = totalGananciaProyectada - totalGananciaAnterior;
  const totalAhorroTributarioEmpresa = proposals
    .filter((p) => p.selected && p.tipo_doc === 'boleta')
    .reduce((acc, curr) => acc + curr.aporteRetencionProveedor, 0);

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange} 
      className="w-[98vw] max-w-[1700px] md:max-w-[1700px] h-[94vh] sm:h-[95vh] flex flex-col p-0 overflow-hidden"
    >
      {/* Cabecera Principal */}
      <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Scale className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Propuesta Estratégica 2026: Esquema 50/50 de Retención Tributaria
                </DialogTitle>
                <Badge className="bg-emerald-500 text-slate-950 font-black text-xs uppercase px-2.5 py-0.5 border-0 shadow-xs">
                  Directiva CEO 50/50
                </Badge>
                <Badge className="bg-amber-400 text-amber-950 font-bold text-xs uppercase px-2 py-0.5 border-0">
                  Uso Único
                </Badge>
              </div>
              <DialogDescription className="text-xs text-indigo-200/90 mt-1">
                La retención legal del 15,25% de Boletas de Honorarios se reparte en partes iguales: <strong>7,625% absorbido por DUO</strong> y <strong>7,625% asumido por el contratado</strong>. Preserva costo de Fotografía ($65.000) y benchmark comercial de la Zona Central.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs font-semibold bg-white/10 text-white border-white/20 px-3 py-1.5">
              {selectedCount} de {proposals.length} servicios seleccionados
            </Badge>
          </div>
        </div>
      </DialogHeader>

      <DialogBody className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/20">
        {/* Banner Desplegable de Fundamento Técnico y Tributario 50/50 */}
        <div className="rounded-xl border border-indigo-200 bg-white dark:bg-slate-900 dark:border-indigo-900/60 shadow-xs overflow-hidden transition-all">
          <div 
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center justify-between px-5 py-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 cursor-pointer hover:bg-indigo-100/60 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-indigo-950 dark:text-indigo-200">
              <Scale className="h-5 w-5 text-indigo-600 shrink-0" />
              <span className="font-bold text-sm">
                ¿Cómo funciona la regla 50/50 de la CEO y qué impacto tiene en las utilidades de DUO? (Clic para {showExplanation ? 'ocultar' : 'expandir'})
              </span>
            </div>
            <button type="button" className="text-indigo-700 dark:text-indigo-300 p-1">
              {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showExplanation && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-t border-indigo-100 dark:border-indigo-900/40 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-300 font-bold text-xs uppercase tracking-wider">
                  <Scale className="h-4 w-4 text-indigo-600" />
                  1. Reparto Equitativo 50/50 (7,625% c/u)
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  En vez de que DUO absorba el 100% del 15,25% (que elevaba el costo de un solista a $82.596), <strong>la empresa aporta un +7,625%</strong> sobre la base histórica ($75.338 bruto) y <strong>el músico aporta el otro 7,625%</strong> en su boleta ($63.849 líquido en mano). DUO entera el 15,25% legal ($11.489) íntegramente al SII.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  2. Mayor Ganancia Neta para la Productora
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Al compartir la retención, el costo total de la empresa disminuye en todos los formatos musicales. Por ejemplo, en un Dúo de Cuerdas el costo baja de $117.994 a <strong>$107.625</strong>, elevando la utilidad neta de DUO de $117.006 a <strong>$127.375</strong> por evento (margen del 118,3%).
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/20 border border-blue-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  3. Fotografía ($65.000) & Facturas Protegidas
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Para proveedores con Factura (como Rodrigo Abarca en Fotografía Corporativa de $65.000 y Gestser en amplificación de $50.000), <strong>no aplica retención de boleta</strong>. Sus costos se mantienen 100% intactos generando crédito fiscal IVA para la empresa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Barra de Filtro y Buscador */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-border/70 shadow-2xs">
          <div className="relative w-full sm:w-80">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar servicio (ej: Solista, Fiamma, Dúo)..."
              className="pl-9 h-8 text-xs bg-muted/30"
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border-indigo-200">
              Ahorro tributario transferido al contratado: {formatCLP(totalAhorroTributarioEmpresa)}
            </Badge>
            <span className="hidden md:inline">💡 Puede editar cualquier celda de <strong>Líquido Proveedor</strong> o <strong>Venta Sugerida</strong>.</span>
          </div>
        </div>

        {/* Tabla Detallada Multicolumna */}
        <div className="border border-border/80 rounded-xl bg-white dark:bg-slate-900 shadow-xs overflow-x-auto">
          <Table className="min-w-[1650px] text-xs">
            <TableHeader className="bg-slate-900 text-white sticky top-0 z-20">
              <TableRow className="hover:bg-slate-900 border-b border-slate-800 text-[11px]">
                <TableHead className="w-[45px] text-center text-white">
                  <input
                    type="checkbox"
                    checked={selectedCount === proposals.length && proposals.length > 0}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-400 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Seleccionar o deseleccionar todos"
                  />
                </TableHead>
                <TableHead className="w-[210px] font-bold text-white">Servicio / Formato</TableHead>
                <TableHead className="w-[125px] font-bold text-center text-amber-300 bg-amber-950/40">
                  Líquido Contratado (7,625% asumido)
                </TableHead>
                <TableHead className="w-[90px] font-bold text-center text-white">Doc. Legal</TableHead>
                <TableHead className="w-[110px] font-bold text-right text-indigo-300 bg-indigo-950/40">
                  Aporte DUO (+7,625%)
                </TableHead>
                <TableHead className="w-[115px] font-bold text-right text-amber-300 bg-amber-950/30">
                  Aporte Contratado (7,625%)
                </TableHead>
                <TableHead className="w-[120px] font-bold text-right text-red-300 bg-red-950/40">
                  Retención SII F29 (15,25%)
                </TableHead>
                <TableHead className="w-[130px] font-bold text-right text-red-200 bg-red-900/50">
                  Costo Total DUO (Bruto 50/50)
                </TableHead>
                <TableHead className="w-[105px] font-bold text-right text-slate-300">
                  Costo Anterior
                </TableHead>
                <TableHead className="w-[110px] font-bold text-right text-slate-300">
                  Venta Anterior
                </TableHead>
                <TableHead className="w-[140px] font-bold text-right text-emerald-300 bg-emerald-950/50">
                  Venta Sugerida 2026 (Neto)
                </TableHead>
                <TableHead className="w-[120px] font-bold text-right text-emerald-200 bg-emerald-900/60">
                  Ganancia Neta ($)
                </TableHead>
                <TableHead className="w-[85px] font-bold text-center text-emerald-300">
                  Margen (%)
                </TableHead>
                <TableHead className="w-[115px] font-bold text-right text-slate-200">
                  Total Cliente (IVA)
                </TableHead>
                <TableHead className="w-[300px] font-bold text-white">
                  Justificación Estratégica & Benchmark
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {filteredProposals.map((item) => (
                <TableRow
                  key={item.id}
                  className={`transition-colors ${
                    item.selected ? 'bg-background hover:bg-muted/40' : 'opacity-40 bg-muted/20'
                  }`}
                >
                  {/* 1. Checkbox */}
                  <TableCell className="text-center p-2.5">
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={() => toggleSelect(item.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </TableCell>

                  {/* 2. Servicio & Detalle */}
                  <TableCell className="py-3 px-3">
                    <div className="font-bold text-foreground text-xs">{item.servicio}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{item.tiempo_detalle}</div>
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0 mt-1 border-border/80">
                      {item.tipo_evento}
                    </Badge>
                  </TableCell>

                  {/* 3. Líquido Contratado (Editable) */}
                  <TableCell className="bg-amber-50/30 dark:bg-amber-950/10 p-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">$</span>
                      <Input
                        type="text"
                        value={item.liquidoProveedor.toLocaleString('es-CL')}
                        onChange={(e) => handleLiquidoChange(item.id, e.target.value)}
                        disabled={!item.selected}
                        className="h-7 text-xs text-right font-bold text-amber-900 dark:text-amber-200 w-full bg-white dark:bg-slate-900 border-amber-300 focus:ring-amber-500"
                        title="Dinero líquido que recibe en mano el contratado tras su 7,625% de retención"
                      />
                    </div>
                  </TableCell>

                  {/* 4. Régimen Tributario */}
                  <TableCell className="text-center p-2">
                    <button
                      type="button"
                      onClick={() => handleTipoDocToggle(item.id)}
                      disabled={!item.selected}
                      className={`text-[10px] font-bold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                        item.tipo_doc === 'boleta'
                          ? 'bg-purple-100 text-purple-800 border-purple-300 hover:bg-purple-200'
                          : 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200'
                      }`}
                      title="Clic para cambiar entre Boleta de Honorarios (50/50) y Factura"
                    >
                      {item.tipo_doc === 'boleta' ? 'Boleta 50/50' : 'Factura'}
                    </button>
                  </TableCell>

                  {/* 5. Aporte DUO (+7,625%) */}
                  <TableCell className="bg-indigo-50/30 dark:bg-indigo-950/10 text-right p-2 font-bold text-indigo-700 dark:text-indigo-300">
                    {item.aporteRetencionDUO > 0 ? `+${formatCLP(item.aporteRetencionDUO)}` : '$0'}
                  </TableCell>

                  {/* 6. Aporte Contratado (7,625%) */}
                  <TableCell className="bg-amber-50/20 dark:bg-amber-950/10 text-right p-2 font-medium text-amber-700 dark:text-amber-400">
                    {item.aporteRetencionProveedor > 0 ? `-${formatCLP(item.aporteRetencionProveedor)}` : '$0'}
                  </TableCell>

                  {/* 7. Retención SII F29 (15,25%) */}
                  <TableCell className="bg-red-50/20 dark:bg-red-950/10 text-right p-2 font-semibold text-red-700 dark:text-red-400">
                    {item.retencionSII > 0 ? formatCLP(item.retencionSII) : '$0'}
                  </TableCell>

                  {/* 8. Costo Total DUO (Bruto) */}
                  <TableCell className="bg-red-50/40 dark:bg-red-950/20 text-right p-2 font-black text-red-800 dark:text-red-300">
                    {formatCLP(item.costoBrutoTotal)}
                  </TableCell>

                  {/* 9. Costo Anterior ERP */}
                  <TableCell className="text-right p-2 text-muted-foreground line-through font-medium">
                    {formatCLP(item.costoAnterior)}
                  </TableCell>

                  {/* 10. Venta Anterior Neto */}
                  <TableCell className="text-right p-2 text-muted-foreground font-medium">
                    {formatCLP(item.netoAnterior)}
                  </TableCell>

                  {/* 11. Venta Sugerida 2026 (Neto) (Editable) */}
                  <TableCell className="bg-emerald-50/40 dark:bg-emerald-950/20 p-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">$</span>
                      <Input
                        type="text"
                        value={item.netoSugerido.toLocaleString('es-CL')}
                        onChange={(e) => handleNetoChange(item.id, e.target.value)}
                        disabled={!item.selected}
                        className="h-7 text-xs text-right font-black text-emerald-800 dark:text-emerald-300 w-full bg-white dark:bg-slate-900 border-emerald-300 focus:ring-emerald-500"
                        title="Precio de venta neto que se cobrará al cliente en cotizaciones"
                      />
                    </div>
                  </TableCell>

                  {/* 12. Ganancia Neta DUO */}
                  <TableCell className="bg-emerald-50/60 dark:bg-emerald-950/30 text-right p-2 font-black text-emerald-800 dark:text-emerald-200">
                    {formatCLP(item.gananciaNeta)}
                  </TableCell>

                  {/* 13. Margen (%) */}
                  <TableCell className="text-center p-2">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        item.margenRentabilidad >= 50
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}
                    >
                      {formatPercentage(item.margenRentabilidad)}
                    </Badge>
                  </TableCell>

                  {/* 14. Total Cliente (IVA 19%) */}
                  <TableCell className="text-right p-2 font-bold text-foreground">
                    {formatCLP(item.totalClienteIva)}
                  </TableCell>

                  {/* 15. Justificación & Benchmark */}
                  <TableCell className="py-2.5 px-3 max-w-[300px]">
                    <div className="text-[11px] text-slate-800 dark:text-slate-200 leading-snug">
                      {item.justificacion}
                    </div>
                    <div className="text-[10px] text-indigo-700 dark:text-indigo-400 font-semibold mt-1">
                      📊 {item.benchmarkCompetencia}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogBody>

      {/* Pie de Página con Métricas Globales y Acciones */}
      <DialogFooter className="px-6 py-3.5 border-t border-border/80 bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Ganancia Proyectada DUO:</span>
            <span className="font-black text-emerald-400 text-sm">{formatCLP(totalGananciaProyectada)}</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
            <span className="text-slate-400">Aumento vs Modelo 100% Empresa:</span>
            <span className="font-bold text-amber-300 text-xs">+{formatCLP(totalAhorroTributarioEmpresa)}</span>
          </div>
          <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 border-l border-slate-700 pl-4">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            <span>Al guardar, este asistente desaparecerá permanentemente.</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
          >
            <X className="h-3.5 w-3.5 mr-1" />
            Cerrar sin Aplicar
          </Button>

          <Button
            type="button"
            onClick={handleSaveDefinitive}
            disabled={loading || selectedCount === 0}
            className="text-xs font-bold gap-2 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md px-4 h-9"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            Aceptar y Guardar Tarifas Definitivas ({selectedCount}) [Regla 50/50]
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
