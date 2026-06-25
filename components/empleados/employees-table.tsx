"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Search, Pencil, Trash2, EyeOff, Eye } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const CATEGORIAS_LABORALES = ["operaciones", "administracion", "contaduria"]
const TIPOS_JORNADA = ["completa", "parcial", "turnos"]
const MODALIDADES_FICHADA = ["habilitada", "deshabilitada"]
const ESTADOS = ["activo", "inactivo"]
import {
  AUTH_CHANGE_EVENT,
  createEmployee,
  deleteEmployee,
  fetchEmployees,
  getStoredToken,
  updateEmployee,
  type Employee,
  type EmployeeCreate,
  type EmployeeUpdate,
} from "@/lib/api"

type EmployeeFormState = {
  nombre: string
  apellido: string
  categoria_laboral: string
  tipo_jornada: string
  modalidad_fichada_habilitada: string
  estado: string
}

type EmployeesTableProps = {
  initialEmployees?: Employee[]
  error?: string | null
}

type EmployeeCreateState = {
  id_empresa: string
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string
  fecha_ingreso: string
  categoria_laboral: string
  tipo_jornada: string
  modalidad_fichada_habilitada: string
  estado: string
}

function buildEmployeeForm(employee: Employee): EmployeeFormState {
  return {
    nombre: employee.nombre ?? "",
    apellido: employee.apellido ?? "",
    categoria_laboral: employee.categoria_laboral ?? "",
    tipo_jornada: employee.tipo_jornada ?? "",
    modalidad_fichada_habilitada: employee.modalidad_fichada_habilitada ?? "",
    estado: employee.estado ?? "",
  }
}

function buildEmployeePayload(
  original: Employee,
  formState: EmployeeFormState,
): EmployeeUpdate {
  const payload: EmployeeUpdate = {}

  if (formState.nombre !== original.nombre) payload.nombre = formState.nombre
  if (formState.apellido !== original.apellido) payload.apellido = formState.apellido
  if (formState.categoria_laboral !== original.categoria_laboral) {
    payload.categoria_laboral = formState.categoria_laboral
  }
  if (formState.tipo_jornada !== original.tipo_jornada) {
    payload.tipo_jornada = formState.tipo_jornada
  }
  if (
    formState.modalidad_fichada_habilitada !==
    original.modalidad_fichada_habilitada
  ) {
    payload.modalidad_fichada_habilitada =
      formState.modalidad_fichada_habilitada
  }
  if (formState.estado !== original.estado) payload.estado = formState.estado

  return payload
}

