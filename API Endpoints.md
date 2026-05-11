# API Endpoints

Documentacion de los endpoints expuestos por la API. Las rutas listadas provienen de los routers definidos en `app/api/routers` y los esquemas de `app/schemas`.

## Autenticacion

La API usa tokens Bearer. En endpoints protegidos enviar:

```
Authorization: Bearer <token>
```

## Health

### GET /health

Devuelve el estado de la API.

- Respuesta 200

```json
{
	"status": "ok"
}
```

## Auth

### POST /auth/login

Autentica un usuario y devuelve un token.

#### Body (JSON)

- `nombre_usuario` (string, min 1, max 120)
- `contrasena` (string, min 1)

#### Respuesta 200

```json
{
	"access_token": "<token>",
	"token_type": "bearer",
	"expires_in": 3600
}
```

### GET /auth/me

Devuelve los datos del usuario autenticado.

- Auth: Bearer token

#### Respuesta 200

```json
{
	"id_usuario": 1,
	"nombre_usuario": "ana.test",
	"email": "ana@test.com",
	"rol": "ADMINISTRADOR",
	"estado": "ACTIVO",
	"id_empleado": 1
}
```

### POST /auth/register-first-admin

Crea el primer administrador (bootstrap). No requiere auth.

#### Body (JSON)

- `nombre_usuario` (string, min 1, max 120)
- `contrasena` (string, min 8, max 255)
- `email` (string)
- `nombre` (string)
- `apellido` (string)
- `dni` (string)
- `cuil` (string)
- `legajo` (string)
- `empresa_razon_social` (string)
- `empresa_cuit` (string)
- `empresa_email` (string)
- `empresa_telefono` (string)
- `empresa_direccion` (string)

#### Respuesta 201

```json
{
	"id_usuario": 1,
	"nombre_usuario": "admin",
	"email": "admin@test.com",
	"rol": "ADMINISTRADOR",
	"estado": "ACTIVO",
	"id_empleado": 1
}
```

## Usuarios

### GET /usuarios

Devuelve todos los usuarios registrados (sin contrasena).

- Respuesta 200

```json
[
	{
		"id_usuario": 1,
		"nombre_usuario": "ana.test",
		"email": "ana@test.com",
		"estado": "activo",
		"ultimo_acceso": null,
		"id_rol": 1,
		"id_empleado": 1,
		"nombre_rol": "Administrador"
	}
]
```

#### Campos de respuesta

- `id_usuario` (int)
- `nombre_usuario` (string)
- `email` (string)
- `estado` (string)
- `ultimo_acceso` (string | null, fecha-hora ISO 8601)
- `id_rol` (int)
- `id_empleado` (int)
- `nombre_rol` (string)

### PATCH /usuarios/{id_usuario}

Actualiza parcialmente un usuario. Si se envia `contrasena`, se guarda el hash y no se devuelve en la respuesta.

#### Body (JSON)

- `nombre_usuario` (string, max 120)
- `email` (string, max 255)
- `estado` (string, max 40)
- `ultimo_acceso` (string | null, fecha-hora ISO 8601)
- `id_rol` (int)
- `id_empleado` (int)
- `contrasena` (string, min 1, max 255)

#### Ejemplo de request

```json
{
	"email": "nuevo@test.com",
	"nombre_usuario": "u.nuevo"
}
```

#### Respuesta 200

```json
{
	"id_usuario": 1,
	"nombre_usuario": "u.nuevo",
	"email": "nuevo@test.com",
	"estado": "activo",
	"ultimo_acceso": null,
	"id_rol": 2,
	"id_empleado": 10,
	"nombre_rol": "Empleado"
}
```

#### Respuesta 404

```json
{
	"detail": "Usuario no encontrado"
}
```

## Empleados

### GET /empleados

Devuelve todos los empleados registrados.

- Respuesta 200

```json
[
	{
		"id_empleado": 1,
		"id_empresa": 1,
		"legajo": "L-1",
		"nombre": "N1",
		"apellido": "A1",
		"dni": "60111221",
		"cuil": "20-60111221-9",
		"fecha_ingreso": "2026-05-10",
		"categoria_laboral": "c",
		"tipo_jornada": "completa",
		"modalidad_fichada_habilitada": "habilitada",
		"estado": "activo"
	}
]
```

