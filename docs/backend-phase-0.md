# Fase 0: contrato backend para SIGRA

Este documento define el trabajo que debe realizarse en `sigra-api` antes de avanzar con nuevas funcionalidades. El objetivo es que web, móvil y backend compartan reglas estables de autenticación, errores, paginación, validación y auditoría.

## 1. Alcance de la fase

La Fase 0 no agrega módulos de negocio nuevos. Deja lista la infraestructura contractual para que los módulos actuales y los futuros trabajen con el mismo formato.

Debe entregar:

- Contrato OpenAPI versionado.
- Respuestas de error uniformes.
- Validación de DTOs en todos los endpoints.
- Autorización centralizada por rol.
- Paginación uniforme.
- Identificador de solicitud para trazabilidad.
- Reglas de timeout y reintento compatibles con el cliente.
- Pruebas de contrato y autorización.

## 2. Convenciones HTTP

Base URL esperada por el frontend:

```text
{API_ORIGIN}/api
```

Reglas:

- JSON UTF-8 para solicitudes y respuestas, excepto archivos.
- Fechas en ISO 8601 UTC, por ejemplo `2026-09-07T15:30:00.000Z`.
- IDs como UUID o string estable. No cambiar el tipo entre endpoints.
- No devolver contraseñas, hashes, semillas TOTP ni secretos en ninguna respuesta.
- Los endpoints protegidos deben aceptar `Authorization: Bearer <accessToken>`.

Códigos mínimos:

| Código | Uso |
| --- | --- |
| `200` | Lectura o actualización exitosa. |
| `201` | Recurso creado. |
| `204` | Operación exitosa sin cuerpo. |
| `400` | JSON o parámetros inválidos. |
| `401` | Token ausente, inválido o vencido. |
| `403` | Token válido, pero rol sin permiso. |
| `404` | Recurso inexistente o no visible para el usuario. |
| `409` | Duplicado o conflicto de regla de negocio. |
| `422` | Opcional: validación semántica si el equipo decide separarla de `400`. |
| `429` | Límite de solicitudes superado. |
| `500` | Error inesperado, sin filtrar detalles internos. |

## 3. Contrato de errores

