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

// ─── Constantes alineadas con los enums del backend ──────────────────────────

const TIPOS_HORARIO: { value: string; label: string }[] = [
  { value: "fijo",      label: "Fijo"      },
  { value: "rotativo",  label: "Rotativo"  },
  { value: "flexible",  label: "Flexible"  },
]

const ESTADOS: { value: string; label: string }[] = [
  { value: "activo",   label: "Activo"   },
  { value: "inactivo", label: "Inactivo" },
]

/** Días de la semana en orden; el string que persiste el backend es la lista
 *  de abreviaturas separadas por coma, ej. "lun,mie,vie". */
const DIAS_SEMANA: { value: string; label: string }[] = [
  { value: "lun", label: "Lun" },
  { value: "mar", label: "Mar" },
  { value: "mie", label: "Mié" },
  { value: "jue", label: "Jue" },
  { value: "vie", label: "Vie" },
  { value: "sab", label: "Sáb" },
  { value: "dom", label: "Dom" },
]

// ─── Helpers para días de descanso ───────────────────────────────────────────

/** Convierte el string del backend ("sab,dom") al Set de valores seleccionados. */
function parseDias(raw: string): Set<string> {
  return new Set(
    raw
      .split(",")
      .map((d) => d.trim().toLowerCase())
      .filter(Boolean),
  )
}

/** Convierte el Set al string que espera el backend. */
function serializeDias(dias: Set<string>): string {
  return DIAS_SEMANA.filter((d) => dias.has(d.value))
    .map((d) => d.value)
    .join(",")
}

// ─── Tipos ────────────────────────────────────────────────────────────────────

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

// ─── Helpers de formulario ────────────────────────────────────────────────────

function buildForm(schedule: Schedule): ScheduleFormState {
  return {
    nombre_horario:                  schedule.nombre_horario ?? "",
    tipo_horario:                    schedule.tipo_horario ?? "",
    hora_entrada_esperada:           schedule.hora_entrada_esperada ?? "",
    hora_salida_esperada:            schedule.hora_salida_esperada ?? "",
    cantidad_horas_objetivo:         String(schedule.cantidad_horas_objetivo ?? ""),
    banda_horaria_inicio:            schedule.banda_horaria_inicio ?? "",
    banda_horaria_fin:               schedule.banda_horaria_fin ?? "",
    tolerancia_entrada_minutos:      String(schedule.tolerancia_entrada_minutos ?? ""),
    tolerancia_salida_minutos:       String(schedule.tolerancia_salida_minutos ?? ""),
    tiempo_minimo_descanso_minutos:  String(schedule.tiempo_minimo_descanso_minutos ?? ""),
    umbral_horas_extra_minutos:      String(schedule.umbral_horas_extra_minutos ?? ""),
    dias_descanso_semanal:           schedule.dias_descanso_semanal ?? "",
    estado:                          schedule.estado ?? "",
  }
}

function toPositiveInt(value: string): number | null {
  const parsed = parseInt(value, 10)
  return Number.isNaN(parsed) || parsed < 0 ? null : parsed
}

function toPositiveDecimal(value: string): number | null {
  const parsed = parseFloat(value)
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed
}

