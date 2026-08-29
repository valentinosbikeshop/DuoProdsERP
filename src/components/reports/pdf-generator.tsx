'use client';

import { jsPDF } from 'jspdf';
import { EventItem, Event } from '@/types';
import { formatCLP, formatPercentage } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';

export function PdfGenerator({ event, items }: { event: Event; items: EventItem[] }) {
  const [loading, setLoading] = useState(false);

  const generatePDF = async () => {
    setLoading(true);
    try {
      const doc = new jsPDF('p', 'mm', 'letter');
      const dateStr = new Date().toLocaleDateString('es-CL');

      // Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.text('DÚO PRODUCCIONES', 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Informe Contable de Evento', 105, 30, { align: 'center' });
      
      doc.setFontSize(10);
      doc.text(`Fecha de emisión: ${dateStr}`, 105, 38, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(20, 42, 196, 42);

      // Event Info
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Información del Evento', 20, 50);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const eventDate = event.event_date ? new Date(event.event_date).toLocaleDateString('es-CL') : 'N/A';
      doc.text(`Evento: ${event.name}`, 20, 60);
      doc.text(`Cliente: ${event.client_company || 'N/A'}`, 20, 66);
      doc.text(`Fecha: ${eventDate}`, 20, 72);
      doc.text(`Ubicación: ${event.location || 'N/A'}`, 20, 78);

      // Table Header
      let y = 90;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      
      const cols = {
        servicio: 20,
        detalle: 60,
        cant: 95,
        costo: 105,
        ganancia: 125,
        neto: 145,
        iva: 165,
        total: 180
      };

      doc.text('Servicio', cols.servicio, y);
      doc.text('Detalle', cols.detalle, y);
      doc.text('Cant.', cols.cant, y);
      doc.text('Costo', cols.costo, y);
      doc.text('Ganancia', cols.ganancia, y);
      doc.text('Neto', cols.neto, y);
      doc.text('IVA', cols.iva, y);
      doc.text('Total', cols.total, y);

      doc.setLineWidth(0.2);
      doc.line(20, y + 2, 196, y + 2);
      
      y += 8;

      // Table Rows
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      let totalCostos = 0;
      let totalGanancia = 0;
      let totalNeto = 0;
      let totalIva = 0;
      let totalFacturado = 0;

      items.forEach(item => {
        const rowCosto = (item.costo || 0) * (item.cantidad || 1);
        const rowGanancia = (item.ganancia || 0) * (item.cantidad || 1);
        const rowNeto = (item.valor_neto || 0) * (item.cantidad || 1);
        const rowIva = (item.iva || 0) * (item.cantidad || 1);
        const rowTotal = (item.valor_total || 0) * (item.cantidad || 1);

        totalCostos += rowCosto;
        totalGanancia += rowGanancia;
        totalNeto += rowNeto;
        totalIva += rowIva;
        totalFacturado += rowTotal;

        const servicioText = (item.servicio || '').substring(0, 20);
        const detalleText = (item.detalle || '').substring(0, 25);

        doc.text(servicioText, cols.servicio, y);
        doc.text(detalleText, cols.detalle, y);
        doc.text(String(item.cantidad || 1), cols.cant, y);
        doc.text(formatCLP(item.costo || 0), cols.costo, y);
        doc.text(formatCLP(item.ganancia || 0), cols.ganancia, y);
        doc.text(formatCLP(item.valor_neto || 0), cols.neto, y);
        doc.text(formatCLP(item.iva || 0), cols.iva, y);
        doc.text(formatCLP(item.valor_total || 0), cols.total, y);

        y += 6;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
      });

      doc.line(20, y, 196, y);
      y += 10;

      // Financial Summary
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('Resumen Financiero', 120, y);
      y += 6;
      doc.setFont('helvetica', 'normal');
      doc.text(`Total Costos Operativos: ${formatCLP(totalCostos)}`, 120, y); y += 6;
      doc.text(`Total Ganancia: ${formatCLP(totalGanancia)}`, 120, y); y += 6;
      doc.text(`Total Facturación Neta: ${formatCLP(totalNeto)}`, 120, y); y += 6;
      doc.text(`Total IVA: ${formatCLP(totalIva)}`, 120, y); y += 6;
      doc.setFont('helvetica', 'bold');
      doc.text(`Total Facturado: ${formatCLP(totalFacturado)}`, 120, y); y += 6;
      
      const rentabilidad = totalCostos > 0 ? (totalGanancia / totalCostos) * 100 : 0;
      doc.text(`Rentabilidad Neta: ${formatPercentage(rentabilidad)}`, 120, y);

      // Footer
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.text(`Documento generado por Dúo Producciones ERP - ${dateStr}`, 105, 270, { align: 'center' });

      doc.save(`informe-${event.name}-${dateStr}.pdf`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={generatePDF} disabled={loading}>
      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
      Descargar PDF
    </Button>
  );
}
