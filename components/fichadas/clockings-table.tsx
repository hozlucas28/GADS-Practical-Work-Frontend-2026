"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  updateClocking,
  type Clocking,
  type ClockingCreate,
  type ClockingUpdate,
} from "@/lib/api"

const TIPOS_FICHADA = ["entrada", "salida"]

function exportClockingsToCsv(clockings: Clocking[]) {
  const headers = ["ID", "Fecha y hora", "Tipo", "ID Empleado", "Observacion", "ID Origen", "Fue corregida"]
  const rows = clockings.map((c) => [
    c.id_fichada,
    c.fecha_hora,
    c.tipo_fichada,
    c.id_empleado,
    c.observacion ?? "",
    c.id_origen_fichada ?? "",
    c.fue_corregida ?? "",
  ])

  const csvContent = [headers, ...rows]
    .map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n")

  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  const timestamp = new Date().toISOString().slice(0, 10)
  link.href = url
  link.download = `fichadas_${timestamp}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

type ClockingsTableProps = {
  initialClockings?: Clocking[]
  error?: string | null
}

type ClockingFormState = {
  fecha_hora: string
  tipo_fichada: string
  observacion: string
  id_empleado: string
  id_origen_fichada: string
}

type FilterState = {
  query: string
  id_empleado: string
  desde: string
  hasta: string
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function buildForm(clocking: Clocking): ClockingFormState {
  return {
    fecha_hora: clocking.fecha_hora ?? "",
    tipo_fichada: clocking.tipo_fichada ?? "",
    observacion: clocking.observacion ?? "",
    id_empleado: String(clocking.id_empleado ?? ""),
    id_origen_fichada: clocking.id_origen_fichada
      ? String(clocking.id_origen_fichada)
      : "",
  }
}

function buildPayload(
  original: Clocking,
  form: ClockingFormState,
): ClockingUpdate {
  const payload: ClockingUpdate = {}

  if (form.fecha_hora !== original.fecha_hora) {
    payload.fecha_hora = form.fecha_hora
  }
  if (form.tipo_fichada !== original.tipo_fichada) {
    payload.tipo_fichada = form.tipo_fichada
  }
  if ((form.observacion || "") !== (original.observacion ?? "")) {
    payload.observacion = form.observacion || null
  }

  const origen = toNumber(form.id_origen_fichada)
  if (
    origen !== null &&
    origen !== (original.id_origen_fichada ?? null)
  ) {
    payload.id_origen_fichada = origen
  }

  return payload
}

export function ClockingsTable({ initialClockings, error }: ClockingsTableProps) {
  const [clockings, setClockings] = useState(initialClockings ?? [])
  const [isLoading, setIsLoading] = useState(!initialClockings)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)
  const [filters, setFilters] = useState<FilterState>({
    query: "",
    id_empleado: "",
    desde: "",
    hasta: "",
  })
  const [selectedClocking, setSelectedClocking] = useState<Clocking | null>(null)
  const [formState, setFormState] = useState<ClockingFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<ClockingFormState>({
    fecha_hora: "",
    tipo_fichada: "",
    observacion: "",
    id_empleado: "",
    id_origen_fichada: "",
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Clocking | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadClockings = useCallback(() => {
    const params: { id_empleado?: number; desde?: string; hasta?: string } = {}

    const employeeId = toNumber(filters.id_empleado)
    if (employeeId !== null) params.id_empleado = employeeId
    if (filters.desde) params.desde = filters.desde
    if (filters.hasta) params.hasta = filters.hasta

    setIsLoading(true)
    fetchClockings(params)
      .then((data) => {
        setClockings(data)
        setLoadError(null)
      })
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : "Error al cargar fichadas",
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [filters.id_empleado, filters.desde, filters.hasta])

  useEffect(() => {
    if (initialClockings) return
    loadClockings()
  }, [initialClockings, loadClockings])

  const filteredClockings = useMemo(() => {
    if (!filters.query) return clockings
    const query = filters.query.toLowerCase()
    return clockings.filter((clocking) =>
      clocking.tipo_fichada.toLowerCase().includes(query),
    )
  }, [clockings, filters.query])

  const openEditDialog = (clocking: Clocking) => {
    setSelectedClocking(clocking)
    setFormState(buildForm(clocking))
    setFormError(null)
  }

  const closeEditDialog = () => {
    setSelectedClocking(null)
    setFormState(null)
    setFormError(null)
  }

  const openCreateDialog = () => {
    setCreateState({
      fecha_hora: "",
      tipo_fichada: "",
      observacion: "",
      id_empleado: "",
      id_origen_fichada: "",
    })
    setCreateError(null)
    setIsCreateOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreateError(null)
  }

  const openDeleteDialog = (clocking: Clocking) => {
    setPendingDelete(clocking)
  }

  const closeDeleteDialog = () => {
    setPendingDelete(null)
  }

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const idEmpleado = toNumber(createState.id_empleado)
    const idOrigen = toNumber(createState.id_origen_fichada)

    if (idEmpleado === null || idOrigen === null) {
      setCreateError("Los IDs deben ser numeros validos.")
      return
    }

    const payload: ClockingCreate = {
      fecha_hora: createState.fecha_hora,
      tipo_fichada: createState.tipo_fichada.trim(),
      observacion: createState.observacion.trim() || null,
      id_empleado: idEmpleado,
      id_origen_fichada: idOrigen,
    }

    if (!payload.fecha_hora || !payload.tipo_fichada) {
      setCreateError("Completa los campos obligatorios.")
      return
    }

    try {
      setIsCreating(true)
      const created = await createClocking(payload)
      setClockings((prev) => [created, ...prev])
      toast({
        title: "Fichada creada",
        description: "La fichada fue registrada correctamente.",
      })
      closeCreateDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear"
      setCreateError(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()
    if (!selectedClocking || !formState) return

    const payload = buildPayload(selectedClocking, formState)

    if (Object.keys(payload).length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar.",
      })
      return
    }

    try {
      setIsSaving(true)
      const updated = await updateClocking(
        selectedClocking.id_fichada,
        payload,
      )
      setClockings((prev) =>
        prev.map((clocking) =>
          clocking.id_fichada === updated.id_fichada ? updated : clocking,
        ),
      )
      setSelectedClocking(updated)
      setFormState(buildForm(updated))
      setFormError(null)
      toast({
        title: "Fichada actualizada",
        description: "Los cambios se guardaron correctamente.",
      })
      closeEditDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar"
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      setIsDeleting(true)
      await deleteClocking(pendingDelete.id_fichada)
      setClockings((prev) =>
        prev.filter((clocking) => clocking.id_fichada !== pendingDelete.id_fichada),
      )
      toast({
        title: "Fichada eliminada",
        description: "La fichada fue eliminada correctamente.",
      })
      closeDeleteDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,1fr)_160px]">
            <div className="relative">
              <label htmlFor="fichadas-busqueda" className="sr-only">
                Buscar por tipo
              </label>
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="fichadas-busqueda"
                placeholder="Buscar por tipo..."
                value={filters.query}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, query: event.target.value }))
                }
                className="pl-9"
              />
            </div>
            <div>
              <label htmlFor="fichadas-empleado" className="sr-only">
                ID empleado
              </label>
              <Input
                id="fichadas-empleado"
                placeholder="ID empleado"
                value={filters.id_empleado}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    id_empleado: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="date"
              value={filters.desde}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, desde: event.target.value }))
              }
              aria-label="Desde"
            />
            <Input
              type="date"
              value={filters.hasta}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, hasta: event.target.value }))
              }
              aria-label="Hasta"
            />
            <Button variant="outline" onClick={loadClockings}>
              <Search className="h-4 w-4" />
              Buscar
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => exportClockingsToCsv(filteredClockings)}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button className="gap-2" onClick={openCreateDialog}>
              <Plus className="h-4 w-4" />
              Nueva fichada
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Registro de fichadas</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Tipo
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Empleado
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fecha y hora
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Observacion
                </th>
                <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="size-4" />
                      Cargando fichadas...
                    </span>
                  </td>
                </tr>
              ) : filteredClockings.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay fichadas para mostrar.
                  </td>
                </tr>
              ) : (
                filteredClockings.map((clocking) => (
                  <tr
                    key={clocking.id_fichada}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-4 text-sm text-card-foreground">
                      {clocking.tipo_fichada}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {clocking.id_empleado}
                    </td>
                    <td className="px-5 py-4 text-sm text-card-foreground">
                      {formatDateTime(clocking.fecha_hora)}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {clocking.observacion ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Editar fichada"
                          onClick={() => openEditDialog(clocking)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Eliminar fichada"
                          onClick={() => openDeleteDialog(clocking)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!selectedClocking}
        onOpenChange={(open) => (!open ? closeEditDialog() : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar fichada</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleUpdateSubmit}>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="fichada-fecha" className="text-sm font-medium">
                Fecha y hora
              </label>
              <Input
                id="fichada-fecha"
                type="datetime-local"
                value={formState?.fecha_hora ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, fecha_hora: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-tipo" className="text-sm font-medium">
                Tipo
              </label>
              <Select
                value={formState?.tipo_fichada ?? ""}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, tipo_fichada: value } : prev,
                  )
                }
              >
                <SelectTrigger id="fichada-tipo">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_FICHADA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-origen" className="text-sm font-medium">
                ID origen fichada
              </label>
              <Input
                id="fichada-origen"
                value={formState?.id_origen_fichada ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, id_origen_fichada: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-observacion" className="text-sm font-medium">
                Observacion
              </label>
              <Input
                id="fichada-observacion"
                value={formState?.observacion ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, observacion: event.target.value } : prev,
                  )
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Guardando
                  </span>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => (!open ? closeCreateDialog() : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva fichada</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreateSubmit}>
            {createError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="fichada-fecha-nuevo" className="text-sm font-medium">
                Fecha y hora
              </label>
              <Input
                id="fichada-fecha-nuevo"
                type="datetime-local"
                value={createState.fecha_hora}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    fecha_hora: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-tipo-nuevo" className="text-sm font-medium">
                Tipo
              </label>
              <Select
                value={createState.tipo_fichada}
                onValueChange={(value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    tipo_fichada: value,
                  }))
                }
              >
                <SelectTrigger id="fichada-tipo-nuevo">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_FICHADA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-empleado" className="text-sm font-medium">
                ID empleado
              </label>
              <Input
                id="fichada-empleado"
                value={createState.id_empleado}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    id_empleado: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-origen-nuevo" className="text-sm font-medium">
                ID origen fichada
              </label>
              <Input
                id="fichada-origen-nuevo"
                value={createState.id_origen_fichada}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    id_origen_fichada: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="fichada-observacion-nuevo" className="text-sm font-medium">
                Observacion
              </label>
              <Input
                id="fichada-observacion-nuevo"
                value={createState.observacion}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    observacion: event.target.value,
                  }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" />
                    Guardando
                  </span>
                ) : (
                  "Crear fichada"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => (!open ? closeDeleteDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar fichada</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta accion eliminara la fichada seleccionada. Esta accion no se puede
            deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" />
                  Eliminando
                </span>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