function buildPayload(original: Schedule, form: ScheduleFormState): ScheduleUpdate {
  const payload: ScheduleUpdate = {}

  if (form.nombre_horario !== original.nombre_horario)
    payload.nombre_horario = form.nombre_horario

  if (form.tipo_horario !== original.tipo_horario)
    payload.tipo_horario = form.tipo_horario

  if (form.hora_entrada_esperada !== original.hora_entrada_esperada)
    payload.hora_entrada_esperada = form.hora_entrada_esperada

  if (form.hora_salida_esperada !== original.hora_salida_esperada)
    payload.hora_salida_esperada = form.hora_salida_esperada

  const cantidadHoras = toPositiveDecimal(form.cantidad_horas_objetivo)
  if (cantidadHoras !== null && cantidadHoras !== original.cantidad_horas_objetivo)
    payload.cantidad_horas_objetivo = cantidadHoras

  if (form.banda_horaria_inicio !== original.banda_horaria_inicio)
    payload.banda_horaria_inicio = form.banda_horaria_inicio

  if (form.banda_horaria_fin !== original.banda_horaria_fin)
    payload.banda_horaria_fin = form.banda_horaria_fin

  const toleranciaEntrada = toPositiveInt(form.tolerancia_entrada_minutos)
  if (toleranciaEntrada !== null && toleranciaEntrada !== original.tolerancia_entrada_minutos)
    payload.tolerancia_entrada_minutos = toleranciaEntrada

  const toleranciaSalida = toPositiveInt(form.tolerancia_salida_minutos)
  if (toleranciaSalida !== null && toleranciaSalida !== original.tolerancia_salida_minutos)
    payload.tolerancia_salida_minutos = toleranciaSalida

  const descanso = toPositiveInt(form.tiempo_minimo_descanso_minutos)
  if (descanso !== null && descanso !== original.tiempo_minimo_descanso_minutos)
    payload.tiempo_minimo_descanso_minutos = descanso

  const umbralHoras = toPositiveInt(form.umbral_horas_extra_minutos)
  if (umbralHoras !== null && umbralHoras !== original.umbral_horas_extra_minutos)
    payload.umbral_horas_extra_minutos = umbralHoras

  if (form.dias_descanso_semanal !== original.dias_descanso_semanal)
    payload.dias_descanso_semanal = form.dias_descanso_semanal

  if (form.estado !== original.estado)
    payload.estado = form.estado

  return payload
}

/** Formatea un string "HH:MM:SS" o "HH:MM" a "HH:MM". */
function fmtHora(t: string | undefined): string {
  if (!t) return "—"
  return t.slice(0, 5)
}

/** Convierte "sab,dom" a "Sáb, Dom". */
function fmtDias(raw: string): string {
  if (!raw) return "—"
  return raw
    .split(",")
    .map((d) => DIAS_SEMANA.find((x) => x.value === d.trim())?.label ?? d)
    .join(", ")
}

// ─── Sub-componente: selector de días ────────────────────────────────────────

