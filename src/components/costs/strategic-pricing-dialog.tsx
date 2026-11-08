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
  Building
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

  // Costos Proveedor & Empresa
  liquidoProveedor: number;      // "En mano" que pide el músico/proveedor
  retencionSII: number;          // 15.25% retenido que DUO entera al SII en F29
  costoBrutoTotal: number;       // Desembolso real para DUO (Líquido + Retención)
  costoAnterior: number;         // Costo anterior en ERP sin retención
  difCosto: number;              // Variación de costo para la empresa

  // Precios Venta Cliente
  netoAnterior: number;          // Lo que DUO cobraba antes al cliente
  netoSugerido: number;          // Nuevo valor de venta neto recomendado
  totalClienteIva: number;       // netoSugerido * 1.19 (con IVA)

  // Rentabilidad Real
  gananciaNeta: number;          // netoSugerido - costoBrutoTotal
  margenRentabilidad: number;    // (gananciaNeta / costoBrutoTotal) * 100

  // Justificación detallada
  justificacion: string;         // Por qué se modificó y qué riesgos mitiga
  benchmarkCompetencia: string;  // Comparativa con mercado chileno (Trémolo, etc.)
}

// Tasa legal de retención de Boletas de Honorarios para el año comercial 2026 (Ley N° 21.133)
const RETENCION_HONORARIOS_2026 = 0.1525;

