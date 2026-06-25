"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Clock, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/hooks/use-toast"
import {
  createSchedule,
  deleteSchedule,
  fetchSchedules,
  updateSchedule,
  type Schedule,
  type ScheduleCreate,
  type ScheduleUpdate,
} from "@/lib/api"

const TIPOS_HORARIO = ["fijo", "rotativo", "flexible"]
const ESTADOS = ["activo", "inactivo"]

type SchedulesGridProps = {
  initialSchedules?: Schedule[]
  error?: string | null
}

type ScheduleFormState = {
  nombre_horario: string
  tipo_horario: string
  hora_entrada_esperada: string
  hora_salida_esperada: string
  cantidad_horas_objetivo: string
  banda_horaria_inicio: string
  banda_horaria_fin: string
  tolerancia_entrada_minutos: string
  tolerancia_salida_minutos: string
  tiempo_minimo_descanso_minutos: string
  umbral_horas_extra_minutos: string
  dias_descanso_semanal: string
  estado: string
}

function buildForm(schedule: Schedule): ScheduleFormState {
  return {
    nombre_horario: schedule.nombre_horario ?? "",
    tipo_horario: schedule.tipo_horario ?? "",
    hora_entrada_esperada: schedule.hora_entrada_esperada ?? "",
    hora_salida_esperada: schedule.hora_salida_esperada ?? "",
    cantidad_horas_objetivo: String(schedule.cantidad_horas_objetivo ?? ""),
    banda_horaria_inicio: schedule.banda_horaria_inicio ?? "",
    banda_horaria_fin: schedule.banda_horaria_fin ?? "",
    tolerancia_entrada_minutos: String(schedule.tolerancia_entrada_minutos ?? ""),
    tolerancia_salida_minutos: String(schedule.tolerancia_salida_minutos ?? ""),
    tiempo_minimo_descanso_minutos: String(
      schedule.tiempo_minimo_descanso_minutos ?? "",
    ),
    umbral_horas_extra_minutos: String(schedule.umbral_horas_extra_minutos ?? ""),
    dias_descanso_semanal: schedule.dias_descanso_semanal ?? "",
    estado: schedule.estado ?? "",
  }
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

function buildPayload(original: Schedule, form: ScheduleFormState): ScheduleUpdate {
  const payload: ScheduleUpdate = {}

  if (form.nombre_horario !== original.nombre_horario) {
    payload.nombre_horario = form.nombre_horario
  }
  if (form.tipo_horario !== original.tipo_horario) {
    payload.tipo_horario = form.tipo_horario
  }
  if (form.hora_entrada_esperada !== original.hora_entrada_esperada) {
    payload.hora_entrada_esperada = form.hora_entrada_esperada
  }
  if (form.hora_salida_esperada !== original.hora_salida_esperada) {
    payload.hora_salida_esperada = form.hora_salida_esperada
  }

  const cantidadHoras = toNumber(form.cantidad_horas_objetivo)
  if (
    cantidadHoras !== null &&
    cantidadHoras !== original.cantidad_horas_objetivo
  ) {
    payload.cantidad_horas_objetivo = cantidadHoras
  }

  if (form.banda_horaria_inicio !== original.banda_horaria_inicio) {
    payload.banda_horaria_inicio = form.banda_horaria_inicio
  }
  if (form.banda_horaria_fin !== original.banda_horaria_fin) {
    payload.banda_horaria_fin = form.banda_horaria_fin
  }

  const toleranciaEntrada = toNumber(form.tolerancia_entrada_minutos)
  if (
    toleranciaEntrada !== null &&
    toleranciaEntrada !== original.tolerancia_entrada_minutos
  ) {
    payload.tolerancia_entrada_minutos = toleranciaEntrada
  }

  const toleranciaSalida = toNumber(form.tolerancia_salida_minutos)
  if (
    toleranciaSalida !== null &&
    toleranciaSalida !== original.tolerancia_salida_minutos
  ) {
    payload.tolerancia_salida_minutos = toleranciaSalida
  }

  const descanso = toNumber(form.tiempo_minimo_descanso_minutos)
  if (
    descanso !== null &&
    descanso !== original.tiempo_minimo_descanso_minutos
  ) {
    payload.tiempo_minimo_descanso_minutos = descanso
  }

  const umbralHoras = toNumber(form.umbral_horas_extra_minutos)
  if (
    umbralHoras !== null &&
    umbralHoras !== original.umbral_horas_extra_minutos
  ) {
    payload.umbral_horas_extra_minutos = umbralHoras
  }

  if (form.dias_descanso_semanal !== original.dias_descanso_semanal) {
    payload.dias_descanso_semanal = form.dias_descanso_semanal
  }
  if (form.estado !== original.estado) {
    payload.estado = form.estado
  }

  return payload
}

export function SchedulesGrid({ initialSchedules, error }: SchedulesGridProps) {
  const [schedules, setSchedules] = useState(initialSchedules ?? [])
  const [isLoading, setIsLoading] = useState(!initialSchedules)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [formState, setFormState] = useState<ScheduleFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<ScheduleFormState>({
    nombre_horario: "",
    tipo_horario: "",
    hora_entrada_esperada: "",
    hora_salida_esperada: "",
    cantidad_horas_objetivo: "",
    banda_horaria_inicio: "",
    banda_horaria_fin: "",
    tolerancia_entrada_minutos: "",
    tolerancia_salida_minutos: "",
    tiempo_minimo_descanso_minutos: "",
    umbral_horas_extra_minutos: "",
    dias_descanso_semanal: "",
    estado: "activo",
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Schedule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadSchedules = useCallback(() => {
    setIsLoading(true)
    fetchSchedules()
      .then((data) => {
        setSchedules(data.filter((s) => s.estado === "activo"))
        setLoadError(null)
      })
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : "Error al cargar horarios",
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (initialSchedules) return
    loadSchedules()
  }, [initialSchedules, loadSchedules])

  const openEditDialog = (schedule: Schedule) => {
    setSelectedSchedule(schedule)
    setFormState(buildForm(schedule))
    setFormError(null)
  }

  const closeEditDialog = () => {
    setSelectedSchedule(null)
    setFormState(null)
    setFormError(null)
  }

  const openCreateDialog = () => {
    setCreateState({
      nombre_horario: "",
      tipo_horario: "",
      hora_entrada_esperada: "",
      hora_salida_esperada: "",
      cantidad_horas_objetivo: "",
      banda_horaria_inicio: "",
      banda_horaria_fin: "",
      tolerancia_entrada_minutos: "",
      tolerancia_salida_minutos: "",
      tiempo_minimo_descanso_minutos: "",
      umbral_horas_extra_minutos: "",
      dias_descanso_semanal: "",
      estado: "activo",
    })
    setCreateError(null)
    setIsCreateOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreateError(null)
  }

  const openDeleteDialog = (schedule: Schedule) => {
    setPendingDelete(schedule)
  }

  const closeDeleteDialog = () => {
    setPendingDelete(null)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      setIsDeleting(true)
      await deleteSchedule(pendingDelete.id_horario)
      setSchedules((prev) =>
        prev.filter((s) => s.id_horario !== pendingDelete.id_horario),
      )
      toast({
        title: "Horario eliminado",
        description: "El horario fue eliminado correctamente.",
      })
      closeDeleteDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al eliminar"
      toast({ title: "Error", description: message, variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const cantidadHoras = toNumber(createState.cantidad_horas_objetivo)
    const toleranciaEntrada = toNumber(createState.tolerancia_entrada_minutos)
    const toleranciaSalida = toNumber(createState.tolerancia_salida_minutos)
    const descanso = toNumber(createState.tiempo_minimo_descanso_minutos)
    const umbralHoras = toNumber(createState.umbral_horas_extra_minutos)

    if (
      cantidadHoras === null ||
      toleranciaEntrada === null ||
      toleranciaSalida === null ||
      descanso === null ||
      umbralHoras === null
    ) {
      setCreateError("Completa los campos numericos correctamente.")
      return
    }

    const payload: ScheduleCreate = {
      nombre_horario: createState.nombre_horario.trim(),
      tipo_horario: createState.tipo_horario.trim(),
      hora_entrada_esperada: createState.hora_entrada_esperada.trim(),
      hora_salida_esperada: createState.hora_salida_esperada.trim(),
      cantidad_horas_objetivo: cantidadHoras,
      banda_horaria_inicio: createState.banda_horaria_inicio.trim(),
      banda_horaria_fin: createState.banda_horaria_fin.trim(),
      tolerancia_entrada_minutos: toleranciaEntrada,
      tolerancia_salida_minutos: toleranciaSalida,
      tiempo_minimo_descanso_minutos: descanso,
      umbral_horas_extra_minutos: umbralHoras,
      dias_descanso_semanal: createState.dias_descanso_semanal.trim(),
      estado: createState.estado.trim(),
    }

    if (
      !payload.nombre_horario ||
      !payload.tipo_horario ||
      !payload.hora_entrada_esperada ||
      !payload.hora_salida_esperada ||
      !payload.banda_horaria_inicio ||
      !payload.banda_horaria_fin ||
      !payload.dias_descanso_semanal ||
      !payload.estado
    ) {
      setCreateError("Completa todos los campos obligatorios.")
      return
    }

    try {
      setIsCreating(true)
      const created = await createSchedule(payload)
      setSchedules((prev) => [created, ...prev])
      toast({
        title: "Horario creado",
        description: "El horario fue registrado correctamente.",
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
    if (!selectedSchedule || !formState) return

    const payload = buildPayload(selectedSchedule, formState)

    if (Object.keys(payload).length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar.",
      })
      return
    }

    try {
      setIsSaving(true)
      const updated = await updateSchedule(selectedSchedule.id_horario, payload)
      setSchedules((prev) =>
        prev.map((schedule) =>
          schedule.id_horario === updated.id_horario ? updated : schedule,
        ),
      )
      setSelectedSchedule(updated)
      setFormState(buildForm(updated))
      setFormError(null)
      toast({
        title: "Horario actualizado",
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

  const visibleSchedules = useMemo(() => schedules, [schedules])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nuevo Horario
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Error al cargar horarios</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Cargando horarios...
            </span>
          </div>
        ) : visibleSchedules.length === 0 ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No hay horarios registrados.
          </div>
        ) : (
          visibleSchedules.map((schedule) => (
            <div
              key={schedule.id_horario}
              className="rounded-xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2.5">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-card-foreground">
                      {schedule.nombre_horario}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {schedule.hora_entrada_esperada} -
                      {" "}
                      {schedule.hora_salida_esperada}
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Tipo</span>
                  <span className="text-card-foreground">
                    {schedule.tipo_horario}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Horas objetivo</span>
                  <span className="text-card-foreground">
                    {schedule.cantidad_horas_objetivo}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Banda horaria</span>
                  <span className="text-card-foreground">
                    {schedule.banda_horaria_inicio} - {schedule.banda_horaria_fin}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estado</span>
                  <span className="text-card-foreground">{schedule.estado}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm text-muted-foreground">
                  {schedule.dias_descanso_semanal}
                </span>
                <div className="inline-flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEditDialog(schedule)}>
                    Editar
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Eliminar horario"
                    onClick={() => openDeleteDialog(schedule)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog
        open={!!selectedSchedule}
        onOpenChange={(open) => (!open ? closeEditDialog() : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar horario</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleUpdateSubmit}>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="horario-nombre" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="horario-nombre"
                value={formState?.nombre_horario ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, nombre_horario: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-tipo" className="text-sm font-medium">
                Tipo
              </label>
              <Select
                value={formState?.tipo_horario ?? ""}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, tipo_horario: value } : prev,
                  )
                }
              >
                <SelectTrigger id="horario-tipo">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_HORARIO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-entrada" className="text-sm font-medium">
                Entrada esperada
              </label>
              <Input
                id="horario-entrada"
                type="time"
                value={formState?.hora_entrada_esperada ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, hora_entrada_esperada: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-salida" className="text-sm font-medium">
                Salida esperada
              </label>
              <Input
                id="horario-salida"
                type="time"
                value={formState?.hora_salida_esperada ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, hora_salida_esperada: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-horas" className="text-sm font-medium">
                  Horas objetivo
                </label>
                <Input
                  id="horario-horas"
                  type="number"
                  value={formState?.cantidad_horas_objetivo ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, cantidad_horas_objetivo: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-banda-inicio" className="text-sm font-medium">
                Banda inicio
              </label>
              <Input
                id="horario-banda-inicio"
                type="time"
                value={formState?.banda_horaria_inicio ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, banda_horaria_inicio: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-banda-fin" className="text-sm font-medium">
                Banda fin
              </label>
              <Input
                id="horario-banda-fin"
                type="time"
                value={formState?.banda_horaria_fin ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, banda_horaria_fin: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-tolerancia-entrada" className="text-sm font-medium">
                  Tolerancia entrada (min)
                </label>
                <Input
                  id="horario-tolerancia-entrada"
                  type="number"
                  value={formState?.tolerancia_entrada_minutos ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? {
                          ...prev,
                          tolerancia_entrada_minutos: event.target.value,
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-tolerancia-salida" className="text-sm font-medium">
                  Tolerancia salida (min)
                </label>
                <Input
                  id="horario-tolerancia-salida"
                  type="number"
                  value={formState?.tolerancia_salida_minutos ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? {
                          ...prev,
                          tolerancia_salida_minutos: event.target.value,
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-descanso" className="text-sm font-medium">
                  Descanso minimo (min)
                </label>
                <Input
                  id="horario-descanso"
                  type="number"
                  value={formState?.tiempo_minimo_descanso_minutos ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? {
                          ...prev,
                          tiempo_minimo_descanso_minutos: event.target.value,
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-umbral" className="text-sm font-medium">
                  Umbral horas extra (min)
                </label>
                <Input
                  id="horario-umbral"
                  type="number"
                  value={formState?.umbral_horas_extra_minutos ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? {
                          ...prev,
                          umbral_horas_extra_minutos: event.target.value,
                        }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-descanso-semanal" className="text-sm font-medium">
                Dias descanso semanal
              </label>
              <Input
                id="horario-descanso-semanal"
                value={formState?.dias_descanso_semanal ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev
                      ? { ...prev, dias_descanso_semanal: event.target.value }
                      : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-estado" className="text-sm font-medium">
                Estado
              </label>
              <Select
                value={formState?.estado ?? ""}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, estado: value } : prev,
                  )
                }
              >
                <SelectTrigger id="horario-estado">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            <DialogTitle>Nuevo horario</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreateSubmit}>
            {createError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="horario-nombre-nuevo" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="horario-nombre-nuevo"
                value={createState.nombre_horario}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    nombre_horario: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-tipo-nuevo" className="text-sm font-medium">
                Tipo
              </label>
              <Select
                value={createState.tipo_horario}
                onValueChange={(value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    tipo_horario: value,
                  }))
                }
              >
                <SelectTrigger id="horario-tipo-nuevo">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_HORARIO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-entrada-nuevo" className="text-sm font-medium">
                Entrada esperada
              </label>
              <Input
                id="horario-entrada-nuevo"
                type="time"
                value={createState.hora_entrada_esperada}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    hora_entrada_esperada: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-salida-nuevo" className="text-sm font-medium">
                Salida esperada
              </label>
              <Input
                id="horario-salida-nuevo"
                type="time"
                value={createState.hora_salida_esperada}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    hora_salida_esperada: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-horas-nuevo" className="text-sm font-medium">
                  Horas objetivo
                </label>
                <Input
                  id="horario-horas-nuevo"
                  type="number"
                  value={createState.cantidad_horas_objetivo}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    cantidad_horas_objetivo: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-banda-inicio-nuevo" className="text-sm font-medium">
                Banda inicio
              </label>
              <Input
                id="horario-banda-inicio-nuevo"
                type="time"
                value={createState.banda_horaria_inicio}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    banda_horaria_inicio: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-banda-fin-nuevo" className="text-sm font-medium">
                Banda fin
              </label>
              <Input
                id="horario-banda-fin-nuevo"
                type="time"
                value={createState.banda_horaria_fin}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    banda_horaria_fin: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-tolerancia-entrada-nuevo" className="text-sm font-medium">
                  Tolerancia entrada (min)
                </label>
                <Input
                  id="horario-tolerancia-entrada-nuevo"
                  type="number"
                  value={createState.tolerancia_entrada_minutos}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    tolerancia_entrada_minutos: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-tolerancia-salida-nuevo" className="text-sm font-medium">
                  Tolerancia salida (min)
                </label>
                <Input
                  id="horario-tolerancia-salida-nuevo"
                  type="number"
                  value={createState.tolerancia_salida_minutos}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    tolerancia_salida_minutos: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-descanso-nuevo" className="text-sm font-medium">
                  Descanso minimo (min)
                </label>
                <Input
                  id="horario-descanso-nuevo"
                  type="number"
                  value={createState.tiempo_minimo_descanso_minutos}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    tiempo_minimo_descanso_minutos: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
                <label htmlFor="horario-umbral-nuevo" className="text-sm font-medium">
                  Umbral horas extra (min)
                </label>
                <Input
                  id="horario-umbral-nuevo"
                  type="number"
                  value={createState.umbral_horas_extra_minutos}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    umbral_horas_extra_minutos: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-descanso-semanal-nuevo" className="text-sm font-medium">
                Dias descanso semanal
              </label>
              <Input
                id="horario-descanso-semanal-nuevo"
                value={createState.dias_descanso_semanal}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    dias_descanso_semanal: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="horario-estado-nuevo" className="text-sm font-medium">
                Estado
              </label>
              <Select
                value={createState.estado}
                onValueChange={(value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    estado: value,
                  }))
                }
              >
                <SelectTrigger id="horario-estado-nuevo">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  "Crear horario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => (!open ? closeDeleteDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar horario</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta accion eliminara el horario{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.nombre_horario}
            </span>{" "}
            de forma permanente. Esta accion no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
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
