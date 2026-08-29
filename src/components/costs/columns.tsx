'use client'

import { ColumnDef } from '@tanstack/react-table'
import { MasterCost } from '@/types'
import { formatCLP } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, ArrowUpDown } from 'lucide-react'

export function getColumns(
  onEdit: (cost: MasterCost) => void,
  onDelete: (id: string) => void
): ColumnDef<MasterCost>[] {
  return [
    {
      accessorKey: 'servicio',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Servicio
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
    },
    {
      accessorKey: 'tiempo_detalle',
      header: 'Detalle/Tiempo',
    },
    {
      accessorKey: 'tipo_evento',
      header: 'Tipo Evento',
    },
    {
      accessorKey: 'costo',
      header: ({ column }) => {
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Costo
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('costo'))
        return <div className="text-right font-medium">{formatCLP(amount)}</div>
      },
    },
    {
      accessorKey: 'ganancia',
      header: () => <div className="text-right">Ganancia</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('ganancia'))
        return <div className="text-right font-medium">{formatCLP(amount)}</div>
      },
    },
    {
      accessorKey: 'valor_neto',
      header: () => <div className="text-right">Valor Neto</div>,
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('valor_neto'))
        return <div className="text-right font-medium">{formatCLP(amount)}</div>
      },
    },
    {
      accessorKey: 'valor_total',
      header: ({ column }) => {
        return (
          <div className="flex justify-end">
            <Button
              variant="ghost"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              Valor Total
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )
      },
      cell: ({ row }) => {
        const amount = parseFloat(row.getValue('valor_total'))
        return <div className="text-right font-medium">{formatCLP(amount)}</div>
      },
    },
    {
      id: 'actions',
      header: 'Acciones',
      cell: ({ row }) => {
        const cost = row.original
        return (
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="icon" onClick={() => onEdit(cost)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-red-500 hover:text-red-700 hover:bg-red-100"
              onClick={() => onDelete(cost.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )
      },
    },
  ]
}
