'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { MasterCost } from '@/types'
import { CostsTable } from '@/components/costs/costs-table'
import { CostFormDialog } from '@/components/costs/cost-form-dialog'
import { StrategicPricingDialog } from '@/components/costs/strategic-pricing-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  COMPANY_COST_TEMPLATES,
  CostTemplatePreset,
  RESOURCE_TYPE_LABELS,
  computeCostTaxBreakdown,
  formatCostMetadata,
} from '@/lib/cost-metadata'
import { calculateFinancials, formatCLP, formatPercentage } from '@/lib/utils'
import { DUO_ORG_SLUG } from '@/lib/constants'
import {
  Plus,
  Sparkles,
  Users,
  Receipt,
  TrendingUp,
  Layers,
  BookOpen,
  Check,
  Loader2,
} from 'lucide-react'

export default function CostsPage() {
  const { organization, isDemo } = useUser()
  const [costs, setCosts] = useState<MasterCost[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  const [addingTemplateId, setAddingTemplateId] = useState<string | null>(null)
  const [addingAllTemplates, setAddingAllTemplates] = useState(false)
  const [strategicDialogOpen, setStrategicDialogOpen] = useState(false)
  const [strategicProposalApplied, setStrategicProposalApplied] = useState(false)
  const [editingCost, setEditingCost] = useState<MasterCost | null>(null)

  const isDuoOrg = organization?.slug === DUO_ORG_SLUG

  const fetchCosts = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('master_costs')
      .select('*')
      .order('servicio', { ascending: true })

    if (!error && data) {
      const allCosts = data as MasterCost[]
      const isApplied =
        allCosts.some((c) => c.servicio === '__SYSTEM_STRATEGIC_PROPOSAL_2026_APPLIED__') ||
        (typeof window !== 'undefined' &&
          localStorage.getItem('duo_strategic_proposal_2026_applied') === 'true')
      setStrategicProposalApplied(isApplied)

      const visibleData = allCosts.filter((c) => !c.servicio.startsWith('__SYSTEM_'))
      setCosts(visibleData)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchCosts()
  }, [])

  const stats = useMemo(() => {
    const breakdowns = costs.map((c) => computeCostTaxBreakdown(c))
    const staffCount = breakdowns.filter((b) => b.meta.resourceType === 'personal').length
    const facturaCount = breakdowns.filter((b) => b.tipoDocCompra === 'factura').length
    const avgMargin =
      breakdowns.length > 0
        ? breakdowns.reduce((acc, b) => acc + b.margenPct, 0) / breakdowns.length
        : 0

    return {
      total: costs.length,
      staffCount,
      facturaCount,
      boletaCount: costs.length - facturaCount,
      avgMargin,
    }
  }, [costs])

  const existingServiceNames = useMemo(
    () => new Set(costs.map((c) => c.servicio.trim().toLowerCase())),
    [costs]
  )

  const handleAdd = () => {
    setEditingCost(null)
    setDialogOpen(true)
  }

  const handleEdit = (cost: MasterCost) => {
    setEditingCost(cost)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    const target = costs.find((c) => c.id === id)
    if (isDemo && target?.is_demo_base) {
      alert(
        'Esta tarifa pertenece a los ejemplos base de la sesión de prueba. Puedes crear nuevas tarifas y eliminarlas libremente, o editar los valores y luego usar "Resetear Prueba".'
      )
      return
    }
    if (window.confirm('¿Está seguro de que desea eliminar este servicio?')) {
      const supabase = createClient()
      const { error } = await supabase.from('master_costs').delete().eq('id', id)
      if (error) {
        alert('No se pudo eliminar la tarifa: ' + error.message)
      }
      fetchCosts()
    }
  }

  const buildPayloadFromTemplate = (tpl: CostTemplatePreset) => {
    const fin = calculateFinancials(
      tpl.costo,
      tpl.ganancia,
      tpl.tipo_doc_costo,
      tpl.aplicaIvaVenta,
      false
    )
    const tiempoDetalle = formatCostMetadata({
      resourceType: tpl.resourceType,
      staffCount: tpl.staffCount,
      staffHours: tpl.staffHours,
      staffModality: tpl.staffModality,
      aplicaIvaVenta: tpl.aplicaIvaVenta,
      cleanDetail: tpl.detail,
    })

    return {
      servicio: tpl.servicio,
      tiempo_detalle: tiempoDetalle,
      tipo_evento: tpl.tipo_evento,
      costo: tpl.costo,
      ganancia: tpl.ganancia,
      valor_neto: fin.valorNeto,
      valor_total: fin.valorTotal,
      tipo_doc_costo: tpl.tipo_doc_costo,
    }
  }

  const handleInsertTemplate = async (tpl: CostTemplatePreset) => {
    setAddingTemplateId(tpl.id)
    const supabase = createClient()
    try {
      const payload = buildPayloadFromTemplate(tpl)
      const { error } = await (supabase.from('master_costs') as any).insert(payload as never)
      if (error) throw error
      await fetchCosts()
    } catch (error: any) {
      alert(
        error?.code === '42501'
          ? 'Alcanzaste el límite de tarifas nuevas en la sesión de prueba. Usa "Resetear Prueba" para liberar espacio.'
          : error?.message || 'No se pudo agregar la plantilla.'
      )
    } finally {
      setAddingTemplateId(null)
    }
  }

  const handleImportMissingTemplates = async () => {
    const missing = COMPANY_COST_TEMPLATES.filter(
      (tpl) => !existingServiceNames.has(tpl.servicio.trim().toLowerCase())
    )
    if (missing.length === 0) return

    setAddingAllTemplates(true)
    const supabase = createClient()
    try {
      const rows = missing.map(buildPayloadFromTemplate)
      const { error } = await (supabase.from('master_costs') as any).insert(rows as never)
      if (error) throw error
      await fetchCosts()
      setTemplatesOpen(false)
    } catch (error: any) {
      alert(
        error?.code === '42501'
          ? 'En la cuenta Demo puedes probar importando de a pocas plantillas (límite máx. 15 nuevas sobre las 24 base).'
          : error?.message || 'No se pudieron importar las plantillas.'
      )
    } finally {
      setAddingAllTemplates(false)
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tarifas, Personal e IVA</h1>
            {isDemo && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                24 Tarifas Base + Tus Pruebas
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1.5 text-sm">
            Catálogo maestro de servicios, dotación de personal (RR.HH.) y tratamiento de IVA Crédito / Débito de{' '}
            <span className="font-medium text-foreground">{organization?.name || 'DUO Producciones'}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={() => setTemplatesOpen(true)} className="gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Plantillas Base
          </Button>
          {isDuoOrg && !strategicProposalApplied && (
            <Button
              variant="outline"
              onClick={() => setStrategicDialogOpen(true)}
              className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 shadow-2xs font-semibold"
            >
              <Sparkles className="h-4 w-4 text-indigo-600" />
              Propuesta Estratégica 2026
            </Button>
          )}
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Agregar Servicio / Personal
          </Button>
        </div>
      </div>

      {/* Tarjetas Resumen KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/70 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total Catálogo</p>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Ítems configurados</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-indigo-200/70 bg-indigo-50/20 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-indigo-700">Personal y RR.HH.</p>
              <p className="text-2xl font-bold text-indigo-950 mt-1">{stats.staffCount}</p>
              <p className="text-[11px] text-indigo-700/80 mt-0.5">Staff, técnicos y artistas</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200/70 bg-blue-50/20 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-blue-700">Documentos Tributarios</p>
              <p className="text-2xl font-bold text-blue-950 mt-1">
                {stats.facturaCount} <span className="text-sm font-normal text-muted-foreground">Fact.</span>
              </p>
              <p className="text-[11px] text-blue-700/80 mt-0.5">
                {stats.boletaCount} con Boleta / Honorarios
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200/70 bg-emerald-50/20 shadow-2xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700">Margen Promedio</p>
              <p className="text-2xl font-bold text-emerald-950 mt-1">
                {formatPercentage(stats.avgMargin)}
              </p>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">Sobre costo neto compra</p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <p className="text-sm text-muted-foreground">Cargando servicios y tarifas...</p>
        </div>
      ) : (
        <CostsTable data={costs} onEdit={handleEdit} onDelete={handleDelete} />
      )}

      <CostFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingCost={editingCost}
        onSuccess={fetchCosts}
      />

      {/* Modal Plantillas Base de Industria */}
      <Dialog open={templatesOpen} onOpenChange={setTemplatesOpen} className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Plantillas Base de Servicios y Personal
          </DialogTitle>
          <DialogDescription>
            Agrega tarifas listas con cálculo automático de personal, honorarios, boleta o factura (IVA Crédito/Débito) en un clic.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {COMPANY_COST_TEMPLATES.map((tpl) => {
              const alreadyAdded = existingServiceNames.has(tpl.servicio.trim().toLowerCase())
              const isBusy = addingTemplateId === tpl.id
              const fin = calculateFinancials(
                tpl.costo,
                tpl.ganancia,
                tpl.tipo_doc_costo,
                tpl.aplicaIvaVenta,
                false
              )

              return (
                <div
                  key={tpl.id}
                  className="rounded-xl border border-border/70 p-3 flex flex-col justify-between gap-2 bg-card hover:bg-muted/20 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-semibold text-sm text-foreground leading-snug">
                        {tpl.servicio}
                      </span>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {RESOURCE_TYPE_LABELS[tpl.resourceType]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{tpl.detail}</p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                      <Badge
                        variant="outline"
                        className={
                          tpl.tipo_doc_costo === 'factura'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }
                      >
                        {tpl.tipo_doc_costo === 'factura' ? 'Factura (IVA Créd.)' : 'Boleta / Honorarios'}
                      </Badge>
                      {tpl.resourceType === 'personal' && (
                        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                          {tpl.staffCount} pers. · {tpl.staffHours}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-border/50 text-xs">
                    <div>
                      <span className="text-muted-foreground">Costo: </span>
                      <span className="font-semibold">{formatCLP(tpl.costo)}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span className="font-bold text-emerald-700">{formatCLP(fin.valorTotal)}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={alreadyAdded ? 'outline' : 'default'}
                      disabled={alreadyAdded || isBusy || addingAllTemplates}
                      onClick={() => handleInsertTemplate(tpl)}
                      className="h-7 text-xs gap-1"
                    >
                      {isBusy ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : alreadyAdded ? (
                        <Check className="h-3 w-3 text-emerald-600" />
                      ) : (
                        <Plus className="h-3 w-3" />
                      )}
                      {alreadyAdded ? 'En catálogo' : 'Agregar'}
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setTemplatesOpen(false)}>
            Cerrar
          </Button>
          {!isDemo && (
            <Button
              type="button"
              onClick={handleImportMissingTemplates}
              disabled={addingAllTemplates}
              className="gap-1.5"
            >
              {addingAllTemplates ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Importar Plantillas Faltantes
            </Button>
          )}
        </DialogFooter>
      </Dialog>

      {isDuoOrg && (
        <StrategicPricingDialog
          open={strategicDialogOpen}
          onOpenChange={setStrategicDialogOpen}
          currentCosts={costs}
          onSuccess={fetchCosts}
        />
      )}
    </div>
  )
}
