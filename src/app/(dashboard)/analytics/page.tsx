'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { KpiCards } from '@/components/analytics/kpi-cards';
import { RevenueChart } from '@/components/analytics/revenue-chart';
import { CostDistribution } from '@/components/analytics/cost-distribution';
import { Select } from '@/components/ui/select';
import { FinancialSummary, MonthlyData, CostCategory, Event, EventItem } from '@/types';
import { COST_CATEGORIES } from '@/lib/constants';
import { getMonthName } from '@/lib/utils';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AnalyticsPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState('0');
  const [loading, setLoading] = useState(true);
  
  const [summary, setSummary] = useState<FinancialSummary>({
    totalIngresosBrutos: 0,
    facturacionNeta: 0,
    costosOperativos: 0,
    utilidadNeta: 0,
    margenPromedio: 0,
    ivaDebitoFiscal: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [costDistribution, setCostDistribution] = useState<CostCategory[]>([]);

  const [filteredEventsRaw, setFilteredEventsRaw] = useState<(Event & { event_items: EventItem[] })[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          name,
          client_company,
          event_date,
          location,
          event_items (*)
        `)
        .eq('status', 'completed')
        .is('deleted_at', null);
        
      const events = (data as (Event & { event_items: EventItem[] })[]) || [];

      if (error || !events.length) {
        setSummary({ totalIngresosBrutos: 0, facturacionNeta: 0, costosOperativos: 0, utilidadNeta: 0, margenPromedio: 0, ivaDebitoFiscal: 0 });
        setFilteredEventsRaw([]);
        setLoading(false);
        return;
      }

      let totalIngresosBrutos = 0;
      let facturacionNeta = 0;
      let costosOperativos = 0;
      let utilidadNeta = 0;
      let ivaDebitoFiscal = 0;
      let margenSum = 0;
      let itemCount = 0;

      const monthlyMap = new Map<string, { ventas: number; costos: number }>();
      const costMap = new Map<string, number>();
      
      const validEvents: typeof events = [];

      events.forEach(event => {
        if (!event.event_date) return;
        
        const date = new Date(event.event_date);
        const year = date.getFullYear().toString();
        const monthNum = date.getMonth() + 1;
        
        if (year !== selectedYear) return;
        if (selectedMonth !== '0' && monthNum.toString() !== selectedMonth) return;

        validEvents.push(event);

        const monthKey = getMonthName(monthNum);
        
        if (!monthlyMap.has(monthKey)) {
          monthlyMap.set(monthKey, { ventas: 0, costos: 0 });
        }

        event.event_items.forEach((item: any) => {
          const qty = item.cantidad || 1;
          const vTotal = (item.valor_total || 0) * qty;
          const vNeto = (item.valor_neto || 0) * qty;
          const costo = (item.costo || 0) * qty;
          const ganancia = (item.ganancia || 0) * qty;
          const iva = (item.iva || 0) * qty;

          totalIngresosBrutos += vTotal;
          facturacionNeta += vNeto;
          costosOperativos += costo;
          utilidadNeta += ganancia;
          ivaDebitoFiscal += iva;

          if (item.margen) {
            margenSum += item.margen;
            itemCount++;
          }

          const mData = monthlyMap.get(monthKey)!;
          mData.ventas += vTotal;
          mData.costos += costo;

          const categoryOptions: Record<string, string> = typeof COST_CATEGORIES === 'object' ? COST_CATEGORIES : {};
          const category = categoryOptions[item.servicio] || 'Otros';
          costMap.set(category, (costMap.get(category) || 0) + costo);
        });
      });

      setSummary({
        totalIngresosBrutos,
        facturacionNeta,
        costosOperativos,
        utilidadNeta,
        margenPromedio: itemCount > 0 ? (margenSum / itemCount) : 0,
        ivaDebitoFiscal
      });

      setMonthlyData(
        Array.from(monthlyMap.entries()).map(([month, data]) => ({
          month,
          ...data
        }))
      );

      const totalCosts = Array.from(costMap.values()).reduce((a, b) => a + b, 0);
      setCostDistribution(
        Array.from(costMap.entries()).map(([name, value]) => ({
          name,
          value,
          percentage: totalCosts > 0 ? (value / totalCosts) * 100 : 0
        })).filter(c => c.value > 0)
      );

      setFilteredEventsRaw(validEvents);
      setLoading(false);
    };

    fetchData();
  }, [selectedYear, selectedMonth]);

  const years = ['2024', '2025', '2026', '2027'];
  const months = [
    { value: '0', label: 'Todos' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  const handleExportExcel = async () => {
    // Dynamic import to avoid SSR issues
    const XLSX = await import('xlsx');
    
    // 1. Resumen Global Sheet
    const wsResumen = XLSX.utils.json_to_sheet([{
      'Período': selectedMonth === '0' ? `Año ${selectedYear}` : `${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`,
      'Total Ingresos Brutos': summary.totalIngresosBrutos,
      'Facturación Neta': summary.facturacionNeta,
      'Costos Operativos': summary.costosOperativos,
      'Utilidad Neta (Ganancia)': summary.utilidadNeta,
      'IVA Débito Fiscal': summary.ivaDebitoFiscal,
      'Margen Promedio (%)': summary.margenPromedio.toFixed(2),
    }]);

    // 2. Eventos Sheet
    const eventosExport = filteredEventsRaw.map(ev => ({
      'ID Evento': ev.id,
      'Nombre': ev.name,
      'Empresa': ev.client_company,
      'Fecha': ev.event_date,
      'Lugar': ev.location,
      'Ítems Totales': ev.event_items.length,
    }));
    const wsEventos = XLSX.utils.json_to_sheet(eventosExport);

    // 3. Detalle de Ítems (Costos) Sheet
    const itemsExport: any[] = [];
    filteredEventsRaw.forEach(ev => {
      ev.event_items.forEach((item: any) => {
        itemsExport.push({
          'Evento': ev.name,
          'Servicio': item.servicio,
          'Detalle': item.detalle,
          'Cantidad': item.cantidad,
          'Costo Unit.': item.costo,
          'Ganancia Unit.': item.ganancia,
          'Valor Neto': item.valor_neto,
          'IVA': item.iva,
          'Valor Total': item.valor_total,
          'Margen (%)': item.margen,
          'Tipo Doc. Costo': item.tipo_doc_costo,
          'URL Factura': item.factura_url || 'No adjunta',
        });
      });
    });
    const wsItems = XLSX.utils.json_to_sheet(itemsExport);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Financiero');
    XLSX.utils.book_append_sheet(wb, wsEventos, 'Eventos Completados');
    XLSX.utils.book_append_sheet(wb, wsItems, 'Detalle de Costos');

    const fileName = `Reporte_Contable_${selectedYear}_${selectedMonth === '0' ? 'Anual' : selectedMonth}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Consolidación Financiera</h1>
          <p className="text-muted-foreground">Análisis de rendimiento y métricas de eventos completados.</p>
        </div>
        <div className="flex gap-2">
          <Select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(e.target.value)} 
            options={years.map(y => ({value: y, label: y}))} 
          />
          <Select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)} 
            options={months} 
          />
          <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={loading || summary.totalIngresosBrutos === 0}>
            <Download className="mr-2 h-4 w-4" /> Exportar Excel
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : summary.totalIngresosBrutos === 0 ? (
        <div className="flex justify-center items-center h-64 border rounded-lg border-dashed bg-muted/20">
          <p className="text-muted-foreground">No hay datos financieros para el período seleccionado.</p>
        </div>
      ) : (
        <>
          <KpiCards data={summary} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueChart data={monthlyData} />
            <CostDistribution data={costDistribution} />
          </div>
        </>
      )}
    </div>
  );
}
