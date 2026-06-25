"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, Search, Plus, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  createClocking,
  deleteClocking,
  fetchClockings,
  fetchEmployees,
  fetchOrigenFichada,
  updateClocking,
  type Clocking,
  type ClockingCreate,
  type ClockingUpdate,
  type Employee,
  type OrigenFichada,
} from "@/lib/api"

// ─── Constantes ───────────────────────────────────────────────────────────────

const TIPOS_FICHADA: { value: string; label: string }[] = [
  { value: "entrada", label: "Entrada" },
  { value: "salida",  label: "Salida"  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtEmpleado(emp: Employee): string {
  return `${emp.apellido}, ${emp.nombre} — ${emp.legajo}`
}

function fmtOrigen(o: OrigenFichada): string {
  return o.descripcion ? `${o.nombre_origen} — ${o.descripcion}` : o.nombre_origen
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" })
}

/** El input datetime-local entrega "2024-06-25T08:00"; el backend espera ISO 8601 con segundos. */
/**
 * Convierte el valor de un input datetime-local ("YYYY-MM-DDTHH:MM") a un
 * string ISO 8601 con el offset de la zona horaria local del navegador.
 * Así el backend recibe la hora exacta que el usuario ingresó, sin conversión UTC.
 */
function toIsoDateTime(value: string): string {
  if (!value) return value
  // datetime-local entrega "YYYY-MM-DDTHH:MM" (16 chars) o "YYYY-MM-DDTHH:MM:SS"
  const normalized = value.length === 16 ? `${value}:00` : value
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return normalized
  // Calcular offset local en formato +HH:MM / -HH:MM
  const offsetMin = -date.getTimezoneOffset()
  const sign = offsetMin >= 0 ? "+" : "-"
  const absMin = Math.abs(offsetMin)
  const pad = (n: number) => String(n).padStart(2, "0")
  const offsetStr = `${sign}${pad(Math.floor(absMin / 60))}:${pad(absMin % 60)}`
  // Reconstruir el string con la fecha/hora local (sin que Date la convierta a UTC)
  return `${normalized}${offsetStr}`
}

function exportClockingsToCsv(clockings: Clocking[], employees: Employee[], origenes: OrigenFichada[]) {
  const empMap = new Map(employees.map((e) => [e.id_empleado, fmtEmpleado(e)]))
  const origMap = new Map(origenes.map((o) => [o.id_origen_fichada, o.nombre_origen]))

  const headers = ["ID", "Fecha y hora", "Tipo", "Empleado", "Origen", "Observación", "Fue corregida"]
  const rows = clockings.map((c) => [
    c.id_fichada,
    c.fecha_hora,
    c.tipo_fichada,
    empMap.get(c.id_empleado) ?? c.id_empleado,
    origMap.get(c.id_origen_fichada ?? 0) ?? c.id_origen_fichada ?? "",
    c.observacion ?? "",
    c.fue_corregida ?? "",
  ])

  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n")

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `fichadas_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

type ClockingsTableProps = {
  initialClockings?: Clocking[]
  error?: string | null
}

type ClockingFormState = {
  fecha_hora: string
  tipo_fichada: string
  observacion: string
  id_empleado: string       // string con el número para el Select
  id_origen_fichada: string // string con el número para el Select
}

type FilterState = {
  query: string
  id_empleado: string // "all" o id numérico como string
  desde: string
  hasta: string
}

function buildForm(clocking: Clocking): ClockingFormState {
  // El backend devuelve fechas con zona horaria; datetime-local necesita "YYYY-MM-DDTHH:MM"
  let fechaLocal = clocking.fecha_hora ?? ""
  if (fechaLocal) {
    const d = new Date(fechaLocal)
    if (!Number.isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0")
      fechaLocal = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }
  }
  return {
    fecha_hora:        fechaLocal,
    tipo_fichada:      clocking.tipo_fichada ?? "",
    observacion:       clocking.observacion ?? "",
    id_empleado:       String(clocking.id_empleado ?? ""),
    id_origen_fichada: clocking.id_origen_fichada ? String(clocking.id_origen_fichada) : "",
  }
}

function buildPayload(original: Clocking, form: ClockingFormState): ClockingUpdate {
  const payload: ClockingUpdate = {}

  const isoFecha = toIsoDateTime(form.fecha_hora)
  if (isoFecha !== original.fecha_hora) payload.fecha_hora = isoFecha
  if (form.tipo_fichada !== original.tipo_fichada) payload.tipo_fichada = form.tipo_fichada
  if ((form.observacion || "") !== (original.observacion ?? "")) payload.observacion = form.observacion || null

  const origen = Number(form.id_origen_fichada)
  if (!Number.isNaN(origen) && origen !== (original.id_origen_fichada ?? null))
    payload.id_origen_fichada = origen

  return payload
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function ClockingsTable({ initialClockings, error }: ClockingsTableProps) {
  // ── Datos del formulario ──
  const [employees, setEmployees] = useState<Employee[]>([])
  const [origenes, setOrigenes] = useState<OrigenFichada[]>([])
  const [loadingCatalogos, setLoadingCatalogos] = useState(true)

  // ── Fichadas ──
  const [clockings, setClockings] = useState(initialClockings ?? [])
  const [isLoading, setIsLoading] = useState(!initialClockings)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)

  // ── Filtros ──
  const [filters, setFilters] = useState<FilterState>({ query: "", id_empleado: "", desde: "", hasta: "" })

  // ── Edición ──
  const [selectedClocking, setSelectedClocking] = useState<Clocking | null>(null)
  const [formState, setFormState] = useState<ClockingFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // ── Creación ──
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<ClockingFormState>({
    fecha_hora: "", tipo_fichada: "", observacion: "", id_empleado: "", id_origen_fichada: "",
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  // ── Eliminación ──
  const [pendingDelete, setPendingDelete] = useState<Clocking | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Búsqueda de empleados en el selector ──
  const [empInput, setEmpInput] = useState("")
  const [empOpen, setEmpOpen] = useState(false)
  const empComboRef = useRef<HTMLDivElement>(null)

  // ── Carga de catálogos (empleados + orígenes) al montar ──────────────────
  useEffect(() => {
    Promise.all([fetchEmployees(), fetchOrigenFichada()])
      .then(([emps, origs]) => {
        setEmployees(emps.filter((e) => e.estado === "activo"))
        setOrigenes(origs)
      })
      .catch(() => { /* silencioso: los selectores quedarán vacíos */ })
      .finally(() => setLoadingCatalogos(false))
  }, [])

  // ── Carga de fichadas ────────────────────────────────────────────────────
  const loadClockings = useCallback(() => {
    const params: { id_empleado?: number; desde?: string; hasta?: string } = {}
    const empId = Number(filters.id_empleado)
    if (!Number.isNaN(empId) && empId > 0) params.id_empleado = empId
    if (filters.desde) params.desde = filters.desde
    if (filters.hasta) params.hasta = filters.hasta

    setIsLoading(true)
    fetchClockings(params)
      .then((data) => { setClockings(data); setLoadError(null) })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Error al cargar fichadas"))
      .finally(() => setIsLoading(false))
  }, [filters.id_empleado, filters.desde, filters.hasta])

  useEffect(() => {
    if (initialClockings) return
    loadClockings()
  }, [initialClockings, loadClockings])

  // ── Filtro local por búsqueda de texto ──────────────────────────────────
  const filteredClockings = useMemo(() => {
    if (!filters.query) return clockings
    const q = filters.query.toLowerCase()
    const empMap = new Map(employees.map((e) => [e.id_empleado, fmtEmpleado(e).toLowerCase()]))
    return clockings.filter((c) =>
      c.tipo_fichada.toLowerCase().includes(q) ||
      (empMap.get(c.id_empleado) ?? "").includes(q),
    )
  }, [clockings, filters.query, employees])

  // ── Mapas para lookup en tabla ──────────────────────────────────────────
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id_empleado, e])), [employees])
  const origMap = useMemo(() => new Map(origenes.map((o) => [o.id_origen_fichada, o])), [origenes])

  // ── Empleados filtrados en el combobox de creación ──────────────────────
  const filteredEmpsCreate = useMemo(() => {
    if (!empInput) return employees
    const q = empInput.toLowerCase()
    return employees.filter((e) => fmtEmpleado(e).toLowerCase().includes(q))
  }, [employees, empInput])

  // Cierra el dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (empComboRef.current && !empComboRef.current.contains(e.target as Node)) {
        setEmpOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // ── Diálogos ─────────────────────────────────────────────────────────────
  const openEditDialog = (clocking: Clocking) => {
    setSelectedClocking(clocking)
    setFormState(buildForm(clocking))
    setFormError(null)
  }
  const closeEditDialog = () => { setSelectedClocking(null); setFormState(null); setFormError(null) }

  const openCreateDialog = () => {
    setCreateState({ fecha_hora: "", tipo_fichada: "", observacion: "", id_empleado: "", id_origen_fichada: "" })
    setCreateError(null)
    setEmpInput("")
    setEmpOpen(false)
    setIsCreateOpen(true)
  }
  const closeCreateDialog = () => { setIsCreateOpen(false); setCreateError(null) }

  const openDeleteDialog  = (c: Clocking) => setPendingDelete(c)
  const closeDeleteDialog = () => setPendingDelete(null)

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      setIsDeleting(true)
      await deleteClocking(pendingDelete.id_fichada)
      setClockings((prev) => prev.filter((c) => c.id_fichada !== pendingDelete.id_fichada))
      toast({ title: "Fichada eliminada", description: "La fichada fue eliminada correctamente." })
      closeDeleteDialog()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al eliminar", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const idEmpleado = Number(createState.id_empleado)
    const idOrigen   = Number(createState.id_origen_fichada)

    if (!createState.fecha_hora)   { setCreateError("La fecha y hora son obligatorias."); return }
    if (!createState.tipo_fichada) { setCreateError("El tipo de fichada es obligatorio."); return }
    if (!createState.id_empleado)  { setCreateError("Seleccioná un empleado."); return }
    if (!createState.id_origen_fichada) { setCreateError("Seleccioná un origen de fichada."); return }

    const payload: ClockingCreate = {
      fecha_hora:        toIsoDateTime(createState.fecha_hora),
      tipo_fichada:      createState.tipo_fichada,
      observacion:       createState.observacion.trim() || null,
      id_empleado:       idEmpleado,
      id_origen_fichada: idOrigen,
    }

    try {
      setIsCreating(true)
      const created = await createClocking(payload)
      setClockings((prev) => [created, ...prev])
      toast({ title: "Fichada creada", description: "La fichada fue registrada correctamente." })
      closeCreateDialog()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error al crear")
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedClocking || !formState) return

    const payload = buildPayload(selectedClocking, formState)
    if (Object.keys(payload).length === 0) {
      toast({ title: "Sin cambios", description: "No hay cambios para guardar." })
      return
    }

    try {
      setIsSaving(true)
      const updated = await updateClocking(selectedClocking.id_fichada, payload)
      setClockings((prev) => prev.map((c) => (c.id_fichada === updated.id_fichada ? updated : c)))
      setSelectedClocking(updated)
      setFormState(buildForm(updated))
      setFormError(null)
      toast({ title: "Fichada actualizada", description: "Los cambios se guardaron correctamente." })
      closeEditDialog()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">

        {/* Barra de filtros */}
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
          <div className="flex flex-1 flex-wrap gap-3">
            {/* Búsqueda libre */}
            <div className="relative min-w-[180px] flex-1">
              <label htmlFor="fichadas-busqueda" className="sr-only">Buscar</label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fichadas-busqueda"
                placeholder="Buscar por tipo o empleado…"
                value={filters.query}
                onChange={(e) => setFilters((p) => ({ ...p, query: e.target.value }))}
                className="pl-9"
              />
            </div>

            {/* Filtro por empleado */}
            <div className="min-w-[200px]">
              <label htmlFor="filtro-empleado" className="sr-only">Filtrar por empleado</label>
              <Select
                value={filters.id_empleado || "all"}
                onValueChange={(v) => setFilters((p) => ({ ...p, id_empleado: v === "all" ? "" : v }))}
              >
                <SelectTrigger id="filtro-empleado">
                  <SelectValue placeholder="Todos los empleados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los empleados</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id_empleado} value={String(e.id_empleado)}>
                      {fmtEmpleado(e)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Rango de fechas */}
            <div className="flex items-center gap-2">
              <label htmlFor="filtro-desde" className="text-xs text-muted-foreground">Desde</label>
              <Input id="filtro-desde" type="date" value={filters.desde} onChange={(e) => setFilters((p) => ({ ...p, desde: e.target.value }))} className="w-36" />
              <label htmlFor="filtro-hasta" className="text-xs text-muted-foreground">Hasta</label>
              <Input id="filtro-hasta" type="date" value={filters.hasta} onChange={(e) => setFilters((p) => ({ ...p, hasta: e.target.value }))} className="w-36" />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadClockings} className="gap-2">
              <Search className="h-4 w-4" /> Buscar
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => exportClockingsToCsv(filteredClockings, employees, origenes)}>
              <Download className="h-4 w-4" /> Exportar
            </Button>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" /> Nueva fichada
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="px-5 py-4">
            <Alert variant="destructive">
              <AlertTitle>Error al cargar fichadas</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Registro de fichadas</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Tipo</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Empleado</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Fecha y hora</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Origen</th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Observación</th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><Spinner className="size-4" /> Cargando fichadas…</span>
                </td></tr>
              ) : filteredClockings.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-muted-foreground">No hay fichadas para mostrar.</td></tr>
              ) : (
                filteredClockings.map((clocking) => {
                  const emp  = empMap.get(clocking.id_empleado)
                  const orig = clocking.id_origen_fichada ? origMap.get(clocking.id_origen_fichada) : null
                  return (
                    <tr key={clocking.id_fichada} className="transition-colors hover:bg-muted/20">
                      <td className="px-5 py-4 text-sm capitalize text-card-foreground">{clocking.tipo_fichada}</td>
                      <td className="px-5 py-4 text-sm text-card-foreground">
                        {emp ? (
                          <div>
                            <p className="font-medium">{emp.apellido}, {emp.nombre}</p>
                            <p className="text-xs text-muted-foreground">{emp.legajo}</p>
                          </div>
                        ) : clocking.id_empleado}
                      </td>
                      <td className="px-5 py-4 text-sm text-card-foreground">{formatDateTime(clocking.fecha_hora)}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground capitalize">{orig?.nombre_origen ?? "—"}</td>
                      <td className="px-5 py-4 text-sm text-muted-foreground">{clocking.observacion ?? "—"}</td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <Button size="icon" variant="ghost" aria-label="Editar fichada" onClick={() => openEditDialog(clocking)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" aria-label="Eliminar fichada" onClick={() => openDeleteDialog(clocking)}
                            className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Diálogo: editar ── */}
      <Dialog open={!!selectedClocking} onOpenChange={(open) => { if (!open) closeEditDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar fichada</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={handleUpdateSubmit}>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <label htmlFor="edit-fecha" className="text-sm font-medium">Fecha y hora <span className="text-destructive">*</span></label>
              <Input id="edit-fecha" type="datetime-local" required
                value={formState?.fecha_hora ?? ""}
                onChange={(e) => setFormState((p) => p ? { ...p, fecha_hora: e.target.value } : p)}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="edit-tipo" className="text-sm font-medium">Tipo <span className="text-destructive">*</span></label>
              <Select value={formState?.tipo_fichada ?? ""} onValueChange={(v) => setFormState((p) => p ? { ...p, tipo_fichada: v } : p)}>
                <SelectTrigger id="edit-tipo"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_FICHADA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="edit-origen" className="text-sm font-medium">Origen de fichada <span className="text-destructive">*</span></label>
              <Select value={formState?.id_origen_fichada ?? ""} onValueChange={(v) => setFormState((p) => p ? { ...p, id_origen_fichada: v } : p)}>
                <SelectTrigger id="edit-origen"><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                <SelectContent>
                  {origenes.map((o) => (
                    <SelectItem key={o.id_origen_fichada} value={String(o.id_origen_fichada)}>
                      {fmtOrigen(o)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <label htmlFor="edit-obs" className="text-sm font-medium">Observación</label>
              <Input id="edit-obs" placeholder="Opcional"
                value={formState?.observacion ?? ""}
                onChange={(e) => setFormState((p) => p ? { ...p, observacion: e.target.value } : p)}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <span className="inline-flex items-center gap-2"><Spinner className="size-4" /> Guardando</span> : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: crear ── */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) closeCreateDialog() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nueva fichada</DialogTitle></DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreateSubmit}>
            {createError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}

            {/* Empleado — combobox con búsqueda integrada */}
            <div className="grid gap-2">
              <label htmlFor="create-emp-input" className="text-sm font-medium">
                Empleado <span className="text-destructive">*</span>
              </label>
              <div ref={empComboRef} className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="create-emp-input"
                  autoComplete="off"
                  placeholder="Buscar por nombre o legajo…"
                  value={empInput}
                  onFocus={() => setEmpOpen(true)}
                  onChange={(e) => {
                    setEmpInput(e.target.value)
                    setEmpOpen(true)
                    // Si el usuario escribe, limpiar la selección previa
                    setCreateState((p) => ({ ...p, id_empleado: "" }))
                  }}
                  className="pl-9"
                />
                {empOpen && (
                  <ul className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border border-border bg-popover py-1 shadow-md">
                    {loadingCatalogos ? (
                      <li className="px-3 py-2 text-xs text-muted-foreground">Cargando empleados…</li>
                    ) : filteredEmpsCreate.length === 0 ? (
                      <li className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</li>
                    ) : filteredEmpsCreate.map((e) => (
                      <li
                        key={e.id_empleado}
                        onMouseDown={(ev) => {
                          ev.preventDefault() // evita que el input pierda el foco antes de registrar el click
                          setCreateState((p) => ({ ...p, id_empleado: String(e.id_empleado) }))
                          setEmpInput(fmtEmpleado(e))
                          setEmpOpen(false)
                        }}
                        className={[
                          "cursor-pointer px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                          createState.id_empleado === String(e.id_empleado) ? "bg-accent/50 font-medium" : "",
                        ].join(" ")}
                      >
                        {fmtEmpleado(e)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="create-fecha" className="text-sm font-medium">Fecha y hora <span className="text-destructive">*</span></label>
              <Input id="create-fecha" type="datetime-local" required
                value={createState.fecha_hora}
                onChange={(e) => setCreateState((p) => ({ ...p, fecha_hora: e.target.value }))}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="create-tipo" className="text-sm font-medium">Tipo <span className="text-destructive">*</span></label>
              <Select value={createState.tipo_fichada} onValueChange={(v) => setCreateState((p) => ({ ...p, tipo_fichada: v }))}>
                <SelectTrigger id="create-tipo"><SelectValue placeholder="Seleccionar tipo" /></SelectTrigger>
                <SelectContent>
                  {TIPOS_FICHADA.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Origen de fichada */}
            <div className="grid gap-2">
              <label htmlFor="create-origen" className="text-sm font-medium">Origen <span className="text-destructive">*</span></label>
              {loadingCatalogos ? (
                <p className="text-xs text-muted-foreground">Cargando orígenes…</p>
              ) : (
                <Select value={createState.id_origen_fichada} onValueChange={(v) => setCreateState((p) => ({ ...p, id_origen_fichada: v }))}>
                  <SelectTrigger id="create-origen"><SelectValue placeholder="Seleccionar origen" /></SelectTrigger>
                  <SelectContent>
                    {origenes.map((o) => (
                      <SelectItem key={o.id_origen_fichada} value={String(o.id_origen_fichada)}>
                        {fmtOrigen(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="grid gap-2">
              <label htmlFor="create-obs" className="text-sm font-medium">Observación</label>
              <Input id="create-obs" placeholder="Opcional"
                value={createState.observacion}
                onChange={(e) => setCreateState((p) => ({ ...p, observacion: e.target.value }))}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? <span className="inline-flex items-center gap-2"><Spinner className="size-4" /> Guardando</span> : "Crear fichada"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: confirmar eliminación ── */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) closeDeleteDialog() }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar fichada</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmás que querés eliminar la fichada del{" "}
            <span className="font-medium text-foreground">{pendingDelete ? formatDateTime(pendingDelete.fecha_hora) : ""}</span>?{" "}
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? <span className="inline-flex items-center gap-2"><Spinner className="size-4" /> Eliminando</span> : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