#### Campos de respuesta

- `id_empleado` (int)
- `id_empresa` (int)
- `legajo` (string, max 50)
- `nombre` (string, max 120)
- `apellido` (string, max 120)
- `dni` (string, max 32)
- `cuil` (string, max 20)
- `fecha_ingreso` (string, fecha ISO 8601)
- `categoria_laboral` (string, max 120)
- `tipo_jornada` (string, max 80)
- `modalidad_fichada_habilitada` (string, max 80)
- `estado` (string, max 40)

### PATCH /empleados/{id_empleado}

Actualiza parcialmente un empleado.

#### Body (JSON)

- `legajo` (string, max 50)
- `nombre` (string, max 120)
- `apellido` (string, max 120)
- `dni` (string, max 32)
- `cuil` (string, max 20)
- `fecha_ingreso` (string | null, fecha ISO 8601)
- `categoria_laboral` (string, max 120)
- `tipo_jornada` (string, max 80)
- `modalidad_fichada_habilitada` (string, max 80)
- `estado` (string, max 40)
- `id_empresa` (int)

#### Ejemplo de request

```json
{
	"estado": "inactivo",
	"categoria_laboral": "Sistemas"
}
```

#### Respuesta 200

```json
{
	"id_empleado": 1,
	"id_empresa": 1,
	"legajo": "P-1",
	"nombre": "Pepe",
	"apellido": "Prueba",
	"dni": "40111222",
	"cuil": "20-40111222-1",
	"fecha_ingreso": "2026-05-10",
	"categoria_laboral": "Sistemas",
	"tipo_jornada": "completa",
	"modalidad_fichada_habilitada": "habilitada",
	"estado": "inactivo"
}
```

#### Respuesta 404

```json
{
	"detail": "Empleado no encontrado"
}
```

## Empresas

### GET /empresas

Admin lista todas; otros roles solo ven su propia empresa (o vacio si no tiene).

- Auth: Bearer token
- Respuesta 200

#### Campos de respuesta

- `id_empresa` (int)
- `razon_social` (string)
- `cuit` (string)
- `email_contacto` (string)
- `telefono_contacto` (string)
- `direccion` (string)
- `fecha_alta` (string, fecha ISO 8601)
- `estado` (string)

### POST /empresas

