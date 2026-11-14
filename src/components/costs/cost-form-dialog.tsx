'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { MasterCost } from '@/types'
import { createClient } from '@/lib/supabase/client'
import {
  formatCLP,
  calculateFinancials,
  calculateFinancialsFromMargin,
  calculateGananciaFromTotal,
} from '@/lib/utils'
import {
  parseCostMetadata,
  formatCostMetadata,
  computeCostTaxBreakdown,
  CostResourceType,
  StaffModality,
} from '@/lib/cost-metadata'
import { Users, Wrench, Utensils, Truck, Receipt, FileText, Info } from 'lucide-react'

interface CostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCost: MasterCost | null
  onSuccess?: () => void
}

const RESOURCE_OPTIONS: {
  value: CostResourceType
  label: string
  hint: string
  icon: typeof Users
}[] = [
  { value: 'servicio', label: 'Servicio / Equipo', hint: 'Técnica, arriendo', icon: Wrench },
  { value: 'personal', label: 'Personal / RR.HH.', hint: 'Staff, técnicos, artistas', icon: Users },
  { value: 'insumo', label: 'Banquetería', hint: 'Comida, barra, insumos', icon: Utensils },
  { value: 'logistica', label: 'Logística', hint: 'Fletes, generador, montaje', icon: Truck },
]

