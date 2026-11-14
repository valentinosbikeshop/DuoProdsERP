'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Compass,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Search,
  MapPin,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RouteGuide {
  title: string;
  subtitle: string;
  summary: string;
  actions: string[];
  proTip: string;
}

interface TourStep {
  id: string;
  title: string;
  href: string;
  badge: string;
  description: string;
  benefit: string;
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  keywords: string[];
}

const ROUTE_GUIDES: { match: (p: string) => boolean; guide: RouteGuide }[] = [
  {
    match: (p) => p === '/',
    guide: {
      title: 'Resumen Ejecutivo',
      subtitle: 'Vista general de tu operación',
      summary:
        'Visualiza de un vistazo el desempeño financiero global, eventos recientes y utilidades netas de la empresa activa.',
      actions: [
        'Revisa el balance general entre ingresos proyectados, costos y margen neto.',
        'Haz clic en cualquier evento para entrar a su ficha, borrador de costos, presupuesto y finanzas.',
        'Usa la barra superior o el menú lateral para cambiar rápidamente de módulo.',
      ],
      proTip:
        'Compara tu Margen Neto con tus metas mensuales: KAIROS descuenta el IVA Crédito recuperable de tus costos con factura para mostrarte ganancia real de bolsillo.',
    },
  },
  {
    match: (p) => p.startsWith('/costs'),
    guide: {
      title: 'Tarifas, Personal e IVA',
      subtitle: 'Catálogo maestro de costos y RR.HH.',
      summary:
        'Administra servicios, equipos, banquetería, logística y contrataciones de personal con cálculo automático de IVA Crédito y Débito.',
      actions: [
        'Pulsa "Agregar Servicio / Personal" para usar la calculadora de dotación (N° personas, horas, Honorarios o Subcontrato).',
        'Elige si compras con Factura (recupera 19% IVA Crédito) o Boleta / Honorarios ($0 IVA Crédito), y si vendes Afecto o Exento de IVA Débito.',
        'Activa "Ver Desglose IVA Crédito / Débito" para inspeccionar el balance F29 por ítem sin saturar la tabla principal.',
        'Usa "Plantillas Base" para cargar perfiles estándar de la industria en 1 clic.',
      ],
      proTip:
        'Cargar correctamente si un proveedor entrega Factura o Boleta evita sobreestimar tus costos reales en un 19% al momento de cotizar.',
    },
  },
  {
    match: (p) => /^\/events\/[^/]+\/report/.test(p),
    guide: {
      title: 'Informe Ejecutivo del Evento',
      subtitle: 'Rendición y cierre final',
      summary:
        'Consolida el resultado post-evento con trazabilidad financiera y descarga formal para socios o gerencia.',
      actions: [
        'Verifica desviaciones entre Presupuesto Oficial y Gastos Reales pagados.',
        'Exporta o imprime el informe final para respaldo contable.',
      ],
      proTip:
        'Asegúrate de registrar todas las facturas de gasto real en Finanzas antes de emitir este informe.',
    },
  },
  {
    match: (p) => /^\/events\/[^/]+$/.test(p) && p !== '/events/new' && p !== '/events/trash',
    guide: {
      title: 'Workspace del Evento',
      subtitle: '4 pestañas: Información, Borrador, Oficial y Finanzas',
      summary:
        'Aquí ocurre toda la operación: desde estimar costos en Borrador hasta emitir cotizaciones PDF y controlar abonos y SII F29 en Finanzas.',
      actions: [
        'Borrador de Costos: edita cantidades, márgenes o sube un PDF/Excel para extraer ítems con IA y luego apruébalos.',
        'Presupuesto Oficial: agrupa o consolida insumos/personal bajo un servicio paquete (Drag & Drop) y exporta la Cotización PDF con tu logo.',
        'Finanzas: registra Abonos del cliente (IVA Débito) y Facturas o Boletas de Honorarios pagadas (IVA Crédito) para ver el Cash en Mano real.',
      ],
      proTip:
        'Si habilitas "Venta al por Menor", puedes agrupar múltiples insumos y turnos de bartenders/garzones dentro de un producto unitario para prorratear el costo por unidad.',
    },
  },
  {
    match: (p) => p.startsWith('/events'),
    guide: {
      title: 'Gestión de Eventos y Proyectos',
      subtitle: 'Planificación, producción activa y cerrados',
      summary:
        'Centraliza todas tus cotizaciones en borrador, producciones aprobadas en curso y eventos finalizados.',
      actions: [
        'Crea un evento nuevo con "+ Nuevo Evento" (puedes activar Venta al por Menor si cobras por porción/trago).',
        'Abre cualquiera de los eventos base para revisar ejemplos completos en Borrador, Presupuesto Oficial y Finanzas.',
      ],
      proTip:
        'Mantén los eventos cerrados en estado Finalizado para proteger sus montos y alimentar correctamente tus estadísticas anuales.',
    },
  },
  {
    match: (p) => p.startsWith('/analytics'),
    guide: {
      title: 'Consolidación & Analítica',
      subtitle: 'Rentabilidad histórica y margen real SII',
      summary:
        'Analiza qué tipos de eventos y clientes generan mayor utilidad neta real descontando costos e impuestos.',
      actions: [
        'Filtra por año o período para comparar evolución mensual de ventas y utilidades.',
        'Identifica eventos con margen por debajo de tu meta para ajustar tu tarifario.',
      ],
      proTip:
        'Usa la curva mensual junto con el Asesor IA para detectar meses bajos y lanzar campañas B2B con anticipación.',
    },
  },
  {
    match: (p) => p.startsWith('/governance'),
    guide: {
      title: 'Gobernanza y Empresas',
      subtitle: 'Administración Multi-Tenant y Marca Blanca',
      summary:
        'Gestiona tu equipo, crea espacios privados aislados para nuevas empresas clientes y personaliza logos y datos bancarios para PDF.',
      actions: [
        'Personaliza el logo corporativo y cuenta bancaria para que aparezcan en todas las cotizaciones PDF.',
        'Usa el código de invitación o crea nuevas empresas con aislamiento total de base de datos (RLS).',
        'Como Super Admin puedes entrar a supervisar la Cuenta Demo o cualquier empresa y volver a tu casa matriz con 1 clic.',
      ],
      proTip:
        'Activa tu autenticación en dos pasos (2FA) en la pestaña "Seguridad y 2FA" para blindar las cuentas administradoras.',
    },
  },
  {
    match: (p) => p.startsWith('/security'),
    guide: {
      title: 'Seguridad y Verificación 2FA',
      subtitle: 'Protección de grado empresarial',
      summary:
        'Configura tu aplicación autenticadora (Google Authenticator / Authy) para exigir un código TOTP de 6 dígitos en cada inicio de sesión.',
      actions: [
        'Escanea el código QR y confirma el primer token de 6 dígitos.',
        'Mantén al menos un dispositivo verificado activo en cuentas Super Admin.',
      ],
      proTip:
        'Con 2FA habilitado, ningún acceso a la API o cambio de empresa se aprueba sin nivel AAL2 verificado.',
    },
  },
];

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-1',
    title: '1. Centro de Control Ejecutivo',
    href: '/',
    badge: 'Inicio',
    description:
      'Parte revisando el pulso general del negocio: ingresos comprometidos, costos reales y estado de cada producción.',
    benefit: 'Toma decisiones de caja en segundos sin revisar planillas dispersas.',
  },
  {
    id: 'step-2',
    title: '2. Tarifario, Personal e IVA',
    href: '/costs',
    badge: 'Catálogo',
    description:
      'Configura tus servicios, cuadrillas de personal (Honorarios SII / Turnos / Subcontratos) y define si pagan Factura (IVA Crédito) o Boleta.',
    benefit: 'Estandariza márgenes y evita perder dinero por errores de IVA al cotizar.',
  },
  {
    id: 'step-3',
    title: '3. Eventos y Presupuestos',
    href: '/events',
    badge: 'Operación',
    description:
      'Explora eventos reales en Planificación, En Curso y Finalizados. Cada uno tiene Borrador de Costos, Presupuesto Oficial y Finanzas.',
    benefit: 'Separa claramente la cocina interna de costos de la cotización formal para el cliente.',
  },
  {
    id: 'step-4',
    title: '4. Consolidación & Rentabilidad',
    href: '/analytics',
    badge: 'Analítica',
    description:
      'Revisa el consolidado anual de utilidad neta limpia tras descontar compras e impuesto F29.',
    benefit: 'Identifica qué servicios te dejan mayor retorno real por peso invertido.',
  },
  {
    id: 'step-5',
    title: '5. Seguridad y Verificación 2FA',
    href: '/security',
    badge: 'Blindaje',
    description:
      'Protege las cuentas administrativas con verificación en dos pasos mediante app autenticadora (TOTP).',
    benefit: 'Seguridad bancaria para proteger márgenes, clientes y tesorería.',
  },
  {
    id: 'step-6',
    title: '6. Arquitectura Multi-Empresa',
    href: '/governance',
    badge: 'Escala SaaS',
    description:
      'Administra múltiples empresas separadas en Supabase con su propio logo, datos bancarios, catálogo y equipo de usuarios.',
    benefit: 'Listo para operar múltiples unidades de negocio o comercializar licencias mensuales.',
  },
];

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'faq-personal',
    question: '¿Cómo agrego contratación de personal (garzones, técnicos, staff)?',
    answer:
      'En "Tarifas, Personal e IVA" haz clic en "Agregar Servicio / Personal" y selecciona "Personal / RR.HH.". Allí ingresas N° de personas, costo por persona, horas/jornada y si pagas con Boleta de Honorarios SII, Turno Interno o Subcontrato con Factura. El sistema calcula automáticamente el total del equipo y referencia de retención.',
    keywords: ['personal', 'contratar', 'gente', 'staff', 'honorarios', 'garzon', 'tecnico', 'rrhh'],
  },
  {
    id: 'faq-iva',
    question: '¿Cómo calcula KAIROS el IVA Débito y el IVA Crédito (F29)?',
    answer:
      'Cuando pagas con Factura Afecta, KAIROS extrae el 19% de IVA Crédito Fiscal (neto = bruto / 1.19), rebajando tu costo real. Cuando pagas con Boleta o Honorarios, el IVA Crédito es $0. En la venta al cliente puedes marcar Afecto (19% IVA Débito) o Exento. En Presupuesto Oficial y Finanzas ves cuánto apartar para el SII (Débito menos Crédito).',
    keywords: ['iva', 'debito', 'credito', 'factura', 'boleta', 'f29', 'sii', 'impuesto'],
  },
  {
    id: 'faq-consolidado',
    question: '¿Qué es consolidar insumos y cómo se usa?',
    answer:
      'Dentro de Borrador o Presupuesto Oficial puedes marcar 2 o más ítems (por ejemplo: 3 bartenders + destilados + hielo) y pulsar "Consolidar" para empaquetarlos bajo un producto único cara al cliente (ej. "Barra Libre"). El costo unitario se prorratea automáticamente manteniendo tus márgenes exactos.',
    keywords: ['consolidar', 'insumo', 'agrupar', 'paquete', 'receta', 'drag', 'arrastrar'],
  },
  {
    id: 'faq-borrador',
    question: '¿Cuál es la diferencia entre Borrador de Costos, Presupuesto Oficial y Finanzas?',
    answer:
      'Borrador es tu zona de trabajo para probar proveedores, IA de costos y márgenes sin alterar la cotización formal. Presupuesto Oficial es lo confirmado y se refleja en el PDF del cliente. Finanzas registra el dinero real que entra (abonos) y sale (facturas/boletas pagadas).',
    keywords: ['borrador', 'oficial', 'presupuesto', 'finanzas', 'abono', 'gasto'],
  },
  {
    id: 'faq-pdf',
    question: '¿Cómo genero una Cotización PDF con el logo de mi empresa?',
    answer:
      'Entra a cualquier evento, ve a Presupuesto Oficial (o arriba a la derecha) y pulsa "Cotización PDF". El documento toma automáticamente el logo, RUT, razón social y datos bancarios configurados para tu empresa.',
    keywords: ['pdf', 'cotizacion', 'logo', 'banco', 'cliente', 'imprimir'],
  },
  {
    id: 'faq-demo',
    question: '¿Qué puedo probar en la Cuenta Demo y cómo vuelvo a empezar?',
    answer:
      'Puedes crear eventos nuevos, probar el lector IA, agregar tarifas de personal o modificar presupuestos existentes con total libertad. Cuando quieras volver al estado original, pulsa "Resetear Prueba" en la barra superior: borrará solo lo nuevo y mantendrá intactos los 6 eventos y 24 tarifas base.',
    keywords: ['demo', 'prueba', 'resetear', 'borrar', 'sandbox', 'ejemplos'],
  },
];

