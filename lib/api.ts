const DEFAULT_API_BASE_URL = 'http://localhost:8000'

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
).replace(/\/$/, '')

const TOKEN_STORAGE_KEY = 'tt_access_token'

type ApiError = {
  detail?: string
}

async function readJson<T>(response: Response): Promise<T | null> {
  const text = await response.text()
  if (!text) return null

  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${normalizedPath}`
}

async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)

  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  if (!headers.has('Authorization')) {
    const token = getStoredToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  const response = await fetch(buildUrl(path), {
    ...init,
    headers,
    cache: init.cache ?? 'no-store',
  })

  if (!response.ok) {
    const errorData = await readJson<ApiError>(response)
    const message = errorData?.detail ?? `Error ${response.status}`
    throw new Error(message)
  }

  const data = await readJson<T>(response)
  return data as T
}

export type User = {
  id_usuario: number
  nombre_usuario: string
  email: string
  estado: string
  ultimo_acceso: string | null
  id_rol: number
  id_empleado: number
  nombre_rol: string
}

export type UserUpdate = {
  nombre_usuario?: string
  email?: string
  estado?: string
  ultimo_acceso?: string | null
  id_rol?: number
  id_empleado?: number
  contrasena?: string
}

export type UserCreate = {
  nombre_usuario: string
  email: string
  estado: string
  id_rol: number
  id_empleado: number
  contrasena: string
}

export type Employee = {
  id_empleado: number
  id_empresa: number
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string
  fecha_ingreso: string | null
  categoria_laboral: string
  tipo_jornada: string
  modalidad_fichada_habilitada: string
  estado: string
}

export type EmployeeUpdate = {
  legajo?: string
  nombre?: string
  apellido?: string
  dni?: string
  cuil?: string
  fecha_ingreso?: string | null
  categoria_laboral?: string
  tipo_jornada?: string
  modalidad_fichada_habilitada?: string
  estado?: string
  id_empresa?: number
}

export type EmployeeCreate = {
  id_empresa: number
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

export type LoginRequest = {
  nombre_usuario: string
  contrasena: string
}

export type LoginResponse = {
  access_token: string
  token_type: string
  expires_in: number
}

export type AuthUser = {
  id_usuario: number
  nombre_usuario: string
  email: string
  rol: string
  estado: string
  id_empleado: number
}

export type RegisterFirstAdminRequest = {
  nombre_usuario: string
  contrasena: string
  email: string
  nombre: string
  apellido: string
  dni: string
  cuil: string
  legajo: string
  empresa_razon_social: string
  empresa_cuit: string
  empresa_email: string
  empresa_telefono: string
  empresa_direccion: string
}

export type RegisterFirstAdminResponse = {
  id_usuario: number
  nombre_usuario: string
  email: string
  rol: string
  estado: string
  id_empleado: number
}

export type Schedule = {
  id_horario: number
  nombre_horario: string
  tipo_horario: string
  hora_entrada_esperada: string
  hora_salida_esperada: string
  cantidad_horas_objetivo: number
  banda_horaria_inicio: string
  banda_horaria_fin: string
  tolerancia_entrada_minutos: number
  tolerancia_salida_minutos: number
  tiempo_minimo_descanso_minutos: number
  umbral_horas_extra_minutos: number
  dias_descanso_semanal: string
  estado: string
}

export type ScheduleCreate = {
  nombre_horario: string
  tipo_horario: string
  hora_entrada_esperada: string
  hora_salida_esperada: string
  cantidad_horas_objetivo: number
  banda_horaria_inicio: string
  banda_horaria_fin: string
  tolerancia_entrada_minutos: number
  tolerancia_salida_minutos: number
  tiempo_minimo_descanso_minutos: number
  umbral_horas_extra_minutos: number
  dias_descanso_semanal: string
  estado: string
}

export type ScheduleUpdate = Partial<ScheduleCreate>

export type Clocking = {
  id_fichada: number
  fecha_hora: string
  tipo_fichada: string
  observacion?: string | null
  id_empleado: number
  id_origen_fichada?: number | null
  fue_corregida?: boolean | null
}

export type ClockingCreate = {
  fecha_hora: string
  tipo_fichada: string
  observacion?: string | null
  id_empleado: number
  id_origen_fichada: number
}

export type ClockingUpdate = {
  fecha_hora?: string | null
  tipo_fichada?: string | null
  observacion?: string | null
  fue_corregida?: boolean | null
  id_origen_fichada?: number | null
}

export async function fetchHealth() {
  return apiRequest<{ status: string }>('/health')
}

export async function login(payload: LoginRequest) {
  const response = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  setStoredToken(response.access_token)
  return response
}

export async function fetchMe() {
  return apiRequest<AuthUser>('/auth/me')
}

export async function registerFirstAdmin(payload: RegisterFirstAdminRequest) {
  return apiRequest<RegisterFirstAdminResponse>('/auth/register-first-admin', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function fetchUsers() {
  return apiRequest<User[]>('/usuarios')
}

export async function createUser(payload: UserCreate) {
  return apiRequest<User>('/usuarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateUser(idUsuario: number, payload: UserUpdate) {
  return apiRequest<User>(`/usuarios/${idUsuario}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function fetchEmployees() {
  return apiRequest<Employee[]>('/empleados')
}

export async function createEmployee(payload: EmployeeCreate) {
  return apiRequest<Employee>('/empleados', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateEmployee(idEmpleado: number, payload: EmployeeUpdate) {
  return apiRequest<Employee>(`/empleados/${idEmpleado}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function fetchSchedules() {
  return apiRequest<Schedule[]>('/horarios')
}

export async function createSchedule(payload: ScheduleCreate) {
  return apiRequest<Schedule>('/horarios', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateSchedule(
  idHorario: number,
  payload: ScheduleUpdate,
) {
  return apiRequest<Schedule>(`/horarios/${idHorario}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function fetchClockings(params?: {
  id_empleado?: number
  desde?: string
  hasta?: string
}) {
  const searchParams = new URLSearchParams()

  if (params?.id_empleado) {
    searchParams.set('id_empleado', String(params.id_empleado))
  }
  if (params?.desde) {
    searchParams.set('desde', params.desde)
  }
  if (params?.hasta) {
    searchParams.set('hasta', params.hasta)
  }

  const query = searchParams.toString()
  const path = query ? `/fichadas?${query}` : '/fichadas'
  return apiRequest<Clocking[]>(path)
}

export async function createClocking(payload: ClockingCreate) {
  return apiRequest<Clocking>('/fichadas', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateClocking(
  idFichada: number,
  payload: ClockingUpdate,
) {
  return apiRequest<Clocking>(`/fichadas/${idFichada}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteClocking(idFichada: number) {
  await apiRequest<void>(`/fichadas/${idFichada}`, {
    method: 'DELETE',
  })
}

export function getStoredToken() {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(TOKEN_STORAGE_KEY)
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(TOKEN_STORAGE_KEY)
}
