'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { formatCLP } from '@/lib/utils'
import { Calendar, DollarSign, CheckCircle, Clock, TrendingUp, Users, Loader2, Plus, BarChart, List } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface DashboardData {
  eventsPlanning: number
  eventsApproved: number
  eventsCompleted: number
  totalRevenue: number
  pendingUsers: number
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData>({
    eventsPlanning: 0,
    eventsApproved: 0,
    eventsCompleted: 0,
    totalRevenue: 0,
    pendingUsers: 0
  })
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      
      try {
        // Fetch events counts
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('status')
          .is('deleted_at', null)
        
        if (eventsError) throw eventsError

        const events = (eventsData as any[]) || []

        let planning = 0
        let approved = 0
        let completed = 0

        events.forEach(e => {
          if (e.status === 'planning') planning++
          else if (e.status === 'approved') approved++
          else if (e.status === 'completed') completed++
        })

        // Fetch total revenue from completed events
        const { data: revenueData, error: revenueError } = await supabase
          .from('event_items')
          .select('cantidad, valor_total, events!inner(status)')
          .eq('events.status', 'completed')
          .is('events.deleted_at', null)

        if (revenueError) throw revenueError
        
        let revenue = 0
        revenueData?.forEach((item: any) => {
           revenue += (item.valor_total || 0) * (item.cantidad || 1)
        })

        // Fetch pending users
        const { count: pendingCount, error: pendingError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')

        if (pendingError) throw pendingError

        setData({
          eventsPlanning: planning,
          eventsApproved: approved,
          eventsCompleted: completed,
          totalRevenue: revenue,
          pendingUsers: pendingCount || 0
        })
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Bienvenido a Dúo Producciones ERP</h1>
        <p className="text-muted-foreground text-lg">Panel de control y resumen operativo</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos en Planificación</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.eventsPlanning}</div>
            <Link href="/events?status=planning" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
              Ver eventos →
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Aprobados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.eventsApproved}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eventos Completados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.eventsCompleted}</div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '300ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales (Completados)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCLP(data.totalRevenue)}</div>
          </CardContent>
        </Card>
        
        {data.pendingUsers > 0 && (
          <Card className="hover:shadow-md transition-shadow animate-in fade-in slide-in-from-bottom-4 duration-500 md:col-span-2 lg:col-span-4 bg-yellow-50/50 border-yellow-200" style={{ animationDelay: '400ms' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-800">Atención Requerida</CardTitle>
              <Users className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-yellow-700">Hay <span className="font-bold">{data.pendingUsers}</span> solicitudes de usuarios pendientes de aprobación.</div>
              <Link href="/governance">
                <Button variant="outline" size="sm" className="border-yellow-300 text-yellow-800 hover:bg-yellow-100">
                  Ir a Gobernanza
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4 pt-6">
        <h2 className="text-xl font-semibold tracking-tight">Acciones Rápidas</h2>
        <div className="flex flex-wrap gap-4">
          <Link href="/events/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Evento
            </Button>
          </Link>
          <Link href="/catalog">
            <Button variant="outline">
              <List className="mr-2 h-4 w-4" />
              Ver Tarifas
            </Button>
          </Link>
          <Link href="/analytics">
            <Button variant="outline">
              <BarChart className="mr-2 h-4 w-4" />
              Analítica / Consolidación
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
