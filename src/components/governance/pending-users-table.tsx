'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Profile } from '@/types'
import { Check, X, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface PendingUsersTableProps {
  users: Profile[]
  onApprove: (userId: string) => Promise<void>
  onReject: (userId: string) => Promise<void>
}

export function PendingUsersTable({ users, onApprove, onReject }: PendingUsersTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null)

  const handleApprove = async (userId: string) => {
    setLoadingId(userId)
    setActionType('approve')
    try {
      await onApprove(userId)
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  const handleReject = async (userId: string) => {
    if (!window.confirm('¿Estás seguro de rechazar este usuario?')) return
    setLoadingId(userId)
    setActionType('reject')
    try {
      await onReject(userId)
    } finally {
      setLoadingId(null)
      setActionType(null)
    }
  }

  if (users.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border rounded-lg bg-muted/20">
        No hay solicitudes pendientes de aprobación.
      </div>
    )
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Fecha de Registro</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell className="font-medium">{user.email}</TableCell>
              <TableCell>
                {new Date(user.created_at || '').toLocaleDateString('es-CL', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                  Pendiente
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                    onClick={() => handleApprove(user.id)}
                    disabled={loadingId === user.id}
                  >
                    {loadingId === user.id && actionType === 'approve' ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Check className="w-4 h-4 mr-1" />
                    )}
                    Aprobar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    onClick={() => handleReject(user.id)}
                    disabled={loadingId === user.id}
                  >
                    {loadingId === user.id && actionType === 'reject' ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <X className="w-4 h-4 mr-1" />
                    )}
                    Rechazar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
