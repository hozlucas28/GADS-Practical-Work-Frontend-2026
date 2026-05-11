"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import { Search } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import {
  createUser,
  fetchUsers,
  updateUser,
  type User,
  type UserCreate,
  type UserUpdate,
} from "@/lib/api"

type UsersTableProps = {
  initialUsers?: User[]
  error?: string | null
}

type UserFormState = {
  nombre_usuario: string
  email: string
  estado: string
  id_rol: string
  id_empleado: string
  contrasena: string
}

type UserCreateState = {
  nombre_usuario: string
  email: string
  estado: string
  id_rol: string
  id_empleado: string
  contrasena: string
}

function buildUserForm(user: User): UserFormState {
  return {
    nombre_usuario: user.nombre_usuario ?? "",
    email: user.email ?? "",
    estado: user.estado ?? "",
    id_rol: user.id_rol ? String(user.id_rol) : "",
    id_empleado: user.id_empleado ? String(user.id_empleado) : "",
    contrasena: "",
  }
}

function buildUserPayload(original: User, formState: UserFormState): UserUpdate {
  const payload: UserUpdate = {}

  if (formState.nombre_usuario !== original.nombre_usuario) {
    payload.nombre_usuario = formState.nombre_usuario
  }
  if (formState.email !== original.email) payload.email = formState.email
  if (formState.estado !== original.estado) payload.estado = formState.estado

  const roleId = formState.id_rol ? Number(formState.id_rol) : NaN
  if (!Number.isNaN(roleId) && roleId !== original.id_rol) {
    payload.id_rol = roleId
  }

  const employeeId = formState.id_empleado ? Number(formState.id_empleado) : NaN
  if (!Number.isNaN(employeeId) && employeeId !== original.id_empleado) {
    payload.id_empleado = employeeId
  }

  if (formState.contrasena.trim()) {
    payload.contrasena = formState.contrasena.trim()
  }

  return payload
}

