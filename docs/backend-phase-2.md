# Fase 2: administración de residentes y unidades

Esta fase completa la administración operativa del conjunto residencial. El frontend ya contiene formularios de creación, edición, filtros, paginación local, activación y revocación con confirmación.

## Objetivo

Permitir que un administrador gestione residentes y unidades sin borrar historial, con validación consistente, permisos estrictos y respuestas paginadas.

## 1. Residentes

### Listado

`GET /api/residents?search=&status=&unitId=&page=&pageSize=`

Respuesta:

```json
{
  "items": [
    {
      "id": "resident-uuid",
      "name": "Ana García",
      "email": "ana.garcia@example.com",
      "phone": "+593 300 123 4567",
      "active": true,
      "unit": { "id": "unit-uuid", "code": "Torre A-101", "active": true }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

Reglas:

- Solo `ADMIN` puede consultar el listado administrativo.
- `search` debe buscar al menos en nombre, correo, teléfono y código de unidad.
- `status` debe aceptar `ACTIVE`, `INACTIVE` o ausencia del filtro.
- `unitId` debe filtrar por unidad.
- Orden estable recomendado: `name ASC, id ASC`.
- No devolver contraseña ni hash.

### Crear

`POST /api/residents`

Request:

```json
{
  "name": "Ana García",
  "email": "ana.garcia@example.com",
  "phone": "+593 300 123 4567",
  "unitId": "unit-uuid",
  "password": "ContraseñaTemporal"
}
```

Validaciones:

- `name`: 3 a 100 caracteres, solo nombre válido según la política definida.
- `email`: formato válido, normalizado y único.
- `phone`: opcional; si existe debe respetar el formato definido.
- `unitId`: obligatorio, existente y activo.
- `password`: 8 a 72 caracteres y almacenada con hash seguro.
- El rol creado siempre debe ser `RESIDENT`; nunca aceptar `role` desde el cliente.

Respuesta: `201` con el residente creado sin datos sensibles.

### Editar

`PATCH /api/residents/:id`

El frontend utiliza:

```json
{
  "name": "Ana María García",
  "phone": "+593 300 111 2222",
  "unitId": "new-unit-uuid"
}
```

También utiliza para cambiar acceso:

```json
{ "active": true }
```

o:

```json
{ "active": false }
```

Reglas:

- Aceptar actualizaciones parciales, pero rechazar un cuerpo vacío.
- Validar cada campo enviado.
- No cambiar correo ni contraseña desde este formulario administrativo.
- El cambio de correo debe tener un flujo de seguridad separado.
- Si se cambia de unidad, validar que la nueva unidad esté activa.
- Registrar quién hizo el cambio y qué campos cambiaron.
- Activar y revocar deben ser idempotentes.

### Eliminación lógica

Si el requisito académico exige `DELETE`:

`DELETE /api/residents/:id`

Debe marcar el registro como eliminado o archivado, no borrarlo físicamente si tiene accesos, tickets o auditoría asociados. Definir si un residente archivado puede reactivarse.

## 2. Unidades

### Listado

`GET /api/units?search=&status=&page=&pageSize=`

Respuesta:

```json
{
  "items": [
    {
      "id": "unit-uuid",
      "code": "Torre A-101",
      "address": "Calle 10 # 20-30",
      "parkingSpaces": 2,
      "active": true
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

`search` debe buscar por código y dirección. `status` acepta `ACTIVE` o `INACTIVE`.

### Crear

`POST /api/units`

```json
{
  "code": "Torre A-101",
  "address": "Calle 10 # 20-30",
  "parkingSpaces": 2
}
```

Validaciones:

- `code`: obligatorio, único, 2 a 30 caracteres.
- `address`: obligatorio, 5 a 160 caracteres.
- `parkingSpaces`: entero entre 0 y el límite definido por el negocio.

### Editar

`PATCH /api/units/:id`

El frontend envía:

```json
{
  "code": "Torre A-101",
  "address": "Calle 10 # 20-30",
  "parkingSpaces": 3
}
```

También usa:

```json
{ "active": false }
```

o:

```json
{ "active": true }
```

Reglas:

- Validación parcial y rechazo de cuerpo vacío.
- Código único sin distinguir mayúsculas/minúsculas.
- No desactivar una unidad con residentes activos sin una política explícita.
- Registrar cambios de capacidad y estado.
- Activar y desactivar deben ser idempotentes.

### Eliminación lógica

`DELETE /api/units/:id`

No borrar una unidad que tenga residentes, tickets o eventos de acceso sin una migración controlada. Preferir `archivedAt` o `active` y conservar relaciones históricas.

## 3. Paginación del servidor

Cuando se active el backend paginado, el frontend reemplazará el filtrado y `slice()` local por:

```text
GET /api/residents?search=ana&status=ACTIVE&unitId=unit-uuid&page=1&pageSize=10
```

La respuesta debe conservar `items`, `total`, `page` y `pageSize`. No cambiar el componente visual `Pagination`.

Requisitos:

- `pageSize` limitado para evitar respuestas gigantes.
- Orden estable.
- `total` calculado después de filtros.
- Índices para correo, código, estado y campos de búsqueda.
- Los filtros deben ser parametrizados, nunca concatenados en SQL.

## 4. Errores esperados

| Caso | Código HTTP | `code` |
| --- | --- | --- |
| Campo inválido | `400` | `VALIDATION_ERROR` |
| Sin sesión | `401` | `UNAUTHORIZED` |
| No administrador | `403` | `FORBIDDEN` |
| Residente/unidad inexistente | `404` | `NOT_FOUND` |
| Correo o código duplicado | `409` | `CONFLICT` |
| Unidad con residentes activos | `409` | `CONFLICT` |

Los errores de campo deben venir en `details`, por ejemplo:

```json
{
  "code": "CONFLICT",
  "message": "No fue posible actualizar el residente.",
  "details": { "email": ["El correo ya está registrado."] },
  "requestId": "req_01J..."
}
```

## 5. Pruebas obligatorias

- Solo un administrador puede usar los endpoints.
- Crear residente con correo duplicado devuelve `409`.
- Crear unidad con código duplicado devuelve `409`.
- Editar conserva los campos no enviados.
- Reactivar y revocar son idempotentes.
- No se puede asignar un residente a una unidad inexistente o inactiva.
- No se desactiva una unidad con residentes activos sin la regla definida.
- `DELETE` conserva relaciones históricas.
- Búsqueda, filtros y paginación calculan correctamente `total`.
- Nunca se devuelve contraseña o hash.
- Cada acción administrativa genera auditoría.

## 6. Criterio de aceptación

La fase está terminada cuando el administrador puede crear, listar, buscar, filtrar, paginar, editar, activar, revocar y archivar residentes y unidades, con autorización, validación, auditoría y sin pérdida de historial.
