'use client'

import { useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
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
import { computeCostTaxBreakdown, CostResourceType } from '@/lib/cost-metadata'
import { Receipt, Search } from 'lucide-react'

interface CostsTableProps {
  data: MasterCost[]
  onEdit: (cost: MasterCost) => void
  onDelete: (id: string) => void
}

const RESOURCE_TABS: { value: 'all' | CostResourceType; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'personal', label: 'Personal / RR.HH.' },
  { value: 'servicio', label: 'Servicios / Equipos' },
  { value: 'insumo', label: 'Banquetería' },
  { value: 'logistica', label: 'Logística' },
]

export function CostsTable({ data, onEdit, onDelete }: CostsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [searchText, setSearchText] = useState('')
  const [resourceFilter, setResourceFilter] = useState<'all' | CostResourceType>('all')
  const [docFilter, setDocFilter] = useState<'all' | 'factura' | 'boleta'>('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showTaxBreakdown, setShowTaxBreakdown] = useState(false)

  const filteredData = useMemo(() => {
    const query = searchText.trim().toLowerCase()
    return data.filter((cost) => {
      const b = computeCostTaxBreakdown(cost)
      if (resourceFilter !== 'all' && b.meta.resourceType !== resourceFilter) {
        return false
      }
      if (docFilter !== 'all' && b.tipoDocCompra !== docFilter) {
        return false
      }
      if (typeFilter !== 'all' && cost.tipo_evento !== typeFilter) {
        return false
      }
      if (query) {
        const matchesService = cost.servicio.toLowerCase().includes(query)
        const matchesDetail = (b.meta.cleanDetail || '').toLowerCase().includes(query)
        if (!matchesService && !matchesDetail) return false
      }
      return true
    })
  }, [data, searchText, resourceFilter, docFilter, typeFilter])

  const columns = useMemo(
    () => getColumns(onEdit, onDelete, showTaxBreakdown),
    [onEdit, onDelete, showTaxBreakdown]
  )

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
    state: {
      sorting,
    },
  })

  return (
    <div className="space-y-3">
      {/* Filtros por Naturaleza + Toggle Desglose Tributario */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5 bg-muted/40 p-1 rounded-xl border border-border/60">
          {RESOURCE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setResourceFilter(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                resourceFilter === tab.value
                  ? 'bg-background text-foreground shadow-2xs border border-border/60'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <Button
          type="button"
          variant={showTaxBreakdown ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowTaxBreakdown((prev) => !prev)}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <Receipt className="h-3.5 w-3.5" />
          {showTaxBreakdown ? 'Ocultar Desglose IVA' : 'Ver Desglose IVA Crédito / Débito'}
        </Button>
      </div>

      {/* Buscador y Selects */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-2.5" />
          <Input
            placeholder="Buscar servicio, cargo o detalle..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
        <Select
          value={docFilter}
          onChange={(e) => setDocFilter(e.target.value as 'all' | 'factura' | 'boleta')}
          options={[
            { value: 'all', label: 'Todos los Docs Compra' },
            { value: 'factura', label: 'Factura (IVA Crédito)' },
            { value: 'boleta', label: 'Boleta / Honorarios' },
          ]}
          className="w-[195px] h-9 text-xs"
        />
        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: 'all', label: 'Todos los Eventos' },
            { value: 'Privado', label: 'Privado' },
            { value: 'Empresa', label: 'Empresa' },
            { value: 'Cumpleaños', label: 'Cumpleaños' },
            { value: 'Matrimonio', label: 'Matrimonio' },
          ]}
          className="w-[165px] h-9 text-xs"
        />
      </div>

      <div className="rounded-xl border bg-card overflow-x-auto shadow-2xs">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="whitespace-nowrap">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id} className="hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No se encontraron servicios con los filtros seleccionados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <p className="text-xs text-muted-foreground">
          Mostrando {filteredData.length} de {data.length} tarifas registradas
        </p>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <div className="text-xs font-medium">
            Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}
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
    </div>
  )
}