export function CostFormDialog({
  open,
  onOpenChange,
  editingCost,
  onSuccess,
}: CostFormDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const [servicio, setServicio] = useState('')
  const [tipoEvento, setTipoEvento] = useState('Privado')
  const [resourceType, setResourceType] = useState<CostResourceType>('servicio')
  const [staffCount, setStaffCount] = useState<number>(1)
  const [costPerPerson, setCostPerPerson] = useState<number>(0)
  const [staffHours, setStaffHours] = useState<string>('6 hrs')
  const [staffModality, setStaffModality] = useState<StaffModality>('honorarios')
  const [tipoDocCosto, setTipoDocCosto] = useState<'factura' | 'boleta'>('factura')
  const [aplicaIvaVenta, setAplicaIvaVenta] = useState<boolean>(true)
  const [cleanDetail, setCleanDetail] = useState('')
  const [costo, setCosto] = useState<number>(0)
  const [ganancia, setGanancia] = useState<number>(0)

  useEffect(() => {
    if (editingCost) {
      const meta = parseCostMetadata(
        editingCost.tiempo_detalle,
        editingCost.tipo_evento,
        editingCost.servicio
      )
      const docType: 'factura' | 'boleta' =
        editingCost.tipo_doc_costo === 'boleta' ? 'boleta' : 'factura'

      setServicio(editingCost.servicio)
      setTipoEvento(editingCost.tipo_evento || 'Privado')
      setResourceType(meta.resourceType)
      setStaffCount(meta.staffCount)
      setCostPerPerson(
        meta.staffCount > 0 ? Math.round((Number(editingCost.costo) || 0) / meta.staffCount) : 0
      )
      setStaffHours(meta.staffHours || '6 hrs')
      setStaffModality(meta.staffModality)
      setTipoDocCosto(docType)
      setAplicaIvaVenta(meta.aplicaIvaVenta)
      setCleanDetail(meta.cleanDetail)
      setCosto(Number(editingCost.costo) || 0)
      setGanancia(Number(editingCost.ganancia) || 0)
    } else {
      setServicio('')
      setTipoEvento('Privado')
      setResourceType('servicio')
      setStaffCount(1)
      setCostPerPerson(0)
      setStaffHours('6 hrs')
      setStaffModality('honorarios')
      setTipoDocCosto('factura')
      setAplicaIvaVenta(true)
      setCleanDetail('')
      setCosto(0)
      setGanancia(0)
    }
  }, [editingCost, open])

  const serializedMeta = useMemo(
    () =>
      formatCostMetadata({
        resourceType,
        staffCount,
        staffHours,
        staffModality,
        aplicaIvaVenta,
        cleanDetail,
      }),
    [resourceType, staffCount, staffHours, staffModality, aplicaIvaVenta, cleanDetail]
  )

  const breakdown = useMemo(
    () =>
      computeCostTaxBreakdown({
        servicio,
        costo,
        ganancia,
        tipo_doc_costo: tipoDocCosto,
        tiempo_detalle: serializedMeta,
        tipo_evento: tipoEvento,
      }),
    [servicio, costo, ganancia, tipoDocCosto, serializedMeta, tipoEvento]
  )

  const handleResourceTypeSelect = (nextType: CostResourceType) => {
    setResourceType(nextType)
    if (nextType === 'personal') {
      if (staffModality === 'factura_subcontrato') {
        setTipoDocCosto('factura')
      } else {
        setTipoDocCosto('boleta')
      }
      if (costo > 0 && costPerPerson === 0) {
        setCostPerPerson(Math.round(costo / Math.max(1, staffCount)))
      }
    } else if (nextType === 'servicio' || nextType === 'insumo') {
      setTipoDocCosto('factura')
    }
  }

  const handleStaffModalityChange = (nextModality: StaffModality) => {
    setStaffModality(nextModality)
    if (nextModality === 'factura_subcontrato') {
      setTipoDocCosto('factura')
    } else {
      setTipoDocCosto('boleta')
    }
  }

  const handleStaffCountChange = (val: string) => {
    const nextCount = Math.max(1, parseInt(val, 10) || 1)
    setStaffCount(nextCount)
    if (costPerPerson > 0) {
      setCosto(nextCount * costPerPerson)
    }
  }

  const handleCostPerPersonChange = (val: string) => {
    const nextPerPerson = Math.max(0, parseInt(val, 10) || 0)
    setCostPerPerson(nextPerPerson)
    setCosto(nextPerPerson * Math.max(1, staffCount))
  }

  const handleCostoTotalChange = (val: string) => {
    const nextCost = Math.max(0, parseInt(val, 10) || 0)
    setCosto(nextCost)
    if (resourceType === 'personal') {
      setCostPerPerson(Math.round(nextCost / Math.max(1, staffCount)))
    }
  }

  const handleMarginChange = (val: string) => {
    const nextMargin = Math.max(0, parseFloat(val) || 0)
    const fin = calculateFinancialsFromMargin(
      costo,
      nextMargin,
      tipoDocCosto,
      aplicaIvaVenta,
      false
    )
    setGanancia(fin.ganancia)
  }

  const handleValorTotalChange = (val: string) => {
    const total = Math.max(0, parseInt(val, 10) || 0)
    const fin = calculateGananciaFromTotal(costo, total, tipoDocCosto, aplicaIvaVenta, false)
    setGanancia(fin.ganancia)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const fin = calculateFinancials(costo, ganancia, tipoDocCosto, aplicaIvaVenta, false)

    const payload = {
      servicio: servicio.trim(),
      tiempo_detalle: serializedMeta,
      tipo_evento: tipoEvento,
      costo,
      ganancia,
      valor_neto: fin.valorNeto,
      valor_total: fin.valorTotal,
      tipo_doc_costo: tipoDocCosto,
    }

    try {
      if (editingCost) {
        const { error } = await (supabase.from('master_costs') as any)
          .update(payload)
          .eq('id', editingCost.id)
        if (error) throw error
      } else {
        const { error } = await (supabase.from('master_costs') as any).insert(payload as never)
        if (error) throw error
      }

      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error: any) {
      console.error('Error saving cost:', error)
      alert(
        error?.code === '42501'
          ? 'Alcanzaste el límite de tarifas nuevas en la sesión de prueba. Usa "Resetear Prueba" en la barra superior para limpiar tus pruebas y continuar.'
          : error?.message || 'Error al guardar la tarifa.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 max-h-[inherit] overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {editingCost ? 'Editar Servicio o Personal' : 'Nuevo Servicio, Tarifa o Personal'}
          </DialogTitle>
          <DialogDescription>
            Configura el costo real, dotación de personal si aplica y tratamiento tributario (IVA Crédito y Débito).
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
          {/* 1. Naturaleza del recurso */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1. Naturaleza del Ítem
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {RESOURCE_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const active = resourceType === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleResourceTypeSelect(opt.value)}
                    className={`flex flex-col items-start rounded-xl border p-2.5 text-left transition-all cursor-pointer ${
                      active
                        ? 'border-primary bg-primary/8 ring-1 ring-primary/30 text-foreground'
                        : 'border-border/70 bg-background hover:bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <Icon className={`h-3.5 w-3.5 ${active ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span>{opt.label}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      {opt.hint}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Identificación */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 grid gap-1.5">
              <Label htmlFor="servicio">Nombre del Servicio o Cargo</Label>
              <Input
                id="servicio"
                value={servicio}
                onChange={(e) => setServicio(e.target.value)}
                placeholder={
                  resourceType === 'personal'
                    ? 'Ej. Staff Anfitrionas / Bartenders'
                    : 'Ej. Sonido Line Array / Banquetería'
                }
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="tipo">Tipo de Evento</Label>
              <Select
                value={tipoEvento}
                onChange={(e) => setTipoEvento(e.target.value)}
                options={[
                  { value: 'Privado', label: 'Privado' },
                  { value: 'Empresa', label: 'Empresa' },
                  { value: 'Cumpleaños', label: 'Cumpleaños' },
                  { value: 'Matrimonio', label: 'Matrimonio' },
                ]}
              />
            </div>
          </div>

          {/* Calculadora condicional de Personal / RRHH */}
          {resourceType === 'personal' && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  Calculadora de Contratación de Personal
                </span>
                <span className="text-[11px] font-medium text-indigo-700">
                  Total equipo: {formatCLP(costo)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="grid gap-1">
                  <Label htmlFor="staffCount" className="text-[11px]">N° Personas</Label>
                  <Input
                    id="staffCount"
                    type="number"
                    min={1}
                    value={staffCount}
                    onChange={(e) => handleStaffCountChange(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="costPerPerson" className="text-[11px]">Costo c/u ($)</Label>
                  <Input
                    id="costPerPerson"
                    type="number"
                    min={0}
                    value={costPerPerson}
                    onChange={(e) => handleCostPerPersonChange(e.target.value)}
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="staffHours" className="text-[11px]">Jornada / Horas</Label>
                  <Input
                    id="staffHours"
                    value={staffHours}
                    onChange={(e) => setStaffHours(e.target.value)}
                    placeholder="Ej. 6 hrs"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="staffModality" className="text-[11px]">Modalidad Pago</Label>
                  <Select
                    value={staffModality}
                    onChange={(e) => handleStaffModalityChange(e.target.value as StaffModality)}
                    className="h-8 text-xs bg-background"
                    options={[
                      { value: 'honorarios', label: 'Boleta Honorarios SII' },
                      { value: 'turno', label: 'Turno / Nómina Interna' },
                      { value: 'factura_subcontrato', label: 'Subcontrato Factura' },
                    ]}
                  />
                </div>
              </div>
              {staffModality === 'honorarios' && costo > 0 && (
                <p className="text-[11px] text-indigo-900/80 flex items-center gap-1.5 bg-white/70 rounded-lg px-2.5 py-1.5 border border-indigo-100">
                  <Info className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                  <span>
                    Ref. Boleta Honorarios (retención 13,75%): líquido al trabajador{' '}
                    <strong>{formatCLP(breakdown.liquidoHonorarios)}</strong> + retención SII{' '}
                    <strong>{formatCLP(breakdown.retencionHonorarios)}</strong> (sin IVA Crédito).
                  </span>
                </p>
              )}
            </div>
          )}

          {/* Detalle limpio */}
          <div className="grid gap-1.5">
            <Label htmlFor="cleanDetail">Detalle Operativo / Alcance</Label>
            <Input
              id="cleanDetail"
              value={cleanDetail}
              onChange={(e) => setCleanDetail(e.target.value)}
              placeholder="Ej. Jornada 5 horas, incluye montaje y prueba de sonido"
            />
          </div>

          {/* 3. Régimen Tributario (IVA Crédito y Débito) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <Receipt className="h-3.5 w-3.5 text-blue-600" />
                Documento al Pagar (IVA Crédito)
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setTipoDocCosto('factura')}
                  className={`rounded-lg px-2.5 py-2 text-xs font-medium border text-left transition-all cursor-pointer ${
                    tipoDocCosto === 'factura'
                      ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-semibold">Factura Afecta</div>
                  <div className="text-[10px] opacity-80">Recupera 19% IVA</div>
                </button>
                <button
                  type="button"
                  onClick={() => setTipoDocCosto('boleta')}
                  className={`rounded-lg px-2.5 py-2 text-xs font-medium border text-left transition-all cursor-pointer ${
                    tipoDocCosto === 'boleta'
                      ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-2xs'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-semibold">Boleta / Honorarios</div>
                  <div className="text-[10px] opacity-80">$0 IVA Crédito</div>
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 space-y-2">
              <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                <FileText className="h-3.5 w-3.5 text-emerald-600" />
                Cobro al Cliente (IVA Débito)
              </Label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setAplicaIvaVenta(true)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-medium border text-left transition-all cursor-pointer ${
                    aplicaIvaVenta
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-2xs'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-semibold">Afecto IVA (19%)</div>
                  <div className="text-[10px] opacity-80">Suma IVA Débito</div>
                </button>
                <button
                  type="button"
                  onClick={() => setAplicaIvaVenta(false)}
                  className={`rounded-lg px-2.5 py-2 text-xs font-medium border text-left transition-all cursor-pointer ${
                    !aplicaIvaVenta
                      ? 'bg-slate-100 border-slate-400 text-slate-900 shadow-2xs'
                      : 'bg-background border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <div className="font-semibold">Exento / Sin IVA</div>
                  <div className="text-[10px] opacity-80">Venta sin recargo 19%</div>
                </button>
              </div>
            </div>
          </div>

          {/* 4. Valores Económicos Bidireccionales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="costo" className="text-xs">Costo Compra ($)</Label>
              <Input
                id="costo"
                type="number"
                min={0}
                value={costo}
                onChange={(e) => handleCostoTotalChange(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ganancia" className="text-xs">Ganancia Neta ($)</Label>
              <Input
                id="ganancia"
                type="number"
                value={ganancia}
                onChange={(e) => setGanancia(parseInt(e.target.value, 10) || 0)}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="margen" className="text-xs">Margen (%)</Label>
              <Input
                id="margen"
                type="number"
                step="0.1"
                min={0}
                value={breakdown.margenPct}
                onChange={(e) => handleMarginChange(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="valor_total" className="text-xs">Total Cliente ($)</Label>
              <Input
                id="valor_total"
                type="number"
                min={0}
                value={breakdown.valorTotalVenta}
                onChange={(e) => handleValorTotalChange(e.target.value)}
              />
            </div>
          </div>

          {/* 5. Resumen Tributario F29 en vivo */}
          <div className="rounded-xl border border-border/80 bg-slate-50/80 p-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
              Simulación Tributaria SII (F29) por Unidad
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-white border border-slate-200/80 p-2">
                <span className="text-[10px] text-muted-foreground block">IVA Crédito Compra</span>
                <span className="font-bold text-blue-700">
                  {breakdown.ivaCredito > 0 ? `+${formatCLP(breakdown.ivaCredito)}` : '$0 (Boleta)'}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  Costo neto {formatCLP(breakdown.costoNeto)}
                </span>
              </div>
              <div className="rounded-lg bg-white border border-slate-200/80 p-2">
                <span className="text-[10px] text-muted-foreground block">Valor Neto Venta</span>
                <span className="font-bold text-slate-900">{formatCLP(breakdown.valorNetoVenta)}</span>
                <span className="text-[10px] text-muted-foreground block">Base imponible</span>
              </div>
              <div className="rounded-lg bg-white border border-slate-200/80 p-2">
                <span className="text-[10px] text-muted-foreground block">IVA Débito Venta</span>
                <span className="font-bold text-amber-700">
                  {breakdown.ivaDebito > 0 ? formatCLP(breakdown.ivaDebito) : '$0 (Exento)'}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  {aplicaIvaVenta ? '19% sobre neto' : 'Sin IVA débito'}
                </span>
              </div>
              <div className="rounded-lg bg-white border border-slate-200/80 p-2">
                <span className="text-[10px] text-muted-foreground block">Balance IVA F29</span>
                <span
                  className={`font-bold ${
                    breakdown.balanceIvaF29 > 0 ? 'text-rose-700' : 'text-emerald-700'
                  }`}
                >
                  {breakdown.balanceIvaF29 > 0
                    ? `${formatCLP(breakdown.balanceIvaF29)} a pagar`
                    : `${formatCLP(Math.abs(breakdown.balanceIvaF29))} a favor`}
                </span>
                <span className="text-[10px] text-emerald-700 font-medium block">
                  Utilidad limpia {formatCLP(breakdown.gananciaNeta)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : editingCost ? 'Guardar Cambios' : 'Crear Tarifa'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
