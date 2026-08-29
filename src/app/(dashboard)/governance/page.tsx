'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/types'
import { PendingUsersTable } from '@/components/governance/pending-users-table'
import { Shield, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function GovernancePage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
    } else {
      setUsers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleApprove = async (userId: string) => {
    const { error } = await (supabase.from('profiles') as any)
      .update({ status: 'active' })
      .eq('id', userId)

    if (error) {
      console.error('Error approving user:', error)
      alert('Error al aprobar usuario')
    } else {
      await fetchUsers()
    }
  }

  const handleReject = async (userId: string) => {
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId)

    if (error) {
      console.error('Error rejecting user:', error)
      alert('Error al rechazar usuario')
    } else {
      await fetchUsers()
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="w-8 h-8 text-primary" />
            Gobernanza
          </h1>
          <p className="text-muted-foreground">
            Administración de solicitudes de registro y acceso al sistema
          </p>
        </div>
        {!loading && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {users.length} {users.length === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'}
          </Badge>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <PendingUsersTable
          users={users}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
    </div>
  )
}