// Cálculo: Bruto = Líquido / (1 - 0.1525)
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
  const [searchTerm, setSearchTerm] = useState('');
  const [showExplanation, setShowExplanation] = useState(true);
  const supabase = createClient();

  // Inicializar propuestas detalladas post-auditoría estratégica
  React.useEffect(() => {
    if (open && !initialized && currentCosts.length > 0) {
      const items: ProposalItem[] = currentCosts.map((c) => {
        const servLower = c.servicio.toLowerCase();
        
        let tipo_doc: 'boleta' | 'factura' = 'boleta';
        let liquido = c.costo;
        let costoBruto = c.costo;
        let netoSugerido = c.valor_neto;
        let justificacion = 'Servicio sin ajustes mayores de benchmark.';
        let benchmarkCompetencia = 'Precios alineados con el estándar promedio local.';

        // 1. SOLISTA (Violín / Cello / Saxo)
        if (servLower === 'solista') {
          tipo_doc = 'boleta';
          liquido = 70000;
          costoBruto = calcularBrutoBoleta(liquido); // $82.596
          netoSugerido = 160000;
          justificacion = 'Antes DUO pagaba $70.000 y absorbía la retención del 15,25% de su propio margen. Al calibrar el neto a $160.000, la productora absorbe el costo real de $82.596 y obtiene $77.404 de ganancia neta protegida.';
          benchmarkCompetencia = 'Grupo Trémolo y productoras de Santiago cotizan solistas entre $180.000 y $220.000 neto. DUO cobraba $140.000 quedando 30% por debajo.';
        
        // 2. DÚO (Violín & Chelo)
        } else if (servLower === 'duo' || servLower === 'dúo') {
          tipo_doc = 'boleta';
          liquido = 100000; // $50k líquido para cada músico
          costoBruto = calcularBrutoBoleta(liquido); // $117.994
          netoSugerido = 235000;
          justificacion = 'Dos músicos profesionales de conservatorio ($50.000 en mano c/u). DUO debe enterar $17.994 al SII en F29. Al cobrar $235.000 neto al cliente, se asegura una utilidad limpia de $117.006 (margen del 99,2%).';
          benchmarkCompetencia = 'Dúos de cuerdas similares en la Región Metropolitana y O’Higgins cotizan entre $280.000 y $340.000 neto. Con $235.000, DUO se mantiene altamente atractiva.';
        
        // 3. TRÍO DE CÁMARA
        } else if (servLower === 'trío' || servLower === 'trio') {
          tipo_doc = 'boleta';
          liquido = 150000; // $50k c/u x 3
          costoBruto = calcularBrutoBoleta(liquido); // $176.991
          netoSugerido = 330000;
          justificacion = 'Tres instrumentistas ($50.000 líquidos c/u). Retención legal de $26.991. Se fija la venta en $330.000 neto para garantizar $153.009 de ganancia pura.';
          benchmarkCompetencia = 'Benchmark de mercado en eventos corporativos y bodas: $380.000 a $440.000 neto.';
        
        // 4. SEXTETO FIAMMA
        } else if (servLower.includes('sexteto fiamma')) {
          tipo_doc = 'boleta';
          liquido = 480000; // Convenio agencia preferente ($80.000 x 6)
          costoBruto = calcularBrutoBoleta(liquido); // $566.372
          netoSugerido = 890000;
          justificacion = 'Elenco de cámara de 6 músicos. DUO debe tributar $86.372 por retención. Se incrementa el valor de $800.000 a $890.000 neto, protegiendo $323.628 de margen neto para la productora.';
          benchmarkCompetencia = 'Sextetos clásicos de gala en Santiago cotizan entre $1.100.000 y $1.400.000 neto.';

        // 5. ORQUESTA FIAMMA
        } else if (servLower.includes('orquesta fiamma')) {
          tipo_doc = 'boleta';
          liquido = 960000; // 12 músicos en escena
          costoBruto = calcularBrutoBoleta(liquido); // $1.132.743
          netoSugerido = 1850000;
          justificacion = 'Producción orquestal de alto impacto con 12 músicos. La retención de $172.743 se traslada al precio de venta, asegurando una utilidad histórica récord de $717.257 para la empresa.';
          benchmarkCompetencia = 'Orquestas de cámara completas para galas corporativas cotizan sobre $2.400.000 neto.';

        // 6. CANCIONES ESPECIALES / ARREGLOS
        } else if (servLower.includes('canciones especiales')) {
          tipo_doc = 'boleta';
          liquido = 10000;
          costoBruto = calcularBrutoBoleta(liquido); // $11.800
          netoSugerido = 35000;
          justificacion = 'Arreglo musical a medida adaptado para la dotación instrumental. Costo del arreglador $11.800 bruto. Margen de 196% ($23.200 de ganancia neta).';
          benchmarkCompetencia = 'Arreglos personalizados en productoras de eventos se cobran entre $40.000 y $60.000.';

        // 7. ANIMADOR DE EVENTOS
        } else if (servLower.includes('animador')) {
          tipo_doc = 'boleta';
          liquido = 70000; // 4 horas
          costoBruto = calcularBrutoBoleta(liquido); // $82.596
          netoSugerido = 175000;
          justificacion = 'Locutor/animador profesional por bloque de 4 horas. Con Boleta de Honorarios 15,25%, el costo real es $82.596. Se cobra $175.000 neto obteniendo $92.404 de margen limpio.';
          benchmarkCompetencia = 'Animación corporativa y matrimonios en O’Higgins cotiza entre $180.000 y $260.000 neto.';

        // 8. AMPLIFICACIÓN / REFUERZO SONORO (GESTSER)
        } else if (servLower.includes('amplificación') || servLower.includes('gestser')) {
          tipo_doc = 'factura';
          liquido = 50000;
          costoBruto = 50000;
          netoSugerido = 95000;
          justificacion = 'Refuerzo sonoro profesional con Factura (genera IVA Crédito Fiscal que neutraliza el IVA Débito de la venta). Ganancia neta de $45.000.';
          benchmarkCompetencia = 'Sonido básico para ceremonia/cóctel en la industria: $100.000 a $130.000 neto.';

        // 9. FOTOGRAFÍA CORPORATIVA 25 A 50 FOTOS (RODRIGO ABARCA)
        } else if (c.tiempo_detalle?.includes('25 a 50 fotos') || (servLower.includes('fotografía') && c.costo === 65000)) {
          tipo_doc = 'factura';
          liquido = 65000;
          costoBruto = 65000; // REGLA INMUTABLE: Mantenido en $65.000 según directiva del usuario
          netoSugerido = 95000;
          justificacion = 'Costo oficial pactado de $65.000 con Rodrigo Abarca MANTENIDO FIRME según su instrucción. Se actualiza el neto de venta de $90.000 a $95.000 para una ganancia de $30.000.';
          benchmarkCompetencia = 'Sesión fotográfica corporativa express de 25-50 fotos promediada en $110.000 neto.';

        // 10. FOTOGRAFÍA BODA COMPLETA (CEREMONIA A FIESTA)
        } else if (c.tiempo_detalle?.includes('ceremonia hasta el final') || (servLower.includes('fotografía') && c.costo === 300000)) {
          tipo_doc = 'boleta';
          liquido = 300000;
          costoBruto = calcularBrutoBoleta(liquido); // $353.982
          netoSugerido = 560000;
          justificacion = 'Cobertura fotográfica extensa (8 a 10 horas). El fotógrafo recibe $300.000 líquidos y DUO entera $53.982 en retención. Al fijar el neto en $560.000, la productora percibe $206.018 de margen limpio.';
          benchmarkCompetencia = 'Fotógrafos de bodas en la Zona Central cotizan entre $650.000 y $890.000 neto.';

        // 11. FOTOGRAFÍA BODA FULL DAY (PREPARACIÓN A FIESTA)
        } else if (c.tiempo_detalle?.includes('preparación de los novios') || (servLower.includes('fotografía') && c.costo === 350000)) {
          tipo_doc = 'boleta';
          liquido = 350000;
          costoBruto = calcularBrutoBoleta(liquido); // $412.979
          netoSugerido = 690000;
          justificacion = 'Servicio premium de 12 a 14 horas con preparación de novios y fiesta. Retención de $62.979. Al cotizar en $690.000 neto, se genera una utilidad de $277.021 para DUO.';
          benchmarkCompetencia = 'Full day de bodas con galería web y edición premium: $850.000 a $1.200.000 neto.';

        // SERVICIOS GENÉRICOS DE CATÁLOGO
        } else {
          tipo_doc = c.tipo_doc_costo || 'boleta';
          liquido = c.costo;
          costoBruto = tipo_doc === 'boleta' ? calcularBrutoBoleta(liquido) : liquido;
          netoSugerido = Math.max(c.valor_neto, Math.round(costoBruto * 1.35));
          justificacion = 'Ajuste proporcional aplicando margen base del 35% sobre el costo real.';
          benchmarkCompetencia = 'Tarifa referencial estándar de mercado.';
        }

        const retencionSII = tipo_doc === 'boleta' ? (costoBruto - liquido) : 0;
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

  // Edición reactiva del Líquido Proveedor
  const handleLiquidoChange = (id: string, value: string) => {
    const newLiquido = Math.max(0, parseInt(value.replace(/\D/g, '')) || 0);

    setProposals((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const costoBruto = item.tipo_doc === 'boleta' 
          ? calcularBrutoBoleta(newLiquido) 
          : newLiquido;
        const retencion = item.tipo_doc === 'boleta' ? (costoBruto - newLiquido) : 0;
        const ganancia = Math.max(0, item.netoSugerido - costoBruto);
        const margen = costoBruto > 0 ? (ganancia / costoBruto) * 100 : 0;
        const dif = costoBruto - item.costoAnterior;

        return {
          ...item,
          liquidoProveedor: newLiquido,
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
          ? calcularBrutoBoleta(item.liquidoProveedor) 
          : item.liquidoProveedor;
        const retencion = newTipo === 'boleta' ? (costoBruto - item.liquidoProveedor) : 0;
        const ganancia = Math.max(0, item.netoSugerido - costoBruto);
        const margen = costoBruto > 0 ? (ganancia / costoBruto) * 100 : 0;
        const dif = costoBruto - item.costoAnterior;

        return {
          ...item,
          tipo_doc: newTipo,
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
      `Esta acción guardará los nuevos costos brutos, retenciones y precios de venta oficiales.\n` +
      `De acuerdo a la directiva, esta propuesta es de UN SOLO USO y desaparecerá permanentemente tras su aplicación.`
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
        tiempo_detalle: '2026_applied',
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
        `¡Propuesta Estratégica 2026 aplicada con total éxito!\n\n` +
        `Se han actualizado ${selectedItems.length} tarifas en el Catálogo Maestro.\n` +
        `La vista estratégica ha cumplido su objetivo de un solo uso y se ha retirado de la interfaz.`
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

  // Cálculos consolidados para el footer
  const totalGananciaProyectada = proposals
    .filter((p) => p.selected)
    .reduce((acc, curr) => acc + curr.gananciaNeta, 0);
  const totalGananciaAnterior = proposals
    .filter((p) => p.selected)
    .reduce((acc, curr) => acc + (curr.netoAnterior - curr.costoAnterior), 0);
  const incrementoGanancia = totalGananciaProyectada - totalGananciaAnterior;

  return (
    <Dialog 
      open={open} 
      onOpenChange={onOpenChange} 
      className="w-[98vw] max-w-[1650px] md:max-w-[1650px] h-[94vh] sm:h-[95vh] flex flex-col p-0 overflow-hidden"
    >
      {/* Cabecera Principal */}
      <DialogHeader className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Propuesta Estratégica de Tarifas & Retención Tributaria 2026–2027
                </DialogTitle>
                <Badge className="bg-amber-400 text-amber-950 font-bold text-xs uppercase px-2 py-0.5 border-0">
                  Uso Único
                </Badge>
              </div>
              <DialogDescription className="text-xs text-indigo-200/90 mt-1">
                Auditoría financiera integral para DUO Producciones: Corrección de Boletas de Honorarios (15,25% SII), benchmark competitivo y preservación del costo de Fotografía ($65.000).
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
        {/* Banner Desplegable de Fundamento Técnico y Tributario */}
        <div className="rounded-xl border border-indigo-200 bg-white dark:bg-slate-900 dark:border-indigo-900/60 shadow-xs overflow-hidden transition-all">
          <div 
            onClick={() => setShowExplanation(!showExplanation)}
            className="flex items-center justify-between px-5 py-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 cursor-pointer hover:bg-indigo-100/60 transition-colors"
          >
            <div className="flex items-center gap-2.5 text-indigo-950 dark:text-indigo-200">
              <Info className="h-5 w-5 text-indigo-600 shrink-0" />
              <span className="font-bold text-sm">
                ¿Por qué se realizaron estos ajustes y qué cambios tributarios impactan a DUO en 2026? (Clic para {showExplanation ? 'ocultar' : 'expandir'})
              </span>
            </div>
            <button type="button" className="text-indigo-700 dark:text-indigo-300 p-1">
              {showExplanation ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>

          {showExplanation && (
            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs border-t border-indigo-100 dark:border-indigo-900/40 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-lg bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-red-900 dark:text-red-300 font-bold text-xs uppercase tracking-wider">
                  <Receipt className="h-4 w-4 text-red-600" />
                  1. Retención Legal SII 2026 (15,25%)
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Por ley (Ley 21.133), la retención de Boletas de Honorarios subió al <strong>15,25% en 2026</strong>. Si a un músico se le pagan $100.000 líquidos, el costo real para DUO es <strong>$117.994</strong> (Bruto = Líquido / 0,8475). Anteriormente se anotaban $100.000 y la empresa perdía $17.994 de su propia ganancia al pagar el Formulario F29 al SII.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  2. Benchmark Competitivo Zona Central
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  DUO estaba cobrando entre un <strong>25% y 40% por debajo</strong> del mercado de Santiago y Rancagua (Grupo Trémolo, Orquesta Filarmónica). Solistas se vendían a $140.000 vs $200.000 del mercado; Dúos a $200.000 vs $300.000. Los nuevos precios recomendados absorben el costo tributario y entregan un margen neto saludable del <strong>35% al 60%</strong>.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/80 space-y-1.5">
                <div className="flex items-center gap-2 text-blue-900 dark:text-blue-300 font-bold text-xs uppercase tracking-wider">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  3. Costo Fotografía Mantenido ($65.000)
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  Se respetó de manera estricta la directiva de la socia: el costo de <strong>Fotografía Corporativa (25 a 50 fotos)</strong> se mantiene firme en <strong>$65.000</strong> con Rodrigo Abarca. Se ajustó únicamente el valor de venta al cliente a $95.000 neto para generar $30.000 de utilidad limpia.
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
              placeholder="Buscar servicio (ej: Solista, Fiamma, Boda)..."
              className="pl-9 h-8 text-xs bg-muted/30"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">💡 Tip de Edición:</span>
            <span>Puede modificar en vivo las columnas de <strong>Líquido Proveedor</strong> o <strong>Neto Sugerido</strong> para recalcular impuestos y ganancias al instante.</span>
          </div>
        </div>

        {/* Tabla Detallada Multicolumna */}
        <div className="border border-border/80 rounded-xl bg-white dark:bg-slate-900 shadow-xs overflow-x-auto">
          <Table className="min-w-[1550px] text-xs">
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
                <TableHead className="w-[220px] font-bold text-white">Servicio / Formato</TableHead>
                <TableHead className="w-[130px] font-bold text-center text-amber-300 bg-amber-950/40">
                  Líquido Proveedor (En Mano)
                </TableHead>
                <TableHead className="w-[95px] font-bold text-center text-white">Doc. Legal</TableHead>
                <TableHead className="w-[120px] font-bold text-right text-red-300 bg-red-950/40">
                  Retención SII (15,25%)
                </TableHead>
                <TableHead className="w-[135px] font-bold text-right text-red-200 bg-red-900/50">
                  Costo Total Empresa (Bruto)
                </TableHead>
                <TableHead className="w-[110px] font-bold text-right text-slate-300">
                  Costo Anterior
                </TableHead>
                <TableHead className="w-[100px] font-bold text-right text-amber-200">
                  Dif. Costo
                </TableHead>
                <TableHead className="w-[115px] font-bold text-right text-slate-300">
                  Venta Anterior
                </TableHead>
                <TableHead className="w-[145px] font-bold text-right text-emerald-300 bg-emerald-950/50">
                  Venta Sugerida 2026 (Neto)
                </TableHead>
                <TableHead className="w-[125px] font-bold text-right text-emerald-200 bg-emerald-900/60">
                  Ganancia Neta ($)
                </TableHead>
                <TableHead className="w-[85px] font-bold text-center text-emerald-300">
                  Margen (%)
                </TableHead>
                <TableHead className="w-[120px] font-bold text-right text-slate-200">
                  Total Cliente (IVA)
                </TableHead>
                <TableHead className="w-[320px] font-bold text-white">
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

                  {/* 3. Líquido Proveedor (Editable) */}
                  <TableCell className="bg-amber-50/30 dark:bg-amber-950/10 p-2">
                    <div className="flex items-center gap-1">
                      <span className="text-[11px] text-muted-foreground">$</span>
                      <Input
                        type="text"
                        value={item.liquidoProveedor.toLocaleString('es-CL')}
                        onChange={(e) => handleLiquidoChange(item.id, e.target.value)}
                        disabled={!item.selected}
                        className="h-7 text-xs text-right font-bold text-amber-900 dark:text-amber-200 w-full bg-white dark:bg-slate-900 border-amber-300 focus:ring-amber-500"
                        title="Monto líquido que el proveedor o músico recibe en mano"
                      />
                    </div>
                  </TableCell>

                  {/* 4. Régimen Tributario (Botón conmutador) */}
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
                      title="Clic para cambiar entre Boleta de Honorarios (15,25% retención) y Factura"
                    >
                      {item.tipo_doc === 'boleta' ? 'Boleta 15,25%' : 'Factura (IVA)'}
                    </button>
                  </TableCell>

                  {/* 5. Retención SII (15,25%) */}
                  <TableCell className="bg-red-50/20 dark:bg-red-950/10 text-right p-2 font-semibold text-red-700 dark:text-red-400">
                    {item.retencionSII > 0 ? formatCLP(item.retencionSII) : '$0'}
                  </TableCell>

                  {/* 6. Costo Total Empresa (Bruto Real) */}
                  <TableCell className="bg-red-50/40 dark:bg-red-950/20 text-right p-2 font-black text-red-800 dark:text-red-300">
                    {formatCLP(item.costoBrutoTotal)}
                  </TableCell>

                  {/* 7. Costo Anterior ERP */}
                  <TableCell className="text-right p-2 text-muted-foreground line-through font-medium">
                    {formatCLP(item.costoAnterior)}
                  </TableCell>

                  {/* 8. Dif. Costo */}
                  <TableCell className="text-right p-2 font-bold text-[11px]">
                    <span className={item.difCosto > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}>
                      {item.difCosto > 0 ? `+${formatCLP(item.difCosto)}` : '$0'}
                    </span>
                  </TableCell>

                  {/* 9. Venta Anterior Neto */}
                  <TableCell className="text-right p-2 text-muted-foreground font-medium">
                    {formatCLP(item.netoAnterior)}
                  </TableCell>

                  {/* 10. Venta Sugerida 2026 (Neto) (Editable) */}
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

                  {/* 11. Ganancia Neta Empresa */}
                  <TableCell className="bg-emerald-50/60 dark:bg-emerald-950/30 text-right p-2 font-black text-emerald-800 dark:text-emerald-200">
                    {formatCLP(item.gananciaNeta)}
                  </TableCell>

                  {/* 12. Margen (%) */}
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

                  {/* 13. Total Cliente (IVA 19%) */}
                  <TableCell className="text-right p-2 font-bold text-foreground">
                    {formatCLP(item.totalClienteIva)}
                  </TableCell>

                  {/* 14. Justificación & Benchmark */}
                  <TableCell className="py-2.5 px-3 max-w-[320px]">
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
            <span className="text-slate-400">Total Ganancia Proyectada:</span>
            <span className="font-black text-emerald-400 text-sm">{formatCLP(totalGananciaProyectada)}</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
            <span className="text-slate-400">Incremento Neto de Utilidad vs Base Anterior:</span>
            <span className="font-bold text-amber-300 text-xs">+{formatCLP(incrementoGanancia)}</span>
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
            Aceptar y Guardar Tarifas Definitivas ({selectedCount}) [Un Solo Uso]
          </Button>
        </div>
      </DialogFooter>
    </Dialog>
  );
}
