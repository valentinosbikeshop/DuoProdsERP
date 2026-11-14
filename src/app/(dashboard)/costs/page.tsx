'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/use-user'
import { MasterCost } from '@/types'
import { CostsTable } from '@/components/costs/costs-table'
import { CostFormDialog } from '@/components/costs/cost-form-dialog'
import { StrategicPricingDialog } from '@/components/costs/strategic-pricing-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Sparkles } from 'lucide-react'
import { DUO_ORG_SLUG } from '@/lib/constants'

export default function CostsPage() {
  const { organization, isDemo } = useUser()
  const [costs, setCosts] = useState<MasterCost[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
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

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">Tarifas y Servicios</h1>
            {isDemo && (
              <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
                12 Tarifas Base + Tus Pruebas
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-2">
            Catálogo maestro de costos de {organization?.name || 'DUO Producciones'}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar Servicio
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <p>Cargando servicios...</p>
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
