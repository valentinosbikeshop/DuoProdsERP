'use client';

import React, { useState } from 'react';
import { jsPDF } from 'jspdf';
import { EventItem, Event } from '@/types';
import { formatCLP, formatDateCL } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogBody,
} from '@/components/ui/dialog';
import { 
  FileText, 
  Download, 
  Loader2, 
  Video, 
  Building2, 
  MapPin, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Check, 
  Plus, 
  Trash2,
  ExternalLink
} from 'lucide-react';

interface ClientQuotePdfDialogProps {
  event: Event;
  items: EventItem[];
  triggerButton?: React.ReactNode;
}

interface VideoPreset {
  id: string;
  title: string;
  url: string;
}

const DEFAULT_VIDEO_PRESETS: VideoPreset[] = [
  {
    id: 'duo-cuerdas',
    title: 'Dúo de Cuerdas (Violín & Chelo) - Ceremonias y Cóctel',
    url: 'https://www.youtube.com/watch?v=sample-duo-cuerdas',
  },
  {
    id: 'solista-violin',
    title: 'Solista Violín Clásico & Pop - Show en Vivo',
    url: 'https://www.youtube.com/watch?v=sample-solista-violin',
  },
  {
    id: 'cuarteto-gala',
    title: 'Cuarteto de Cuerdas de Gala - Eventos Corporativos',
    url: 'https://www.youtube.com/watch?v=sample-cuarteto-gala',
  },
  {
    id: 'trio-jazz',
    title: 'Trío Jazz & Bossa Nova - Recepciones y Cenas',
    url: 'https://www.youtube.com/watch?v=sample-trio-jazz',
  },
];