Crea una empresa (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 201

#### Body (JSON)

- `razon_social` (string, min 1, max 255)
- `cuit` (string, min 1, max 20)
- `email_contacto` (string, max 255)
- `telefono_contacto` (string, max 50)
- `direccion` (string)
- `fecha_alta` (string, fecha ISO 8601)
- `estado` (string)

### GET /empresas/{id_empresa}

Devuelve una empresa. ADMINISTRADOR ve cualquiera; otros roles solo la propia.

- Auth: Bearer token
- Respuesta 200

#### Respuesta 403

```json
{
	"detail": "No tiene acceso a esta empresa"
}
```

### PATCH /empresas/{id_empresa}

Actualiza parcialmente una empresa (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 200

### DELETE /empresas/{id_empresa}

Elimina una empresa (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 204

### POST /empresas/import

Importa empresas masivas desde un CSV.

- Auth: Bearer token (ADMINISTRADOR)
- Body: `multipart/form-data` con `file` (CSV)
- Query: `dry_run` (bool, default false)
- Respuesta 200

```json
{
	"total_filas": 10,
	"creados": 8,
	"omitidos": 1,
	"errores": [{ "fila": 3, "motivo": "..." }],
	"dry_run": false
}
```

### GET /empresas/export

Exporta empresas como CSV (UTF-8).

- Auth: Bearer token (ADMINISTRADOR)
- Respuesta 200 (text/csv)
- Header: `Content-Disposition: attachment; filename="empresas.csv"`

## Fichadas

### GET /fichadas

Lista fichadas. ADMINISTRADOR o CONTADOR_EXTERNO.

- Auth: Bearer token
- Query: `id_empleado` (int), `desde` (date), `hasta` (date)
- Respuesta 200

#### Respuesta 403

```json
{
	"detail": "Empleado fuera de su empresa"
}
```

### POST /fichadas

Crea una fichada. ADMINISTRADOR o CONTADOR_EXTERNO.

- Auth: Bearer token
- Respuesta 201

#### Body (JSON)

- `fecha_hora` (string, fecha-hora ISO 8601)
- `tipo_fichada` (string)
- `observacion` (string | null)
- `id_empleado` (int)
- `id_origen_fichada` (int)

### GET /fichadas/{id_fichada}

Obtiene una fichada. CONTADOR_EXTERNO solo puede ver fichadas de su empresa.

- Auth: Bearer token
- Respuesta 200

### PATCH /fichadas/{id_fichada}

Actualiza parcialmente una fichada.

- Auth: Bearer token
- Respuesta 200

#### Body (JSON)

- `fecha_hora` (string | null, fecha-hora ISO 8601)
- `tipo_fichada` (string | null)
- `observacion` (string | null)
- `fue_corregida` (bool | null)
- `id_origen_fichada` (int | null)

### DELETE /fichadas/{id_fichada}

Elimina una fichada (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 204

### GET /fichadas/export

Exporta fichadas a XLSX o CSV.

- Auth: Bearer token
- Query: `formato` ("xlsx" | "csv", default "xlsx"), `id_empresa` (int | null)
- Respuesta 200 (archivo)

### POST /fichadas/import

Importa fichadas desde CSV o XLSX.

- Auth: Bearer token
- Body: `multipart/form-data` con `file`
- Query: `dry_run` (bool, default false), `id_empresa` (int | null)
- Reglas: ADMINISTRADOR debe enviar `id_empresa`; CONTADOR_EXTERNO usa su empresa.
- Respuesta 200

```json
{
	"total_filas": 5,
	"fichadas_creadas": 4,
	"novedades_creadas": 1,
	"tipos_novedad_creados": ["..."],
	"origenes_fichada_existentes": ["..."],
	"errores": [{ "fila": 2, "motivo": "...", "legajo": "E-1" }],
	"dry_run": false
}
```

## Horarios

### GET /horarios

Lista horarios (ADMINISTRADOR o CONTADOR_EXTERNO).

- Auth: Bearer token
- Respuesta 200

### POST /horarios

Crea un horario (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 201

#### Body (JSON)

- `nombre_horario` (string)
- `tipo_horario` (string)
- `hora_entrada_esperada` (string, hora)
- `hora_salida_esperada` (string, hora)
- `cantidad_horas_objetivo` (number)
- `banda_horaria_inicio` (string, hora)
- `banda_horaria_fin` (string, hora)
- `tolerancia_entrada_minutos` (int)
- `tolerancia_salida_minutos` (int)
- `tiempo_minimo_descanso_minutos` (int)
- `umbral_horas_extra_minutos` (int)
- `dias_descanso_semanal` (string)
- `estado` (string)

### GET /horarios/{id_horario}

Obtiene un horario (ADMINISTRADOR o CONTADOR_EXTERNO).

- Auth: Bearer token
- Respuesta 200

### PATCH /horarios/{id_horario}

Actualiza parcialmente un horario (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 200

### DELETE /horarios/{id_horario}

Elimina un horario (solo ADMINISTRADOR).

- Auth: Bearer token
- Respuesta 204

## Dashboards

### GET /dashboards/resumen

Metrica global o por empresa. ADMINISTRADOR o CONTADOR_EXTERNO.

- Auth: Bearer token
- Query: `id_empresa` (int | null)
- Respuesta 200

### GET /dashboards/empleados/status

Listado de empleados con metricas resumidas.

- Auth: Bearer token
- Query: `id_empresa` (int | null), `estado` (string | null)
- Respuesta 200

### GET /dashboards/empleados/{id_empleado}

Detalle de empleado: Admin cualquier empleado; ContadorExterno su empresa; Empleado solo a si mismo.

- Auth: Bearer token
- Respuesta 200