function DiasSemanaSelector({
  value,
  onChange,
}: {
  value: string
  onChange: (newValue: string) => void
}) {
  const selected = parseDias(value)

  const toggle = (dia: string) => {
    const next = new Set(selected)
    if (next.has(dia)) next.delete(dia)
    else next.add(dia)
    onChange(serializeDias(next))
  }

  return (
    <div className="flex flex-wrap gap-2">
      {DIAS_SEMANA.map((d) => {
        const active = selected.has(d.value)
        return (
          <button
            key={d.value}
            type="button"
            onClick={() => toggle(d.value)}
            className={[
              "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
            ].join(" ")}
          >
            {d.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Sub-componente: formulario compartido entre Crear y Editar ───────────────

type HorarioFormFieldsProps = {
  state: ScheduleFormState
  onChange: (patch: Partial<ScheduleFormState>) => void
  idSuffix: string
  showEstado?: boolean
}

function HorarioFormFields({ state, onChange, idSuffix, showEstado = true }: HorarioFormFieldsProps) {
  const esFijo     = state.tipo_horario === "fijo"
  const esFlexible = state.tipo_horario === "flexible"

  return (
    <>
      {/* Nombre */}
      <div className="grid gap-2">
        <label htmlFor={`nombre-${idSuffix}`} className="text-sm font-medium">
          Nombre <span className="text-destructive">*</span>
        </label>
        <Input
          id={`nombre-${idSuffix}`}
          required
          placeholder="Ej: Turno mañana, Jornada completa…"
          value={state.nombre_horario}
          onChange={(e) => onChange({ nombre_horario: e.target.value })}
        />
      </div>

      {/* Tipo */}
      <div className="grid gap-2">
        <label htmlFor={`tipo-${idSuffix}`} className="text-sm font-medium">
          Tipo de horario <span className="text-destructive">*</span>
        </label>
        <Select
          value={state.tipo_horario}
          onValueChange={(v) => onChange({ tipo_horario: v })}
        >
          <SelectTrigger id={`tipo-${idSuffix}`}>
            <SelectValue placeholder="Seleccionar tipo" />
          </SelectTrigger>
          <SelectContent>
            {TIPOS_HORARIO.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {esFijo && "Entrada y salida en hora exacta todos los días."}
          {esFlexible && "El empleado puede entrar/salir dentro de una ventana horaria."}
          {state.tipo_horario === "rotativo" && "Los turnos rotan según un esquema predefinido."}
        </p>
      </div>

      {/* Horas objetivo */}
      <div className="grid gap-2">
        <label htmlFor={`horas-${idSuffix}`} className="text-sm font-medium">
          Horas de trabajo diarias <span className="text-destructive">*</span>
        </label>
        <Input
          id={`horas-${idSuffix}`}
          type="number"
          required
          min="0.5"
          max="24"
          step="0.5"
          placeholder="Ej: 8"
          value={state.cantidad_horas_objetivo}
          onChange={(e) => onChange({ cantidad_horas_objetivo: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Cantidad de horas que el empleado debe cumplir por día.
        </p>
      </div>

      {/* Entrada / Salida esperadas — relevante para fijo y rotativo */}
      {!esFlexible && (
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label htmlFor={`entrada-${idSuffix}`} className="text-sm font-medium">
              Hora de entrada <span className="text-destructive">*</span>
            </label>
            <Input
              id={`entrada-${idSuffix}`}
              type="time"
              required
              value={state.hora_entrada_esperada}
              onChange={(e) => onChange({ hora_entrada_esperada: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label htmlFor={`salida-${idSuffix}`} className="text-sm font-medium">
              Hora de salida <span className="text-destructive">*</span>
            </label>
            <Input
              id={`salida-${idSuffix}`}
              type="time"
              required
              value={state.hora_salida_esperada}
              onChange={(e) => onChange({ hora_salida_esperada: e.target.value })}
            />
          </div>
        </div>
      )}

      {/* Banda horaria — ventana de fichada para horario flexible */}
      {esFlexible && (
        <div className="grid gap-2 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">
            Ventana de fichada <span className="text-destructive">*</span>
          </p>
          <p className="text-xs text-muted-foreground">
            Rango horario dentro del cual el empleado puede registrar entrada y salida.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label htmlFor={`banda-inicio-${idSuffix}`} className="text-xs font-medium text-muted-foreground">
                Desde
              </label>
              <Input
                id={`banda-inicio-${idSuffix}`}
                type="time"
                required
                value={state.banda_horaria_inicio}
                onChange={(e) => onChange({ banda_horaria_inicio: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor={`banda-fin-${idSuffix}`} className="text-xs font-medium text-muted-foreground">
                Hasta
              </label>
              <Input
                id={`banda-fin-${idSuffix}`}
                type="time"
                required
                value={state.banda_horaria_fin}
                onChange={(e) => onChange({ banda_horaria_fin: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      {/* Para fijo/rotativo también guardamos banda igual a entrada/salida (requerido por el backend) */}
      {!esFlexible && (
        <input type="hidden" value={state.hora_entrada_esperada} />
      )}

      {/* Tolerancias */}
      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <label htmlFor={`tol-entrada-${idSuffix}`} className="text-sm font-medium">
            Tolerancia de entrada
          </label>
          <div className="relative">
            <Input
              id={`tol-entrada-${idSuffix}`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={state.tolerancia_entrada_minutos}
              onChange={(e) => onChange({ tolerancia_entrada_minutos: e.target.value })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              min
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Minutos de gracia para llegar tarde.
          </p>
        </div>
        <div className="grid gap-2">
          <label htmlFor={`tol-salida-${idSuffix}`} className="text-sm font-medium">
            Tolerancia de salida
          </label>
          <div className="relative">
            <Input
              id={`tol-salida-${idSuffix}`}
              type="number"
              min="0"
              step="1"
              placeholder="0"
              value={state.tolerancia_salida_minutos}
              onChange={(e) => onChange({ tolerancia_salida_minutos: e.target.value })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              min
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Minutos de gracia para salir antes.
          </p>
        </div>
      </div>

      {/* Descanso mínimo */}
      <div className="grid gap-2">
        <label htmlFor={`descanso-${idSuffix}`} className="text-sm font-medium">
          Descanso mínimo entre fichadas
        </label>
        <div className="relative">
          <Input
            id={`descanso-${idSuffix}`}
            type="number"
            min="0"
            step="1"
            placeholder="30"
            value={state.tiempo_minimo_descanso_minutos}
            onChange={(e) => onChange({ tiempo_minimo_descanso_minutos: e.target.value })}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            min
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Tiempo mínimo que debe transcurrir entre una fichada de entrada y una de salida.
        </p>
      </div>

      {/* Umbral horas extra */}
      <div className="grid gap-2">
        <label htmlFor={`umbral-${idSuffix}`} className="text-sm font-medium">
          Umbral para horas extra
        </label>
        <div className="relative">
          <Input
            id={`umbral-${idSuffix}`}
            type="number"
            min="0"
            step="1"
            placeholder="0"
            value={state.umbral_horas_extra_minutos}
            onChange={(e) => onChange({ umbral_horas_extra_minutos: e.target.value })}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            min
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Minutos trabajados extra (sobre las horas objetivo) a partir de los cuales se contabilizan como horas extra.
        </p>
      </div>

      {/* Días de descanso semanal */}
      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Días de descanso semanal <span className="text-destructive">*</span>
        </label>
        <DiasSemanaSelector
          value={state.dias_descanso_semanal}
          onChange={(v) => onChange({ dias_descanso_semanal: v })}
        />
        <p className="text-xs text-muted-foreground">
          Días en que el empleado no trabaja. Típicamente sábado y domingo.
        </p>
      </div>

      {/* Estado — solo en edición */}
      {showEstado && (
        <div className="grid gap-2">
          <label htmlFor={`estado-${idSuffix}`} className="text-sm font-medium">
            Estado
          </label>
          <Select
            value={state.estado}
            onValueChange={(v) => onChange({ estado: v })}
          >
            <SelectTrigger id={`estado-${idSuffix}`}>
              <SelectValue placeholder="Seleccionar estado" />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS.map((e) => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )
}

// ─── Validación del formulario ────────────────────────────────────────────────

function validateForm(state: ScheduleFormState): string | null {
  if (!state.nombre_horario.trim()) return "El nombre es obligatorio."
  if (!state.tipo_horario) return "Seleccioná un tipo de horario."

  const horas = toPositiveDecimal(state.cantidad_horas_objetivo)
  if (horas === null) return "Las horas de trabajo diarias deben ser un número mayor a 0."

  const esFlexible = state.tipo_horario === "flexible"

  if (!esFlexible) {
    if (!state.hora_entrada_esperada) return "La hora de entrada es obligatoria."
    if (!state.hora_salida_esperada) return "La hora de salida es obligatoria."
  } else {
    if (!state.banda_horaria_inicio) return "La hora de inicio de la ventana de fichada es obligatoria."
    if (!state.banda_horaria_fin) return "La hora de fin de la ventana de fichada es obligatoria."
    if (state.banda_horaria_inicio >= state.banda_horaria_fin)
      return "La hora de inicio de la ventana debe ser anterior a la de fin."
  }

  if (toPositiveInt(state.tolerancia_entrada_minutos) === null)
    return "La tolerancia de entrada debe ser 0 o más minutos."
  if (toPositiveInt(state.tolerancia_salida_minutos) === null)
    return "La tolerancia de salida debe ser 0 o más minutos."
  if (toPositiveInt(state.tiempo_minimo_descanso_minutos) === null)
    return "El descanso mínimo debe ser 0 o más minutos."
  if (toPositiveInt(state.umbral_horas_extra_minutos) === null)
    return "El umbral de horas extra debe ser 0 o más minutos."

  if (!state.dias_descanso_semanal)
    return "Seleccioná al menos un día de descanso semanal."

  return null
}

/** Para horarios fijos y rotativos, la banda horaria coincide con entrada/salida. */
function resolveHiddenBanda(state: ScheduleFormState): Pick<ScheduleFormState, "banda_horaria_inicio" | "banda_horaria_fin"> {
  if (state.tipo_horario !== "flexible") {
    return {
      banda_horaria_inicio: state.hora_entrada_esperada,
      banda_horaria_fin:    state.hora_salida_esperada,
    }
  }
  return {
    banda_horaria_inicio: state.banda_horaria_inicio,
    banda_horaria_fin:    state.banda_horaria_fin,
  }
}

/** Para horarios flexibles, hora_entrada y hora_salida no tienen significado
 *  propio; usamos la banda como valor de esos campos. */
function resolveHiddenEntradaSalida(state: ScheduleFormState): Pick<ScheduleFormState, "hora_entrada_esperada" | "hora_salida_esperada"> {
  if (state.tipo_horario === "flexible") {
    return {
      hora_entrada_esperada: state.banda_horaria_inicio,
      hora_salida_esperada:  state.banda_horaria_fin,
    }
  }
  return {
    hora_entrada_esperada: state.hora_entrada_esperada,
    hora_salida_esperada:  state.hora_salida_esperada,
  }
}

// ─── Componente principal ─────────────────────────────────────────────────────

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
    nombre_horario:                 "",
    tipo_horario:                   "",
    hora_entrada_esperada:          "",
    hora_salida_esperada:           "",
    cantidad_horas_objetivo:        "",
    banda_horaria_inicio:           "",
    banda_horaria_fin:              "",
    tolerancia_entrada_minutos:     "0",
    tolerancia_salida_minutos:      "0",
    tiempo_minimo_descanso_minutos: "30",
    umbral_horas_extra_minutos:     "0",
    dias_descanso_semanal:          "sab,dom",
    estado:                         "activo",
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const [pendingDelete, setPendingDelete] = useState<Schedule | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ── Carga inicial ──────────────────────────────────────────────────────────

  const loadSchedules = useCallback(() => {
    setIsLoading(true)
    fetchSchedules()
      .then((data) => {
        setSchedules(data.filter((s) => s.estado === "activo"))
        setLoadError(null)
      })
      .catch((err) => {
        setLoadError(err instanceof Error ? err.message : "Error al cargar horarios")
      })
      .finally(() => setIsLoading(false))
  }, [])

  useEffect(() => {
    if (initialSchedules) return
    loadSchedules()
  }, [initialSchedules, loadSchedules])

  // ── Diálogo edición ────────────────────────────────────────────────────────

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

  // ── Diálogo creación ───────────────────────────────────────────────────────

  const openCreateDialog = () => {
    setCreateState({
      nombre_horario:                 "",
      tipo_horario:                   "",
      hora_entrada_esperada:          "",
      hora_salida_esperada:           "",
      cantidad_horas_objetivo:        "",
      banda_horaria_inicio:           "",
      banda_horaria_fin:              "",
      tolerancia_entrada_minutos:     "0",
      tolerancia_salida_minutos:      "0",
      tiempo_minimo_descanso_minutos: "30",
      umbral_horas_extra_minutos:     "0",
      dias_descanso_semanal:          "sab,dom",
      estado:                         "activo",
    })
    setCreateError(null)
    setIsCreateOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreateError(null)
  }

  // ── Diálogo eliminación ────────────────────────────────────────────────────

  const openDeleteDialog  = (schedule: Schedule) => setPendingDelete(schedule)
  const closeDeleteDialog = () => setPendingDelete(null)

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      setIsDeleting(true)
      await deleteSchedule(pendingDelete.id_horario)
      setSchedules((prev) => prev.filter((s) => s.id_horario !== pendingDelete.id_horario))
      toast({ title: "Horario eliminado", description: "El horario fue eliminado correctamente." })
      closeDeleteDialog()
    } catch (err) {
      toast({ title: "Error", description: err instanceof Error ? err.message : "Error al eliminar", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Crear ──────────────────────────────────────────────────────────────────

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const validationError = validateForm(createState)
    if (validationError) { setCreateError(validationError); return }

    const banda  = resolveHiddenBanda(createState)
    const horas  = resolveHiddenEntradaSalida(createState)

    const payload: ScheduleCreate = {
      nombre_horario:                 createState.nombre_horario.trim(),
      tipo_horario:                   createState.tipo_horario,
      hora_entrada_esperada:          horas.hora_entrada_esperada,
      hora_salida_esperada:           horas.hora_salida_esperada,
      cantidad_horas_objetivo:        toPositiveDecimal(createState.cantidad_horas_objetivo)!,
      banda_horaria_inicio:           banda.banda_horaria_inicio,
      banda_horaria_fin:              banda.banda_horaria_fin,
      tolerancia_entrada_minutos:     toPositiveInt(createState.tolerancia_entrada_minutos)!,
      tolerancia_salida_minutos:      toPositiveInt(createState.tolerancia_salida_minutos)!,
      tiempo_minimo_descanso_minutos: toPositiveInt(createState.tiempo_minimo_descanso_minutos)!,
      umbral_horas_extra_minutos:     toPositiveInt(createState.umbral_horas_extra_minutos)!,
      dias_descanso_semanal:          createState.dias_descanso_semanal,
      estado:                         "activo",
    }

    try {
      setIsCreating(true)
      const created = await createSchedule(payload)
      setSchedules((prev) => [created, ...prev])
      toast({ title: "Horario creado", description: "El horario fue registrado correctamente." })
      closeCreateDialog()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Error al crear")
    } finally {
      setIsCreating(false)
    }
  }

  // ── Editar ─────────────────────────────────────────────────────────────────

  const handleUpdateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedSchedule || !formState) return

    const validationError = validateForm(formState)
    if (validationError) { setFormError(validationError); return }

    const payload = buildPayload(selectedSchedule, formState)

    if (Object.keys(payload).length === 0) {
      toast({ title: "Sin cambios", description: "No hay cambios para guardar." })
      return
    }

    try {
      setIsSaving(true)
      const updated = await updateSchedule(selectedSchedule.id_horario, payload)
      setSchedules((prev) => prev.map((s) => (s.id_horario === updated.id_horario ? updated : s)))
      setSelectedSchedule(updated)
      setFormState(buildForm(updated))
      setFormError(null)
      toast({ title: "Horario actualizado", description: "Los cambios se guardaron correctamente." })
      closeEditDialog()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Error al actualizar")
    } finally {
      setIsSaving(false)
    }
  }

  const visibleSchedules = useMemo(() => schedules, [schedules])

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-end">
        <Button className="gap-2" onClick={openCreateDialog}>
          <Plus className="h-4 w-4" />
          Nuevo horario
        </Button>
      </div>

      {loadError && (
        <Alert variant="destructive">
          <AlertTitle>Error al cargar horarios</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
      )}

      {/* Grid de tarjetas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Spinner className="size-4" />
              Cargando horarios…
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
                    <p className="text-sm text-muted-foreground capitalize">
                      {schedule.tipo_horario}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-xs text-muted-foreground">
                {schedule.tipo_horario !== "flexible" ? (
                  <div className="flex items-center justify-between">
                    <span>Entrada / Salida</span>
                    <span className="text-card-foreground">
                      {fmtHora(schedule.hora_entrada_esperada)} – {fmtHora(schedule.hora_salida_esperada)}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span>Ventana de fichada</span>
                    <span className="text-card-foreground">
                      {fmtHora(schedule.banda_horaria_inicio)} – {fmtHora(schedule.banda_horaria_fin)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Horas diarias</span>
                  <span className="text-card-foreground">{schedule.cantidad_horas_objetivo} h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Descanso semanal</span>
                  <span className="text-card-foreground">{fmtDias(schedule.dias_descanso_semanal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Estado</span>
                  <span className={[
                    "rounded-full px-2 py-0.5 font-medium",
                    schedule.estado === "activo"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-muted text-muted-foreground",
                  ].join(" ")}>
                    {schedule.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-4">
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
          ))
        )}
      </div>

      {/* ── Diálogo: editar ── */}
      <Dialog open={!!selectedSchedule} onOpenChange={(open) => { if (!open) closeEditDialog() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            {formState && (
              <HorarioFormFields
                state={formState}
                onChange={(patch) => setFormState((prev) => prev ? { ...prev, ...patch } : prev)}
                idSuffix="edit"
                showEstado
              />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEditDialog}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" /> Guardando
                  </span>
                ) : "Guardar cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: crear ── */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => { if (!open) closeCreateDialog() }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
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
            <HorarioFormFields
              state={createState}
              onChange={(patch) => setCreateState((prev) => ({ ...prev, ...patch }))}
              idSuffix="new"
              showEstado={false}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeCreateDialog}>Cancelar</Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner className="size-4" /> Guardando
                  </span>
                ) : "Crear horario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Diálogo: confirmar eliminación ── */}
      <Dialog open={!!pendingDelete} onOpenChange={(open) => { if (!open) closeDeleteDialog() }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar horario</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmás que querés eliminar el horario{" "}
            <span className="font-medium text-foreground">{pendingDelete?.nombre_horario}</span>?{" "}
            Esta acción no se puede deshacer.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDeleteDialog}>Cancelar</Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner className="size-4" /> Eliminando
                </span>
              ) : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