Todos los errores deben tener esta forma:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "La solicitud contiene datos no válidos.",
  "details": {
    "email": ["El correo electrónico ya está registrado."],
    "password": ["Debe tener entre 8 y 72 caracteres."]
  },
  "requestId": "req_01J..."
}
```

Reglas:

- `code` es estable y apto para lógica del frontend.
- `message` es un mensaje general seguro para mostrar.
- `details` usa nombres de campo del DTO y arreglos de mensajes.
- `requestId` aparece en logs y se devuelve al cliente para soporte.
- No devolver stack traces, consultas SQL, nombres de tablas, tokens ni secretos.
- Para `401`, usar `UNAUTHORIZED`; para `403`, `FORBIDDEN`; para duplicados, `CONFLICT`.

Códigos recomendados:

`VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL_ERROR`.

## 4. Autenticación y roles

### `POST /api/auth/login`

Request:

```json
{ "email": "admin@example.com", "password": "..." }
```

Response `200`:

```json
{
  "accessToken": "jwt-or-equivalent",
  "expiresAt": "2026-09-07T18:00:00.000Z",
  "user": {
    "sub": "uuid",
    "email": "admin@example.com",
    "role": "ADMIN",
    "residentId": null
  }
}
```

Requisitos:

- Normalizar el correo antes de buscarlo.
- No revelar si el correo existe cuando la contraseña es incorrecta.
- Aplicar límite de intentos.
- Registrar inicio de sesión exitoso y fallido sin guardar contraseñas.
- `role` solo puede ser `ADMIN`, `GUARD` o `RESIDENT`.

### `GET /api/auth/me`

Devuelve el usuario asociado al token actual. Si el token está vencido responde `401` con el contrato de error.

### Sesión vencida

El frontend elimina el token y limpia el usuario cuando recibe `401`. El backend debe usar `401`, no `403`, para tokens inválidos o vencidos.

Si se implementa refresh token, añadir:

- `POST /api/auth/refresh`
- Rotación de refresh tokens.
- Revocación por sesión.
- No almacenar refresh tokens en texto plano.

## 5. Paginación y filtros

Los listados deben aceptar:

```text
page: entero >= 1, por defecto 1
pageSize: entero entre 1 y 100, por defecto 10
search: texto opcional, con longitud máxima definida
status: valor enumerado según el recurso
```

Respuesta:

```json
{
  "items": [],
  "total": 125,
  "page": 2,
  "pageSize": 10
}
```

Reglas:

- `total` representa el total después de aplicar todos los filtros.
- Si `page` excede la última página, devolver `items: []` y conservar la página solicitada, o responder `400` si el equipo adopta esa política. Elegir una sola política y documentarla.
- Ordenamiento estable obligatorio, por ejemplo `createdAt DESC, id DESC`.
- Nunca interpolar filtros directamente en SQL.
- Añadir índices para campos de búsqueda, estado y fechas.

Endpoints:

```text
GET /api/residents?search=&status=&unitId=&page=&pageSize=
GET /api/units?search=&status=&page=&pageSize=
GET /api/announcements?search=&status=&page=&pageSize=
GET /api/tickets?search=&status=&page=&pageSize=
```

## 6. Endpoints existentes que deben estabilizarse

### Residentes

```text
GET   /api/residents
POST  /api/residents
PATCH /api/residents/:id
```

`POST /api/residents` request mínimo:

```json
{
  "name": "Ana García",
  "email": "ana.garcia@example.com",
  "phone": "+593 300 123 4567",
  "unitId": "unit-uuid",
  "password": "temporary-password"
}
```

Validaciones mínimas:

- `name`: obligatorio, 3 a 100 caracteres.
- `email`: obligatorio, formato válido, único.
- `phone`: opcional, formato definido por el negocio.
- `unitId`: obligatorio y debe apuntar a una unidad activa.
- `password`: obligatorio, entre 8 y 72 caracteres; almacenar únicamente hash.

`PATCH /api/residents/:id` debe aceptar inicialmente:

```json
{ "active": true }
```

También debe quedar preparado para edición parcial de `name`, `phone` y `unitId`, aplicando las mismas validaciones del DTO de creación.

Reglas:

- Solo `ADMIN` puede crear, editar, activar o revocar.
- Reactivar debe ser explícitamente soportado por el servicio.
- Toda transición de `active` debe quedar auditada.
- No borrar físicamente registros que tengan historial de accesos.

### Unidades

```text
GET   /api/units
POST  /api/units
PATCH /api/units/:id
```

Validaciones:

- `code`: obligatorio, único, 2 a 30 caracteres.
- `address`: obligatorio, 5 a 160 caracteres.
- `parkingSpaces`: entero entre 0 y el máximo definido por el negocio.
- Solo `ADMIN` puede modificar.
- No desactivar una unidad con residentes activos sin aplicar una regla explícita.

### Anuncios

```text
GET   /api/announcements
POST  /api/announcements
PATCH /api/announcements/:id
```

Validaciones:

- `title`: obligatorio, entre 5 y 160 caracteres.
- `body`: obligatorio, entre 10 y 2000 caracteres.
- `published`: booleano.
- Guardar autor, fecha de creación, fecha de publicación y fecha de modificación.
- Retirar un anuncio no debe destruir su historial.

### Incidencias

```text
GET   /api/tickets
PATCH /api/tickets/:id
```

El backend debe definir y validar las transiciones permitidas:

```text
OPEN -> IN_PROGRESS -> RESOLVED
OPEN -> RESOLVED, si el negocio lo permite
```

Una transición inválida debe responder `409` con `CONFLICT` y `details.status`.

### Dashboard

```text
GET /api/dashboard/metrics
```

Debe devolver los campos que ya consume el frontend:

```json
{
  "today": { "allowed": 0, "denied": 0 },
  "openIncidents": 0,
  "flow": [{ "date": "2026-09-07", "total": 0 }]
}
```

El backend debe definir la zona horaria del conjunto residencial y documentarla.

### Validación de acceso

```text
POST /api/access/validate
```

Request:

```json
{
  "qrPayload": "opaque-qr-value",
  "clientEventId": "uuid",
  "direction": "ENTRY"
}
```

Response:

```json
{
  "id": "uuid",
  "decision": "ALLOWED",
  "reason": "ALLOWED",
  "occurredAt": "2026-09-07T15:30:00.000Z"
}
```

Requisitos:

- `clientEventId` debe tener una restricción única para permitir reintentos idempotentes.
- `direction` solo puede ser `ENTRY` o `EXIT`.
- La respuesta debe explicar la decisión con `decision` y `reason`.
- No exponer la semilla TOTP ni material verificador.
- Registrar guardia, unidad, dirección, hora, decisión y motivo.

## 7. Autorización

Matriz mínima:

| Recurso | ADMIN | GUARD | RESIDENT |
| --- | --- | --- | --- |
| Dashboard | Lectura | No | No |
| Residentes | CRUD lógico | No | No |
| Unidades | CRUD lógico | No | No |
| Anuncios | CRUD/publicar | No | Lectura móvil |
| Tickets | Lectura/actualización | No | Crear/consultar propios |
| Validar acceso | No | Validar | No |
| Historial de accesos | Lectura | Solo evento propio si aplica | Solo propios si aplica |

La autorización debe estar en guardas/policies del backend y no depender de que el frontend oculte botones.

## 8. Auditoría mínima

Crear un registro de auditoría para:

- Login exitoso y fallido.
- Creación, edición, activación y revocación de residentes.
- Creación, edición, publicación y retiro de anuncios.
- Activación/desactivación de unidades.
- Cambio de estado de incidencias.
- Validación de accesos permitida o denegada.

Campos mínimos:

```text
auditId, actorUserId, actorRole, action, resourceType,
resourceId, metadata segura, ip si corresponde, createdAt
```

No guardar contraseñas, tokens ni secretos criptográficos en `metadata`.

## 9. Pruebas obligatorias de la fase

- DTOs rechazan campos faltantes, tipos incorrectos y límites inválidos.
- Un correo y un código de unidad no pueden duplicarse.
- Un usuario sin rol suficiente recibe `403`.
- Un token vencido recibe `401`.
- Los errores cumplen exactamente el contrato.
- La paginación respeta filtros, orden estable y límites de `pageSize`.
- Reintentar el mismo `clientEventId` no crea dos eventos.
- Reactivar y revocar residentes actualiza el estado y genera auditoría.
- Los secretos nunca aparecen en respuestas ni logs.

## 10. Entregables del compañero de backend

1. Módulos, DTOs y migrations implementados.
2. Especificación OpenAPI actualizada.
3. Seed de desarrollo con un usuario por rol y datos de prueba.
4. Pruebas automatizadas de autorización, validación, paginación e idempotencia.
5. Archivo `.env.example` sin secretos reales.
6. Colección Postman o guía equivalente.
7. Ejemplos reales de respuestas exitosas y de error.
8. Confirmación de la versión de la API y de cualquier cambio incompatible.
