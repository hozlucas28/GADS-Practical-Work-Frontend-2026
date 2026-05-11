"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, X, Search, Filter, Calendar as CalendarIcon } from "lucide-react"

type EventType = "tardanza" | "ausencia" | "horas_extra_50" | "horas_extra_100"
type Status = "pending" | "approved" | "rejected"

interface Novedad {
  id: string
  employeeName: string
  employeeId: string
  date: string
  eventType: EventType
  status: Status
  hours?: number
  notes?: string
}

const eventTypeConfig: Record<EventType, { label: string; color: string }> = {
  tardanza: {
    label: "Tardanza",
    color: "bg-warning/10 text-warning-foreground border-warning/30",
  },
  ausencia: {
    label: "Ausencia",
    color: "bg-destructive/10 text-destructive border-destructive/30",
  },
  horas_extra_50: {
    label: "Horas Extra 50%",
    color: "bg-chart-1/10 text-chart-1 border-chart-1/30",
  },
  horas_extra_100: {
    label: "Horas Extra 100%",
    color: "bg-chart-2/10 text-chart-2 border-chart-2/30",
  },
}

const statusConfig: Record<Status, { label: string; color: string }> = {
  pending: {
    label: "Pendiente",
    color: "bg-warning/10 text-warning-foreground",
  },
  approved: {
    label: "Aprobado",
    color: "bg-success/10 text-success",
  },
  rejected: {
    label: "Rechazado",
    color: "bg-destructive/10 text-destructive",
  },
}

const sampleNovedades: Novedad[] = [
  {
    id: "1",
    employeeName: "María García",
    employeeId: "EMP-001",
    date: "14 Abr 2026",
    eventType: "tardanza",
    status: "pending",
    notes: "Llegó 30 minutos tarde",
  },
  {
    id: "2",
    employeeName: "Carlos Rodríguez",
    employeeId: "EMP-002",
    date: "14 Abr 2026",
    eventType: "horas_extra_50",
    status: "pending",
    hours: 2.5,
  },
  {
    id: "3",
    employeeName: "Ana Martínez",
    employeeId: "EMP-003",
    date: "13 Abr 2026",
    eventType: "ausencia",
    status: "pending",
    notes: "Sin justificativo",
  },
  {
    id: "4",
    employeeName: "Pedro López",
    employeeId: "EMP-004",
    date: "13 Abr 2026",
    eventType: "horas_extra_100",
    status: "approved",
    hours: 4,
  },
  {
    id: "5",
    employeeName: "Laura Sánchez",
    employeeId: "EMP-005",
    date: "12 Abr 2026",
    eventType: "tardanza",
    status: "rejected",
    notes: "Sin justificativo válido",
  },
  {
    id: "6",
    employeeName: "Diego Fernández",
    employeeId: "EMP-006",
    date: "12 Abr 2026",
    eventType: "horas_extra_50",
    status: "pending",
    hours: 1.5,
  },
  {
    id: "7",
    employeeName: "Sofía Torres",
    employeeId: "EMP-007",
    date: "11 Abr 2026",
    eventType: "ausencia",
    status: "approved",
    notes: "Certificado médico presentado",
  },
  {
    id: "8",
    employeeName: "Martín Ruiz",
    employeeId: "EMP-008",
    date: "11 Abr 2026",
    eventType: "tardanza",
    status: "pending",
    notes: "Problema de transporte",
  },
]

export function NovedadesTable() {
  const [novedades, setNovedades] = useState(sampleNovedades)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredNovedades = novedades.filter((novedad) => {
    const matchesStatus =
      statusFilter === "all" || novedad.status === statusFilter
    const matchesSearch =
      novedad.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      novedad.employeeId.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesStatus && matchesSearch
  })

  const handleApprove = (id: string) => {
    setNovedades((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "approved" as Status } : n))
    )
  }

  const handleReject = (id: string) => {
    setNovedades((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "rejected" as Status } : n))
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      {/* Filters */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <label htmlFor="novedades-busqueda" className="sr-only">
                Buscar empleado
              </label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="novedades-busqueda"
                placeholder="Buscar empleado..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <label
                htmlFor="novedades-estado"
                className="text-sm text-muted-foreground"
              >
                Estado:
              </label>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="novedades-estado" className="w-[140px]">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="approved">Aprobado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              Filtrar Fecha
            </Button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <caption className="sr-only">Listado de novedades</caption>
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Empleado
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Fecha
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Tipo de Evento
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Estado
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredNovedades.map((novedad) => {
              const eventConfig = eventTypeConfig[novedad.eventType]
              const statusInfo = statusConfig[novedad.status]
              return (
                <tr
                  key={novedad.id}
                  className="transition-colors hover:bg-muted/20"
                >
                  <td className="px-5 py-4">
                    <div>
                      <p className="text-sm font-medium text-card-foreground">
                        {novedad.employeeName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {novedad.employeeId}
                      </p>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="text-sm text-card-foreground">
                      {novedad.date}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-medium",
                        eventConfig.color
                      )}
                    >
                      {eventConfig.label}
                      {novedad.hours && ` (${novedad.hours}h)`}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
                        statusInfo.color
                      )}
                    >
                      {statusInfo.label}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {novedad.status === "pending" ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-success hover:bg-success/10 hover:text-success border-success/30"
                          onClick={() => handleApprove(novedad.id)}
                        >
                          <Check className="h-4 w-4" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
                          onClick={() => handleReject(novedad.id)}
                        >
                          <X className="h-4 w-4" />
                          Rechazar
                        </Button>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border px-5 py-4">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredNovedades.length} de {novedades.length} registros
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Anterior
          </Button>
          <Button variant="outline" size="sm">
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}