export function ClientQuotePdfDialog({ event, items, triggerButton }: ClientQuotePdfDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Form states
  const [clientName, setClientName] = useState(event.client_company || event.name || '');
  const [clientRut, setClientRut] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [eventLocation, setEventLocation] = useState(event.location || 'Rancagua / Machalí');
  const [eventDate, setEventDate] = useState(event.event_date ? formatDateCL(event.event_date) : '');
  const [eventDuration, setEventDuration] = useState('2 horas de servicio musical');
  const [eventSchedule, setEventSchedule] = useState('Horario a coordinar según pauta del evento');
  const [eventCalltime, setEventCalltime] = useState('Llegada: 45 a 60 min previos para montaje y prueba de sonido');
  const [eventRepertoire, setEventRepertoire] = useState('Repertorio personalizado y curaduría de estilos según la ocasión');
  const [validityDays, setValidityDays] = useState(7);

  // Selection of items to quote (by default all non-insumo approved items)
  const nonInsumoItems = items.filter(it => !it.es_insumo && (it.valor_total || 0) > 0);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    nonInsumoItems.map(it => it.id).filter(Boolean) as string[]
  );

  // Video links switch & custom list
  const [includeVideos, setIncludeVideos] = useState(false);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>(['duo-cuerdas', 'solista-violin']);
  const [customVideos, setCustomVideos] = useState<{ title: string; url: string }[]>([]);
  const [newCustomTitle, setNewCustomTitle] = useState('');
  const [newCustomUrl, setNewCustomUrl] = useState('');

  // Handle adding custom video
  const handleAddCustomVideo = () => {
    if (!newCustomTitle.trim() || !newCustomUrl.trim()) return;
    setCustomVideos(prev => [...prev, { title: newCustomTitle.trim(), url: newCustomUrl.trim() }]);
    setNewCustomTitle('');
    setNewCustomUrl('');
  };

  const handleRemoveCustomVideo = (index: number) => {
    setCustomVideos(prev => prev.filter((_, idx) => idx !== index));
  };

  const toggleItemSelection = (id: string) => {
    setSelectedItemIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleAllItems = () => {
    if (selectedItemIds.length === nonInsumoItems.length) {
      setSelectedItemIds([]);
    } else {
      setSelectedItemIds(nonInsumoItems.map(it => it.id).filter(Boolean) as string[]);
    }
  };

  const toggleVideoPreset = (id: string) => {
    setSelectedVideoIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Generate Formal PDF using genuine DUO template structure
  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF('p', 'mm', 'letter');
      const pageWidth = 215.9;
      const marginX = 16;
      const contentWidth = pageWidth - (marginX * 2); // 183.9 mm
      const todayStr = new Date().toLocaleDateString('es-CL', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });

      let currentY = 18;

      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > 260) {
          doc.addPage();
          currentY = 20;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(140, 140, 140);
          doc.text(`DUO Producciones • Cotización formal: ${clientName}`, marginX, 12);
          doc.text(`Página ${doc.getNumberOfPages()}`, marginX + contentWidth - 15, 12);
          doc.setDrawColor(220, 225, 230);
          doc.line(marginX, 14, marginX + contentWidth, 14);
        }
      };

      // 1. HEADER INSTITUCIONAL
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(18, 28, 48); // Navy corporativo
      doc.text('DUO PRODUCCIONES', marginX, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(90, 105, 125);
      doc.text('PRODUCCIÓN DE EVENTOS, EXPERIENCIAS MUSICALES & SERVICIOS TÉCNICOS', marginX, currentY + 5);

      // Bloque derecho de cotización
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(18, 28, 48);
      doc.text('COTIZACIÓN FORMAL', marginX + contentWidth, currentY, { align: 'right' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 115, 130);
      doc.text(`Fecha: ${todayStr}`, marginX + contentWidth, currentY + 5, { align: 'right' });
      doc.text(`Validez: ${validityDays} días hábiles`, marginX + contentWidth, currentY + 9, { align: 'right' });

      currentY += 14;
      doc.setDrawColor(200, 210, 220);
      doc.setLineWidth(0.6);
      doc.line(marginX, currentY, marginX + contentWidth, currentY);
      currentY += 8;

      // 2. SALUDO FORMAL
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 34, 54);
      doc.text(`Estimado/a ${clientName || 'Cliente'}:`, marginX, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(60, 75, 95);
      const greetingParagraph = "Como equipo DUO Producciones agradecemos su confianza y preferencia al contactarnos para ser parte de su importante evento. A continuación, ponemos a su disposición nuestra propuesta formal y técnica adaptada a sus requerimientos:";
      const splitGreeting = doc.splitTextToSize(greetingParagraph, contentWidth);
      doc.text(splitGreeting, marginX, currentY);
      currentY += (splitGreeting.length * 4.2) + 4;

      // 3. CUADRO DE DETALLES DEL EVENTO
      checkPageBreak(38);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, currentY, contentWidth, 34, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('DATOS GENERALES DEL EVENTO', marginX + 4, currentY + 6);

      const colLeftX = marginX + 4;
      const colRightX = marginX + (contentWidth / 2) + 2;

      doc.setFontSize(8.5);
      // Columna Izquierda
      doc.setFont('helvetica', 'bold');
      doc.text('Tipo de Evento:', colLeftX, currentY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(event.name || 'Presentación Musical', colLeftX + 24, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Fecha:', colLeftX, currentY + 19);
      doc.setFont('helvetica', 'normal');
      doc.text(eventDate || 'A convenir', colLeftX + 13, currentY + 19);

      doc.setFont('helvetica', 'bold');
      doc.text('Lugar:', colLeftX, currentY + 25);
      doc.setFont('helvetica', 'normal');
      doc.text((eventLocation || 'Rancagua / Machalí').substring(0, 35), colLeftX + 13, currentY + 25);

      doc.setFont('helvetica', 'bold');
      doc.text('Duración:', colLeftX, currentY + 31);
      doc.setFont('helvetica', 'normal');
      doc.text(eventDuration || '2 horas', colLeftX + 18, currentY + 31);

      // Columna Derecha
      doc.setFont('helvetica', 'bold');
      doc.text('Horario:', colRightX, currentY + 13);
      doc.setFont('helvetica', 'normal');
      doc.text(eventSchedule || 'A convenir con productora', colRightX + 15, currentY + 13);

      doc.setFont('helvetica', 'bold');
      doc.text('Llegada:', colRightX, currentY + 19);
      doc.setFont('helvetica', 'normal');
      doc.text('45-60 min previos para prueba técnica', colRightX + 15, currentY + 19);

      doc.setFont('helvetica', 'bold');
      doc.text('Repertorio:', colRightX, currentY + 25);
      doc.setFont('helvetica', 'normal');
      const repLines = doc.splitTextToSize(eventRepertoire || 'Selección personalizada', (contentWidth / 2) - 22);
      doc.text(repLines, colRightX + 20, currentY + 25);

      currentY += 40;

      // 4. FICHA TÉCNICA Y PROTOCOLO
      checkPageBreak(28);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text('FICHA TÉCNICA & CONDICIONES INCLUIDAS', marginX, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(70, 85, 105);
      const technicalBullets = [
        "• Personal y Músicos: Intérpretes profesionales egresados de conservatorio y staff técnico capacitado.",
        "• Equipamiento de Sonido: Amplificación profesional propia e inalámbrica según la acústica del recinto.",
        "• Mobiliario & Atriles: Atriles profesionales de concierto, banquetas e iluminación autónoma de partituras.",
        "• Vestimenta: Rigurosa etiqueta formal institucional acorde a la solemnidad de su evento.",
        "• Requisitos de Instalación: Punto eléctrico 220V a menos de 15 metros y espacio protegido de lluvia o sol directo."
      ];
      technicalBullets.forEach(bullet => {
        doc.text(bullet, marginX + 2, currentY);
        currentY += 4.2;
      });
      currentY += 4;

      // 5. TABLA DE PROPUESTA ECONÓMICA (VALORES CLIENTE)
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(18, 28, 48);
      doc.text('PROPUESTA ECONÓMICA DE SERVICIOS', marginX, currentY);
      currentY += 4;

      // Cabecera de la tabla
      doc.setFillColor(26, 38, 57);
      doc.rect(marginX, currentY, contentWidth, 7, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);
      doc.text('N°', marginX + 3, currentY + 4.8);
      doc.text('Servicio / Ítem', marginX + 11, currentY + 4.8);
      doc.text('Detalle Técnico', marginX + 66, currentY + 4.8);
      doc.text('Cant.', marginX + 120, currentY + 4.8, { align: 'center' });
      doc.text('Valor Neto', marginX + 150, currentY + 4.8, { align: 'right' });
      doc.text('Total Neto', marginX + contentWidth - 4, currentY + 4.8, { align: 'right' });
      currentY += 7;

      // Filas de la tabla
      const itemsToQuote = nonInsumoItems.filter(it => it.id && selectedItemIds.includes(it.id));
      let subtotalNeto = 0;

      itemsToQuote.forEach((item, index) => {
        checkPageBreak(12);
        const itemNeto = (item.valor_neto || 0);
        const itemQty = item.cantidad || 1;
        const totalNetoRow = itemNeto * itemQty;
        subtotalNeto += totalNetoRow;

        const isEven = index % 2 === 0;
        if (isEven) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 250, 252);
        }
        doc.rect(marginX, currentY, contentWidth, 7, 'F');
        doc.setDrawColor(235, 240, 245);
        doc.line(marginX, currentY + 7, marginX + contentWidth, currentY + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40, 50, 65);

        doc.text(String(index + 1), marginX + 3, currentY + 4.8);
        doc.text((item.servicio || 'Servicio').substring(0, 32), marginX + 11, currentY + 4.8);
        doc.text((item.detalle || '-').substring(0, 38), marginX + 66, currentY + 4.8);
        doc.text(String(itemQty), marginX + 120, currentY + 4.8, { align: 'center' });
        doc.text(formatCLP(itemNeto), marginX + 150, currentY + 4.8, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(formatCLP(totalNetoRow), marginX + contentWidth - 4, currentY + 4.8, { align: 'right' });

        currentY += 7;
      });

      const totalIva = Math.round(subtotalNeto * 0.19);
      const totalGeneral = subtotalNeto + totalIva;

      // Cuadro de Totales (Alineado a la derecha)
      currentY += 2;
      checkPageBreak(30);
      const totalsBoxWidth = 85;
      const totalsBoxX = marginX + contentWidth - totalsBoxWidth;

      doc.setFillColor(245, 248, 252);
      doc.setDrawColor(215, 225, 235);
      doc.roundedRect(totalsBoxX, currentY, totalsBoxWidth, 23, 2, 2, 'FD');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(60, 75, 95);
      doc.text('Subtotal Neto:', totalsBoxX + 5, currentY + 6);
      doc.text(formatCLP(subtotalNeto), totalsBoxX + totalsBoxWidth - 5, currentY + 6, { align: 'right' });

      doc.text('IVA (19%):', totalsBoxX + 5, currentY + 12);
      doc.text(formatCLP(totalIva), totalsBoxX + totalsBoxWidth - 5, currentY + 12, { align: 'right' });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(18, 28, 48);
      doc.text('VALOR TOTAL (CLP):', totalsBoxX + 5, currentY + 19);
      doc.setTextColor(16, 120, 70); // Verde distinguido
      doc.text(formatCLP(totalGeneral), totalsBoxX + totalsBoxWidth - 5, currentY + 19, { align: 'right' });

      currentY += 28;

      // 6. CONDICIONES COMERCIALES Y RESERVA
      checkPageBreak(40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(18, 28, 48);
      doc.text('CONDICIONES DE PAGO & RESERVA', marginX, currentY);
      currentY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 75, 95);
      const conditions = [
        "1. Reserva de Fecha: Para asegurar la exclusividad en la agenda oficial se solicita un abono del 50% al momento de aceptar la cotización.",
        "2. Saldo Restante: El 50% pendiente se cancela hasta 24 horas antes o el mismo día del evento previo al inicio de la presentación.",
        `3. Validez de Oferta: Esta cotización mantiene sus valores vigentes durante ${validityDays} días hábiles a contar de su emisión.`
      ];
      conditions.forEach(cond => {
        doc.text(cond, marginX + 2, currentY);
        currentY += 4.2;
      });
      currentY += 3;

      // 7. CUADRO BANCARIO OFICIAL
      checkPageBreak(28);
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(200, 215, 230);
      doc.setLineWidth(0.4);
      doc.roundedRect(marginX, currentY, contentWidth, 24, 2, 2, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(18, 28, 48);
      doc.text('DATOS OFICIALES PARA TRANSFERENCIA BANCARIA', marginX + 5, currentY + 5.5);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(50, 65, 85);

      doc.text('• Banco: Banco de Chile', marginX + 5, currentY + 11);
      doc.text('• Tipo de Cuenta: Cuenta Corriente', marginX + 5, currentY + 16);
      doc.text('• N° de Cuenta: 00-202-19108-07', marginX + 5, currentY + 21);

      doc.text('• Titular: DUO Producciones SpA', marginX + 90, currentY + 11);
      doc.text('• RUT: 78.252.253-1', marginX + 90, currentY + 16);
      doc.text('• Correo comprobantes: kpunsin@gmail.com / duoprods.empresa@gmail.com', marginX + 90, currentY + 21);

      currentY += 29;

      // 8. SECCIÓN OPCIONAL DE VIDEOS DEMOSTRATIVOS
      if (includeVideos) {
        const activePresets = DEFAULT_VIDEO_PRESETS.filter(vp => selectedVideoIds.includes(vp.id));
        const allVideosToInclude = [
          ...activePresets.map(p => ({ title: p.title, url: p.url })),
          ...customVideos
        ];

        if (allVideosToInclude.length > 0) {
          checkPageBreak(35);
          doc.setFillColor(243, 246, 252);
          doc.setDrawColor(200, 215, 240);
          doc.roundedRect(marginX, currentY, contentWidth, 7 + (allVideosToInclude.length * 5.5), 2, 2, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8.5);
          doc.setTextColor(26, 54, 93);
          doc.text('REGISTRO AUDIOVISUAL & MUESTRAS DEMOSTRATIVAS', marginX + 5, currentY + 5);

          let videoY = currentY + 10;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);

          allVideosToInclude.forEach((video) => {
            doc.setTextColor(40, 60, 90);
            doc.text(`▶ ${video.title}:`, marginX + 6, videoY);
            doc.setTextColor(20, 80, 180); // Azul link
            doc.textWithLink(video.url, marginX + 85, videoY, { url: video.url });
            videoY += 5.5;
          });

          currentY = videoY + 4;
        }
      }

      // 9. PIE DE PÁGINA FINAL
      checkPageBreak(18);
      currentY += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(110, 125, 140);
      doc.text('DUO Producciones SpA • Creación, Producción y Arte Musical • Rancagua, Chile', marginX + (contentWidth / 2), currentY, { align: 'center' });
      doc.text('Contacto Comercial: duoprods.empresa@gmail.com | +56 9 8229 0332', marginX + (contentWidth / 2), currentY + 4.5, { align: 'center' });

      // Guardar PDF
      const sanitizedName = (clientName || 'Cliente').replace(/[^a-zA-Z0-9_-]/g, '_');
      doc.save(`Cotizacion_DUO_${sanitizedName}_${new Date().toISOString().slice(0, 10)}.pdf`);
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error al generar PDF de cotización:', err);
      alert('Error al generar el PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      {triggerButton ? (
        <span onClick={() => setIsOpen(true)} className="cursor-pointer inline-flex">
          {triggerButton}
        </span>
      ) : (
        <Button 
          type="button"
          onClick={() => setIsOpen(true)}
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-xs font-medium cursor-pointer"
        >
          <FileText className="h-3.5 w-3.5" />
          Cotización Formal (PDF)
        </Button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen} className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-slate-900 text-white">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Generador de Cotización Formal para Cliente
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Genera un documento PDF impecable con el membrete oficial de DUO, ocultando costos y márgenes internos.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5 pt-3">
          {/* Bloque 1: Datos del Cliente */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-primary" />
              Información del Cliente & Destinatario
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Nombre Cliente / Empresa</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Ej: Toyota Chile / Javiera Román"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">RUT Cliente (Opcional)</Label>
                <Input
                  value={clientRut}
                  onChange={(e) => setClientRut(e.target.value)}
                  placeholder="Ej: 76.123.456-7"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Ubicación / Ciudad</Label>
                <Input
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Ej: Club de Polo San Cristóbal / Rancagua"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Fecha del Evento</Label>
                <Input
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="Ej: 14 de Febrero de 2027"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* Bloque 2: Ficha Técnica & Plazos */}
          <div className="bg-muted/30 border border-border/70 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />
              Especificaciones Técnicas & Duración
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-muted-foreground">Duración del Servicio</Label>
                <Input
                  value={eventDuration}
                  onChange={(e) => setEventDuration(e.target.value)}
                  placeholder="Ej: 2 horas de presentación"
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-[11px] text-muted-foreground">Validez de Oferta (Días)</Label>
                <Input
                  type="number"
                  min={1}
                  max={60}
                  value={validityDays}
                  onChange={(e) => setValidityDays(parseInt(e.target.value) || 7)}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label className="text-[11px] text-muted-foreground">Curaduría Musical / Repertorio</Label>
                <Input
                  value={eventRepertoire}
                  onChange={(e) => setEventRepertoire(e.target.value)}
                  placeholder="Ej: Repertorio clásico en ceremonia y bossa nova contemporánea en cóctel"
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>
          </div>

          {/* Bloque 3: Selección de Ítems a Cotizar */}
          <div className="border border-border/70 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Servicios a Incluir en la Cotización ({selectedItemIds.length}/{nonInsumoItems.length})
              </h4>
              <button
                type="button"
                onClick={toggleAllItems}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                {selectedItemIds.length === nonInsumoItems.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            {nonInsumoItems.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">
                No hay servicios en el presupuesto oficial. Puedes crearlos o aprobarlos desde la pestaña Borrador.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {nonInsumoItems.map((item) => {
                  const isSelected = item.id ? selectedItemIds.includes(item.id) : false;
                  return (
                    <label
                      key={item.id}
                      className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-primary/5 border-primary/30 text-foreground' 
                          : 'bg-background border-border/60 text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => item.id && toggleItemSelection(item.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <div>
                          <span className="font-semibold text-foreground">{item.servicio}</span>
                          {item.detalle && (
                            <span className="text-[11px] text-muted-foreground ml-2">({item.detalle})</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-foreground">
                          {formatCLP((item.valor_neto || 0) * (item.cantidad || 1))} + IVA
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bloque 4: Videos Demostrativos (100% Opcional) */}
          <div className="border border-border/70 rounded-xl p-4 space-y-3 bg-muted/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-blue-600" />
                <div>
                  <h4 className="text-xs font-semibold text-foreground">
                    Enlaces a Videos Demostrativos
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Elige si deseas adjuntar muestras audiovisuales del elenco para que el cliente las vea directamente.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeVideos}
                  onChange={(e) => setIncludeVideos(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {includeVideos && (
              <div className="pt-2 space-y-3 animate-in fade-in-50">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-medium text-foreground">Muestras del catálogo institucional:</span>
                  {DEFAULT_VIDEO_PRESETS.map((preset) => (
                    <label
                      key={preset.id}
                      className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background text-xs cursor-pointer hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedVideoIds.includes(preset.id)}
                          onChange={() => toggleVideoPreset(preset.id)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600"
                        />
                        <span className="font-medium text-foreground">{preset.title}</span>
                      </div>
                      <span className="text-[10px] text-blue-600 underline truncate max-w-[200px]">
                        {preset.url}
                      </span>
                    </label>
                  ))}
                </div>

                {/* Videos personalizados agregados */}
                {customVideos.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-medium text-foreground">Videos adicionales adjuntos:</span>
                    {customVideos.map((cv, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-md border border-border/60 bg-background text-xs"
                      >
                        <span className="font-medium text-foreground">{cv.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-blue-600 underline truncate max-w-[180px]">{cv.url}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomVideo(idx)}
                            className="text-red-500 hover:text-red-700 p-1"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Formulario para agregar video personalizado */}
                <div className="pt-2 border-t border-border/50">
                  <span className="text-[11px] font-medium text-muted-foreground mb-1.5 block">
                    + Adjuntar otro enlace de video personalizado:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                    <Input
                      placeholder="Título o Formato (Ej: Solo Saxo Cóctel)"
                      value={newCustomTitle}
                      onChange={(e) => setNewCustomTitle(e.target.value)}
                      className="sm:col-span-2 h-7 text-xs"
                    />
                    <Input
                      placeholder="URL (YouTube / Vimeo / Drive)"
                      value={newCustomUrl}
                      onChange={(e) => setNewCustomUrl(e.target.value)}
                      className="sm:col-span-2 h-7 text-xs"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddCustomVideo}
                      disabled={!newCustomTitle.trim() || !newCustomUrl.trim()}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Agregar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogBody>

        <DialogFooter className="mt-auto flex sm:justify-between items-center gap-2 border-t border-border/50 pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="text-xs text-muted-foreground"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleGeneratePDF}
            disabled={generating || selectedItemIds.length === 0}
            className="h-9 px-4 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white gap-2 shadow-sm"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            Generar y Descargar Cotización PDF
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
