'use client'

import { useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
  ColumnFiltersState,
  flexRender,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { getColumns } from './columns'
import { MasterCost } from '@/types'

interface CostsTableProps {
  data: MasterCost[]
  onEdit: (cost: MasterCost) => void
  onDelete: (id: string) => void
}

export function CostsTable({ data, onEdit, onDelete }: CostsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const columns = getColumns(onEdit, onDelete)

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      // Custom global filter function applied to all columns.
      // In this case, we're assuming the user wants to filter by 'servicio'.
      // If we only wanted it for 'servicio', we could use table.getColumn('servicio')?.setFilterValue
      // but a global filter is asked for. Let's filter globally.
      const servicio = row.getValue('servicio')
      return String(servicio).toLowerCase().includes(String(filterValue).toLowerCase())
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  return (
    <div>
      <div className="flex items-center gap-4 py-4">
        <Input
          placeholder="Buscar por servicio..."
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={typeFilter}
          onChange={(e) => {
            const val = e.target.value;
            if (val === 'all') {
              table.getColumn('tipo_evento')?.setFilterValue(undefined);
              setTypeFilter('all');
            } else {
              table.getColumn('tipo_evento')?.setFilterValue(val);
              setTypeFilter(val);
            }
          }}
          options={[
            { value: 'all', label: 'Todos los tipos' },
            { value: 'Privado', label: 'Privado' },
            { value: 'Empresa', label: 'Empresa' },
            { value: 'Cumpleaños', label: 'Cumpleaños' },
            { value: 'Matrimonio', label: 'Matrimonio' },
          ]}
          className="w-[180px]"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No se encontraron servicios.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <div className="text-sm">
          Página {table.getState().pagination.pageIndex + 1} de{' '}
          {table.getPageCount()}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Siguiente
        </Button>
      </div>
    </div>
  )
}
