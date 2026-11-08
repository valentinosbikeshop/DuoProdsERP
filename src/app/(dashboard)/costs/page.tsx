'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MasterCost } from '@/types'
import { CostsTable } from '@/components/costs/costs-table'
import { CostFormDialog } from '@/components/costs/cost-form-dialog'
import { StrategicPricingDialog } from '@/components/costs/strategic-pricing-dialog'
import { Button } from '@/components/ui/button'
import { Plus, Sparkles } from 'lucide-react'

export default function CostsPage() {
  const [costs, setCosts] = useState<MasterCost[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [strategicDialogOpen, setStrategicDialogOpen] = useState(false)
  const [editingCost, setEditingCost] = useState<MasterCost | null>(null)

  const fetchCosts = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('master_costs')
      .select('*')
      .order('servicio', { ascending: true })
    
    if (!error && data) {
      setCosts(data)
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
    if (window.confirm('¿Está seguro de que desea eliminar este servicio?')) {
      const supabase = createClient()
      await supabase.from('master_costs').delete().eq('id', id)
      fetchCosts()
    }
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tarifas y Servicios</h1>
          <p className="text-muted-foreground mt-2">
            Catálogo maestro de costos de DUO Producciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setStrategicDialogOpen(true)}
            className="gap-2 border-indigo-200 text-indigo-700 bg-indigo-50/60 hover:bg-indigo-100 shadow-2xs font-semibold"
          >
            <Sparkles className="h-4 w-4 text-indigo-600" />
            Propuesta Estratégica 2026
          </Button>
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

      <StrategicPricingDialog
        open={strategicDialogOpen}
        onOpenChange={setStrategicDialogOpen}
        currentCosts={costs}
        onSuccess={fetchCosts}
      />
    </div>
  )
}
