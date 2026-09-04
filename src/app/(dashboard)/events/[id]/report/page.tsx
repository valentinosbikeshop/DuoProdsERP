'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Event, EventItem } from '@/types';
import { PdfGenerator } from '@/components/reports/pdf-generator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCLP, formatPercentage } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', params.id)
        .single();
      
      if (eventError || !eventData) {
        setLoading(false);
        return;
      }

      const event = eventData as Event;
      if (event.status !== 'completed') {
        router.push(`/events/${params.id}`);
        return;
      }

      setEvent(event);

      const { data: itemsData } = await supabase
        .from('event_items')
        .select('*')
        .eq('event_id', params.id);
      
      if (itemsData) {
        setItems(itemsData);
      }
      setLoading(false);
    };

    fetchData();
  }, [params.id, router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!event) return <div>Evento no encontrado.</div>;

  let totalCostos = 0;
  let totalGanancia = 0;
  let ivaDebito = 0;
  let ivaCredito = 0;
  let totalFacturado = 0;

  items.forEach(item => {
    const qty = item.cantidad || 1;
    const rawCostoTotal = (item.costo || 0) * qty;
    totalGanancia += (item.ganancia || 0) * qty;
    
    // IVA Débito (Ventas al cliente)
    ivaDebito += (item.iva || 0) * qty;
    
    // Costos e IVA Crédito según tipo de documento
    if (item.tipo_doc_costo === 'factura') {
      const netCosto = Math.round((item.costo || 0) / 1.19) * qty;
      totalCostos += netCosto;
      ivaCredito += (rawCostoTotal - netCosto);
    } else {
      totalCostos += rawCostoTotal;
    }
    
    totalFacturado += (item.valor_total || 0) * qty;
  });

  const ivaAPagar = ivaDebito - ivaCredito;
  const utilidadNetaReal = totalGanancia; // Assuming total ganancia is the actual net profit before income tax
  const rentabilidad = totalCostos > 0 ? (totalGanancia / totalCostos) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/events/${params.id}`} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Informe Contable Financiero</h1>
            <p className="text-muted-foreground">{event.name}</p>
          </div>
        </div>
        <PdfGenerator event={event} items={items} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Flujo de Salida (Costos)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCLP(totalCostos)}</div>
            <p className="text-xs text-muted-foreground mt-1">Costo base de proveedores</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Flujo de Entrada (Facturación)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{formatCLP(totalFacturado)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total cobrado al cliente (Costo + Ganancia + IVA)</p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-emerald-700">Utilidad Neta (Ganancia Libre)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{formatCLP(utilidadNetaReal)}</div>
            <p className="text-xs text-emerald-600/80 mt-1">Margen global: {formatPercentage(rentabilidad)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Resumen Tributario (IVA)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA Débito (Ventas):</span>
              <span className="font-medium text-orange-600">{formatCLP(ivaDebito)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">IVA Crédito (Compras):</span>
              <span className="font-medium text-green-600">-{formatCLP(ivaCredito)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold pt-1 border-t mt-1">
              <span>IVA a Pagar (SII):</span>
              <span className={ivaAPagar > 0 ? "text-red-600" : "text-green-600"}>
                {formatCLP(ivaAPagar)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle de Servicios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Servicio</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Cant.</th>
                  <th className="px-4 py-3">Costo</th>
                  <th className="px-4 py-3">Ganancia</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{item.servicio}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.detalle}</td>
                    <td className="px-4 py-3">{item.cantidad}</td>
                    <td className="px-4 py-3">{formatCLP(item.costo)}</td>
                    <td className="px-4 py-3">{formatCLP(item.ganancia)}</td>
                    <td className="px-4 py-3">{formatCLP((item.valor_total || 0) * (item.cantidad || 1))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