export function EmployeesTable({ initialEmployees, error }: EmployeesTableProps) {
  const [employees, setEmployees] = useState(initialEmployees ?? [])
  const [showInactive, setShowInactive] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [formState, setFormState] = useState<EmployeeFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<EmployeeCreateState>({
    id_empresa: "",
    legajo: "",
    nombre: "",
    apellido: "",
    dni: "",
    cuil: "",
    fecha_ingreso: "",
    categoria_laboral: "",
    tipo_jornada: "",
    modalidad_fichada_habilitada: "",
    estado: "activo",
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialEmployees)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)
  const [pendingDelete, setPendingDelete] = useState<Employee | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadEmployees = useCallback(() => {
    if (!getStoredToken()) {
      setEmployees([])
      setLoadError("Inicia sesion para cargar empleados.")
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    fetchEmployees()
      .then((data) => {
        setEmployees(data)
        setLoadError(null)
      })
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : "Error al cargar empleados",
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (initialEmployees) return

    loadEmployees()

    window.addEventListener(AUTH_CHANGE_EVENT, loadEmployees)
    return () => window.removeEventListener(AUTH_CHANGE_EVENT, loadEmployees)
  }, [initialEmployees, loadEmployees])

  const filteredEmployees = useMemo(() => {
    let result = showInactive ? employees : employees.filter((e) => e.estado === "activo")

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((employee) =>
        employee.nombre.toLowerCase().includes(query) ||
        employee.apellido.toLowerCase().includes(query) ||
        employee.legajo.toLowerCase().includes(query) ||
        employee.dni.toLowerCase().includes(query) ||
        employee.cuil.toLowerCase().includes(query),
      )
    }

    return result
  }, [employees, searchQuery, showInactive])

  const openEditDialog = (employee: Employee) => {
    setSelectedEmployee(employee)
    setFormState(buildEmployeeForm(employee))
    setFormError(null)
  }

  const closeDialog = () => {
    setSelectedEmployee(null)
    setFormState(null)
    setFormError(null)
  }

  const openCreateDialog = () => {
    setCreateState({
      id_empresa: "",
      legajo: "",
      nombre: "",
      apellido: "",
      dni: "",
      cuil: "",
      fecha_ingreso: "",
      categoria_laboral: "",
      tipo_jornada: "",
      modalidad_fichada_habilitada: "",
      estado: "activo",
    })
    setCreateError(null)
    setIsCreateOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreateError(null)
  }

  const openDeleteDialog = (employee: Employee) => {
    setPendingDelete(employee)
  }

  const closeDeleteDialog = () => {
    setPendingDelete(null)
  }

  const handleDelete = async () => {
    if (!pendingDelete) return
    try {
      setIsDeleting(true)
      await deleteEmployee(pendingDelete.id_empleado)
      setEmployees((prev) =>
        prev.filter((e) => e.id_empleado !== pendingDelete.id_empleado),
      )
      toast({
        title: "Empleado eliminado",
        description: "El empleado fue eliminado correctamente.",
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

    const idEmpresa = Number(createState.id_empresa)
    if (Number.isNaN(idEmpresa)) {
      setCreateError("El ID de empresa debe ser un numero valido.")
      return
    }

    if (!createState.fecha_ingreso) {
      setCreateError("La fecha de ingreso es obligatoria.")
      return
    }

    const payload: EmployeeCreate = {
      id_empresa: idEmpresa,
      legajo: createState.legajo.trim(),
      nombre: createState.nombre.trim(),
      apellido: createState.apellido.trim(),
      dni: createState.dni.trim(),
      cuil: createState.cuil.trim(),
      fecha_ingreso: createState.fecha_ingreso,
      categoria_laboral: createState.categoria_laboral.trim(),
      tipo_jornada: createState.tipo_jornada.trim(),
      modalidad_fichada_habilitada:
        createState.modalidad_fichada_habilitada.trim(),
      estado: createState.estado.trim(),
    }

    if (
      !payload.legajo ||
      !payload.nombre ||
      !payload.apellido ||
      !payload.dni ||
      !payload.cuil ||
      !payload.categoria_laboral ||
      !payload.tipo_jornada ||
      !payload.modalidad_fichada_habilitada ||
      !payload.estado
    ) {
      setCreateError("Completa todos los campos obligatorios.")
      return
    }

    try {
      setIsCreating(true)
      const created = await createEmployee(payload)
      setEmployees((prev) => [created, ...prev])
      toast({
        title: "Empleado creado",
        description: "El nuevo empleado fue registrado correctamente.",
      })
      closeCreateDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al crear"
      setCreateError(message)
    } finally {
      setIsCreating(false)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedEmployee || !formState) return

    const payload = buildEmployeePayload(selectedEmployee, formState)

    if (Object.keys(payload).length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar.",
      })
      return
    }

    try {
      setIsSaving(true)
      const updated = await updateEmployee(selectedEmployee.id_empleado, payload)
      setEmployees((prev) =>
        prev.map((employee) =>
          employee.id_empleado === updated.id_empleado ? updated : employee,
        ),
      )
      setSelectedEmployee(updated)
      setFormState(buildEmployeeForm(updated))
      setFormError(null)
      toast({
        title: "Empleado actualizado",
        description: "Los cambios se guardaron correctamente.",
      })
      closeDialog()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al actualizar"
      setFormError(message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <label htmlFor="empleados-busqueda" className="sr-only">
              Buscar empleado
            </label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="empleados-busqueda"
              placeholder="Buscar empleado..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={showInactive ? "secondary" : "outline"}
              className="gap-2"
              onClick={() => setShowInactive((prev) => !prev)}
            >
              {showInactive ? (
                <>
                  <EyeOff className="h-4 w-4" />
                  Ocultar inactivos
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Ver inactivos
                </>
              )}
            </Button>
            <Button className="gap-2" onClick={openCreateDialog}>
              Nuevo Empleado
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="px-5 py-4">
            <Alert variant="destructive">
              <AlertTitle>Error al cargar empleados</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Listado de empleados</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Legajo
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Empleado
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categoria
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Jornada
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Fichada
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
              {isLoading ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="size-4" />
                      Cargando empleados...
                    </span>
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay empleados para mostrar.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((employee) => (
                  <tr
                    key={employee.id_empleado}
                    className={[
                      "transition-colors hover:bg-muted/20",
                      employee.estado === "inactivo" ? "opacity-50" : "",
                    ].join(" ")}
                  >
                    <td className="px-5 py-4 text-sm font-mono text-muted-foreground">
                      {employee.legajo}
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <p className="text-sm font-medium text-card-foreground">
                          {employee.nombre} {employee.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          DNI {employee.dni}
                        </p>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-card-foreground">
                      {employee.categoria_laboral}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {employee.tipo_jornada}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {employee.modalidad_fichada_habilitada}
                    </td>
                    <td className="px-5 py-4">
                      <span className={[
                        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium",
                        employee.estado === "activo"
                          ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                          : "bg-muted text-muted-foreground",
                      ].join(" ")}>
                        {employee.estado === "activo" ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                     <td className="px-5 py-4 text-right">
                       <div className="inline-flex items-center gap-2">
                         <Button
                           size="icon"
                           variant="ghost"
                           aria-label="Editar empleado"
                           onClick={() => openEditDialog(employee)}
                         >
                           <Pencil className="h-4 w-4" />
                         </Button>
                         <Button
                           size="icon"
                           variant="ghost"
                           aria-label="Eliminar empleado"
                           onClick={() => openDeleteDialog(employee)}
                           className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
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
        open={!!selectedEmployee}
        onOpenChange={(open) => (!open ? closeDialog() : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar empleado</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="empleado-nombre" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="empleado-nombre"
                value={formState?.nombre ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, nombre: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-apellido" className="text-sm font-medium">
                Apellido
              </label>
              <Input
                id="empleado-apellido"
                value={formState?.apellido ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, apellido: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-categoria" className="text-sm font-medium">
                Categoria laboral
              </label>
              <Select
                value={formState?.categoria_laboral || undefined}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, categoria_laboral: value } : prev,
                  )
                }
              >
                <SelectTrigger id="empleado-categoria">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...CATEGORIAS_LABORALES,
                    ...(formState?.categoria_laboral && !CATEGORIAS_LABORALES.includes(formState.categoria_laboral)
                      ? [formState.categoria_laboral]
                      : []),
                  ].map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-jornada" className="text-sm font-medium">
                Tipo de jornada
              </label>
              <Select
                value={formState?.tipo_jornada || undefined}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, tipo_jornada: value } : prev,
                  )
                }
              >
                <SelectTrigger id="empleado-jornada">
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...TIPOS_JORNADA,
                    ...(formState?.tipo_jornada && !TIPOS_JORNADA.includes(formState.tipo_jornada)
                      ? [formState.tipo_jornada]
                      : []),
                  ].map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-fichada" className="text-sm font-medium">
                Modalidad fichada
              </label>
              <Select
                value={formState?.modalidad_fichada_habilitada || undefined}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, modalidad_fichada_habilitada: value } : prev,
                  )
                }
              >
                <SelectTrigger id="empleado-fichada">
                  <SelectValue placeholder="Seleccionar modalidad" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...MODALIDADES_FICHADA,
                    ...(formState?.modalidad_fichada_habilitada && !MODALIDADES_FICHADA.includes(formState.modalidad_fichada_habilitada)
                      ? [formState.modalidad_fichada_habilitada]
                      : []),
                  ].map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-estado" className="text-sm font-medium">
                Estado
              </label>
              <Select
                value={formState?.estado || undefined}
                onValueChange={(value) =>
                  setFormState((prev) =>
                    prev ? { ...prev, estado: value } : prev,
                  )
                }
              >
                <SelectTrigger id="empleado-estado">
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    ...ESTADOS,
                    ...(formState?.estado && !ESTADOS.includes(formState.estado)
                      ? [formState.estado]
                      : []),
                  ].map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog}>
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
            <DialogTitle>Nuevo empleado</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreateSubmit}>
            {createError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="empleado-id-empresa" className="text-sm font-medium">
                ID empresa
              </label>
              <Input
                id="empleado-id-empresa"
                value={createState.id_empresa}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    id_empresa: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-legajo" className="text-sm font-medium">
                Legajo
              </label>
              <Input
                id="empleado-legajo"
                value={createState.legajo}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    legajo: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-nombre-nuevo" className="text-sm font-medium">
                Nombre
              </label>
              <Input
                id="empleado-nombre-nuevo"
                value={createState.nombre}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    nombre: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-apellido-nuevo" className="text-sm font-medium">
                Apellido
              </label>
              <Input
                id="empleado-apellido-nuevo"
                value={createState.apellido}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    apellido: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-dni" className="text-sm font-medium">
                DNI
              </label>
              <Input
                id="empleado-dni"
                value={createState.dni}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    dni: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-cuil" className="text-sm font-medium">
                CUIL
              </label>
              <Input
                id="empleado-cuil"
                value={createState.cuil}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    cuil: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-fecha" className="text-sm font-medium">
                Fecha de ingreso
              </label>
              <Input
                id="empleado-fecha"
                type="date"
                value={createState.fecha_ingreso}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    fecha_ingreso: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-categoria-nuevo" className="text-sm font-medium">
                Categoria laboral
              </label>
              <Select
                value={createState.categoria_laboral}
                onValueChange={(value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    categoria_laboral: value,
                  }))
                }
              >
                <SelectTrigger id="empleado-categoria-nuevo">
                  <SelectValue placeholder="Seleccionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_LABORALES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-jornada-nuevo" className="text-sm font-medium">
                Tipo de jornada
              </label>
              <Select
                value={createState.tipo_jornada}
                onValueChange={(value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    tipo_jornada: value,
                  }))
                }
              >
                <SelectTrigger id="empleado-jornada-nuevo">
                  <SelectValue placeholder="Seleccionar jornada" />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_JORNADA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-fichada-nuevo" className="text-sm font-medium">
                Modalidad fichada
              </label>
              <Select
                value={createState.modalidad_fichada_habilitada}
                onValueChange={(value) =>
                  setCreateState((prev) => ({
                    ...prev,
                    modalidad_fichada_habilitada: value,
                  }))
                }
              >
                <SelectTrigger id="empleado-fichada-nuevo">
                  <SelectValue placeholder="Seleccionar modalidad" />
                </SelectTrigger>
                <SelectContent>
                  {MODALIDADES_FICHADA.map((mod) => (
                    <SelectItem key={mod} value={mod}>{mod}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <label htmlFor="empleado-estado-nuevo" className="text-sm font-medium">
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
                <SelectTrigger id="empleado-estado-nuevo">
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
                  "Crear empleado"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(open) => (!open ? closeDeleteDialog() : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar empleado</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Esta accion eliminara a{" "}
            <span className="font-medium text-foreground">
              {pendingDelete?.nombre} {pendingDelete?.apellido}
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
