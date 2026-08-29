'use client'

import { useState, useEffect } from 'react'
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
import { formatCLP } from '@/lib/utils'

interface CostFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingCost: MasterCost | null
  onSuccess?: () => void
}

export function CostFormDialog({
  open,
  onOpenChange,
  editingCost,
  onSuccess,
}: CostFormDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
  const [servicio, setServicio] = useState('')
  const [tiempoDetalle, setTiempoDetalle] = useState('')
  const [tipoEvento, setTipoEvento] = useState('Privado')
  const [costo, setCosto] = useState<number | ''>('')
  const [ganancia, setGanancia] = useState<number | ''>('')
  
  const valorNeto = (Number(costo) || 0) + (Number(ganancia) || 0)
  const valorTotal = Math.round(valorNeto + valorNeto * 0.19)

  useEffect(() => {
    if (editingCost) {
      setServicio(editingCost.servicio)
      setTiempoDetalle(editingCost.tiempo_detalle || '')
      setTipoEvento(editingCost.tipo_evento)
      setCosto(editingCost.costo)
      setGanancia(editingCost.ganancia)
    } else {
      setServicio('')
      setTiempoDetalle('')
      setTipoEvento('Privado')
      setCosto('')
      setGanancia('')
    }
  }, [editingCost, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const supabase = createClient()
    
    try {
      if (editingCost) {
        await (supabase.from('master_costs') as any)
          .update({
            servicio,
            tiempo_detalle: tiempoDetalle,
            tipo_evento: tipoEvento,
            costo: Number(costo) || 0,
            ganancia: Number(ganancia) || 0,
            valor_neto: valorNeto,
            valor_total: valorTotal,
          })
          .eq('id', editingCost.id)
      } else {
        await (supabase.from('master_costs') as any).insert({
          servicio,
          tiempo_detalle: tiempoDetalle,
          tipo_evento: tipoEvento,
          costo: Number(costo) || 0,
          ganancia: Number(ganancia) || 0,
          valor_neto: valorNeto,
          valor_total: valorTotal,
        } as never)
      }
      
      onOpenChange(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (error) {
      console.error('Error saving cost:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>
          {editingCost ? 'Editar Servicio' : 'Nuevo Servicio'}
        </DialogTitle>
        <DialogDescription>
          Complete los detalles del servicio a continuación.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4 mt-4">
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="servicio">Servicio</Label>
            <Input
              id="servicio"
              value={servicio}
              onChange={(e) => setServicio(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tiempo">Detalle/Tiempo</Label>
            <Input
              id="tiempo"
              value={tiempoDetalle}
              onChange={(e) => setTiempoDetalle(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tipo">Tipo Evento</Label>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="costo">Costo</Label>
              <Input
                id="costo"
                type="number"
                value={costo}
                onChange={(e) => setCosto(Number(e.target.value))}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ganancia">Ganancia</Label>
              <Input
                id="ganancia"
                type="number"
                value={ganancia}
                onChange={(e) => setGanancia(Number(e.target.value))}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="valor_neto">Valor Neto</Label>
              <Input
                id="valor_neto"
                value={formatCLP(valorNeto)}
                readOnly
                className="bg-muted"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="valor_total">Valor Total</Label>
              <Input
                id="valor_total"
                value={formatCLP(valorTotal)}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : editingCost ? 'Guardar Cambios' : 'Crear Servicio'}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  )
}