export function UsersTable({ initialUsers, error }: UsersTableProps) {
  const [users, setUsers] = useState(initialUsers ?? [])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formState, setFormState] = useState<UserFormState | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createState, setCreateState] = useState<UserCreateState>({
    nombre_usuario: "",
    email: "",
    estado: "activo",
    id_rol: "",
    id_empleado: "",
    contrasena: "",
  })
  const [createError, setCreateError] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(!initialUsers)
  const [loadError, setLoadError] = useState<string | null>(error ?? null)

  const loadUsers = useCallback(() => {
    setIsLoading(true)
    fetchUsers()
      .then((data) => {
        setUsers(data)
        setLoadError(null)
      })
      .catch((err) => {
        setLoadError(
          err instanceof Error ? err.message : "Error al cargar usuarios",
        )
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  useEffect(() => {
    if (initialUsers) return

    loadUsers()
  }, [initialUsers, loadUsers])

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users

    const query = searchQuery.toLowerCase()
    return users.filter((user) => {
      return (
        user.nombre_usuario.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.nombre_rol.toLowerCase().includes(query)
      )
    })
  }, [users, searchQuery])

  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormState(buildUserForm(user))
    setFormError(null)
  }

  const closeDialog = () => {
    setSelectedUser(null)
    setFormState(null)
    setFormError(null)
  }

  const openCreateDialog = () => {
    setCreateState({
      nombre_usuario: "",
      email: "",
      estado: "activo",
      id_rol: "",
      id_empleado: "",
      contrasena: "",
    })
    setCreateError(null)
    setIsCreateOpen(true)
  }

  const closeCreateDialog = () => {
    setIsCreateOpen(false)
    setCreateError(null)
  }

  const handleCreateSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault()

    const roleId = Number(createState.id_rol)
    const employeeId = Number(createState.id_empleado)

    if (Number.isNaN(roleId) || Number.isNaN(employeeId)) {
      setCreateError("Los IDs deben ser numeros validos.")
      return
    }

    const payload: UserCreate = {
      nombre_usuario: createState.nombre_usuario.trim(),
      email: createState.email.trim(),
      estado: createState.estado.trim(),
      id_rol: roleId,
      id_empleado: employeeId,
      contrasena: createState.contrasena.trim(),
    }

    if (
      !payload.nombre_usuario ||
      !payload.email ||
      !payload.estado ||
      !payload.contrasena
    ) {
      setCreateError("Completa todos los campos obligatorios.")
      return
    }

    try {
      setIsCreating(true)
      const created = await createUser(payload)
      setUsers((prev) => [created, ...prev])
      toast({
        title: "Usuario creado",
        description: "El usuario fue registrado correctamente.",
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

    if (!selectedUser || !formState) return

    const payload = buildUserPayload(selectedUser, formState)

    if (Object.keys(payload).length === 0) {
      toast({
        title: "Sin cambios",
        description: "No hay cambios para guardar.",
      })
      return
    }

    try {
      setIsSaving(true)
      const updated = await updateUser(selectedUser.id_usuario, payload)
      setUsers((prev) =>
        prev.map((user) =>
          user.id_usuario === updated.id_usuario ? updated : user,
        ),
      )
      setSelectedUser(updated)
      setFormState(buildUserForm(updated))
      setFormError(null)
      toast({
        title: "Usuario actualizado",
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
            <label htmlFor="usuarios-busqueda" className="sr-only">
              Buscar usuario
            </label>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="usuarios-busqueda"
              placeholder="Buscar usuario..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-9"
            />
          </div>
          <Button className="gap-2" onClick={openCreateDialog}>
            Nuevo Usuario
          </Button>
        </div>

        {loadError && (
          <div className="px-5 py-4">
            <Alert variant="destructive">
              <AlertTitle>Error al cargar usuarios</AlertTitle>
              <AlertDescription>{loadError}</AlertDescription>
            </Alert>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Listado de usuarios</caption>
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Usuario
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Email
                </th>
                <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rol
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
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Spinner className="size-4" />
                      Cargando usuarios...
                    </span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-8 text-center text-sm text-muted-foreground"
                  >
                    No hay usuarios para mostrar.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id_usuario}
                    className="transition-colors hover:bg-muted/20"
                  >
                    <td className="px-5 py-4 text-sm text-card-foreground">
                      {user.nombre_usuario}
                    </td>
                    <td className="px-5 py-4 text-sm text-muted-foreground">
                      {user.email}
                    </td>
                    <td className="px-5 py-4 text-sm text-card-foreground">
                      {user.nombre_rol}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        {user.estado}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditDialog(user)}
                      >
                        Editar
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog
        open={!!selectedUser}
        onOpenChange={(open) => (!open ? closeDialog() : null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar usuario</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleSubmit}>
            {formError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo guardar</AlertTitle>
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="usuario-nombre" className="text-sm font-medium">
                Nombre de usuario
              </label>
              <Input
                id="usuario-nombre"
                value={formState?.nombre_usuario ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, nombre_usuario: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="usuario-email"
                value={formState?.email ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, email: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-rol" className="text-sm font-medium">
                ID rol
              </label>
              <Input
                id="usuario-rol"
                value={formState?.id_rol ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, id_rol: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-empleado" className="text-sm font-medium">
                ID empleado
              </label>
              <Input
                id="usuario-empleado"
                value={formState?.id_empleado ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, id_empleado: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-estado" className="text-sm font-medium">
                Estado
              </label>
              <Input
                id="usuario-estado"
                value={formState?.estado ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, estado: event.target.value } : prev,
                  )
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-contrasena" className="text-sm font-medium">
                Contrasena (opcional)
              </label>
              <Input
                id="usuario-contrasena"
                type="password"
                value={formState?.contrasena ?? ""}
                onChange={(event) =>
                  setFormState((prev) =>
                    prev ? { ...prev, contrasena: event.target.value } : prev,
                  )
                }
              />
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
            <DialogTitle>Nuevo usuario</DialogTitle>
          </DialogHeader>
          <form className="grid gap-4" onSubmit={handleCreateSubmit}>
            {createError && (
              <Alert variant="destructive">
                <AlertTitle>No se pudo crear</AlertTitle>
                <AlertDescription>{createError}</AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <label htmlFor="usuario-nombre-nuevo" className="text-sm font-medium">
                Nombre de usuario
              </label>
              <Input
                id="usuario-nombre-nuevo"
                value={createState.nombre_usuario}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    nombre_usuario: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-email-nuevo" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="usuario-email-nuevo"
                value={createState.email}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-rol-nuevo" className="text-sm font-medium">
                ID rol
              </label>
              <Input
                id="usuario-rol-nuevo"
                value={createState.id_rol}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    id_rol: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-empleado-nuevo" className="text-sm font-medium">
                ID empleado
              </label>
              <Input
                id="usuario-empleado-nuevo"
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
              <label htmlFor="usuario-estado-nuevo" className="text-sm font-medium">
                Estado
              </label>
              <Input
                id="usuario-estado-nuevo"
                value={createState.estado}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    estado: event.target.value,
                  }))
                }
              />
            </div>
            <div className="grid gap-2">
              <label htmlFor="usuario-contrasena-nuevo" className="text-sm font-medium">
                Contrasena
              </label>
              <Input
                id="usuario-contrasena-nuevo"
                type="password"
                value={createState.contrasena}
                onChange={(event) =>
                  setCreateState((prev) => ({
                    ...prev,
                    contrasena: event.target.value,
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
                  "Crear usuario"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