export function InteractiveGuideBot({ isDemo = false }: { isDemo?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'screen' | 'tour' | 'faq'>('screen');
  const [tourIndex, setTourIndex] = useState(0);
  const [faqSearch, setFaqSearch] = useState('');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-personal');

  useEffect(() => {
    const openHandler = (e: Event) => {
      const custom = e as CustomEvent<{ tab?: 'screen' | 'tour' | 'faq' }>;
      if (custom.detail?.tab) {
        setActiveTab(custom.detail.tab);
      }
      setIsOpen(true);
    };
    window.addEventListener('kairos:open-guide', openHandler);
    return () => window.removeEventListener('kairos:open-guide', openHandler);
  }, []);

  const currentGuide = useMemo(() => {
    const matched = ROUTE_GUIDES.find((entry) => entry.match(pathname || '/'));
    return matched ? matched.guide : ROUTE_GUIDES[0].guide;
  }, [pathname]);

  const filteredFaqs = useMemo(() => {
    const q = faqSearch.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (item) =>
        item.question.toLowerCase().includes(q) ||
        item.answer.toLowerCase().includes(q) ||
        item.keywords.some((k) => k.includes(q))
    );
  }, [faqSearch]);

  const activeStep = TOUR_STEPS[tourIndex];

  return (
    <>
      {/* Botón flotante esquina inferior izquierda */}
      {!isOpen && (
        <div className="fixed bottom-5 left-5 lg:left-[17.5rem] z-40">
          <Button
            type="button"
            onClick={() => setIsOpen(true)}
            className={cn(
              'h-11 px-4 rounded-full shadow-xl border border-indigo-400/40 gap-2 text-xs font-semibold transition-all hover:scale-[1.03]',
              'bg-slate-900 text-white hover:bg-slate-800'
            )}
          >
            <Compass className="h-4 w-4 text-amber-400" />
            <span>{isDemo ? 'Bot Guía Demo' : 'Guía Interactiva'}</span>
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
          </Button>
        </div>
      )}

      {/* Panel flotante Guía Interactiva */}
      {isOpen && (
        <div className="fixed bottom-5 left-4 right-4 sm:right-auto lg:left-[17.5rem] sm:w-[400px] z-50 rounded-2xl border border-border/80 bg-card/98 backdrop-blur-xl shadow-2xl overflow-hidden flex flex-col max-h-[calc(100dvh-5.5rem)] animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center">
                <Compass className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold leading-none flex items-center gap-1.5">
                  Guía Interactiva KAIROS
                  {isDemo && (
                    <Badge className="bg-amber-400 text-slate-950 text-[9px] px-1.5 py-0 border-0">
                      DEMO
                    </Badge>
                  )}
                </h3>
                <p className="text-[11px] text-slate-300 mt-1">
                  Acompañamiento paso a paso en vivo
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-1 p-1.5 bg-muted/50 border-b border-border/60 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('screen')}
              className={cn(
                'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'screen'
                  ? 'bg-background text-foreground shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Esta Pantalla
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tour')}
              className={cn(
                'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'tour'
                  ? 'bg-background text-foreground shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Tour (6 Pasos)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('faq')}
              className={cn(
                'py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'faq'
                  ? 'bg-background text-foreground shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Preguntas
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs">
            {activeTab === 'screen' && (
              <div className="space-y-3.5">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">{currentGuide.title}</h4>
                    <p className="text-[11px] text-muted-foreground">{currentGuide.subtitle}</p>
                  </div>
                </div>

                <p className="text-xs text-foreground/90 leading-relaxed bg-muted/30 rounded-xl p-3 border border-border/60">
                  {currentGuide.summary}
                </p>

                <div className="space-y-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-muted-foreground">
                    Qué puedes hacer aquí:
                  </p>
                  <ul className="space-y-2">
                    {currentGuide.actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-foreground/90 leading-snug">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 space-y-1">
                  <p className="font-bold text-amber-900 flex items-center gap-1.5 text-[11px] uppercase">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-600" />
                    Cómo sacarle provecho
                  </p>
                  <p className="text-amber-950/90 leading-relaxed">{currentGuide.proTip}</p>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('tour')}
                    className="h-8 text-xs gap-1.5 w-full"
                  >
                    Iniciar Recorrido Guiado (6 pasos)
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'tour' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                    <span>
                      Paso {tourIndex + 1} de {TOUR_STEPS.length}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {activeStep.badge}
                    </Badge>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${((tourIndex + 1) / TOUR_STEPS.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
                  <h4 className="font-bold text-sm text-foreground">{activeStep.title}</h4>
                  <p className="text-foreground/90 leading-relaxed">{activeStep.description}</p>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200/80 p-2.5 text-emerald-950">
                    <strong className="block text-[10px] uppercase tracking-wider text-emerald-700 mb-0.5">
                      Impacto en tu negocio:
                    </strong>
                    {activeStep.benefit}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => router.push(activeStep.href)}
                    className="w-full h-8 text-xs gap-1.5 mt-1"
                  >
                    Abrir este módulo ahora
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={tourIndex === 0}
                    onClick={() => setTourIndex((i) => Math.max(0, i - 1))}
                    className="h-8 text-xs gap-1"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Anterior
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={tourIndex === TOUR_STEPS.length - 1}
                    onClick={() => setTourIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1))}
                    className="h-8 text-xs gap-1"
                  >
                    Siguiente
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-2.5" />
                  <Input
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Buscar duda (ej. personal, IVA, PDF, borrador)..."
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <div className="space-y-2">
                  {filteredFaqs.map((item) => {
                    const expanded = expandedFaqId === item.id;
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/70 bg-background overflow-hidden"
                      >
                        <button
                          type="button"
                          onClick={() => setExpandedFaqId(expanded ? null : item.id)}
                          className="w-full px-3 py-2.5 text-left font-semibold text-foreground flex items-center justify-between gap-2 hover:bg-muted/30 cursor-pointer"
                        >
                          <span className="flex items-start gap-2">
                            <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="leading-snug">{item.question}</span>
                          </span>
                          <ChevronRight
                            className={cn(
                              'h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform',
                              expanded && 'rotate-90'
                            )}
                          />
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3 pt-1 text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/15">
                            {item.answer}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filteredFaqs.length === 0 && (
                    <p className="text-center text-muted-foreground py-6">
                      No encontramos coincidencias para &ldquo;{faqSearch}&rdquo;. Prueba con &ldquo;IVA&rdquo;, &ldquo;personal&rdquo; o &ldquo;PDF&rdquo;.
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
