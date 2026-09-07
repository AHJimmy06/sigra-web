# Fase 4: incidencias de mantenimiento

Esta fase completa la gestión administrativa de incidencias creadas por residentes. El frontend ya incorpora búsqueda, filtros por estado y prioridad, paginación local, detalle, adjuntos, historial y transiciones controladas.

## Objetivo

Permitir que una incidencia se consulte, priorice, actualice y cierre con trazabilidad completa, sin perder el reporte original ni sus archivos.

## 1. Modelo de incidencia

```text
id
description
status: OPEN | IN_PROGRESS | RESOLVED
priority: LOW | MEDIUM | HIGH | URGENT
createdAt
updatedAt
resident { id, name, email }
attachments[]
history[]
```

La prioridad debe ser obligatoria en backend o tener un valor por defecto documentado, recomendado `MEDIUM`.

## 2. Listado administrativo

`GET /api/tickets?search=&status=&priority=&page=&pageSize=`

Respuesta:

```json
{
  "items": [
    {
      "id": "ticket-uuid",
      "description": "Fuga de agua en el sótano",
      "status": "OPEN",
      "priority": "HIGH",
      "createdAt": "2026-09-07T15:30:00.000Z",
      "updatedAt": "2026-09-07T15:30:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

Reglas:

- Solo `ADMIN` puede consultar el listado completo.
- `search` busca en descripción y, si procede, nombre/código de unidad.
- `status` acepta `OPEN`, `IN_PROGRESS`, `RESOLVED`.
- `priority` acepta `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Orden estable recomendado: prioridad descendente, `createdAt DESC`, `id DESC`.
- La prioridad no debe depender solo del color; siempre debe viajar como dato.

## 3. Detalle

`GET /api/tickets/:id`

Respuesta:

```json
{
  "id": "ticket-uuid",
  "description": "Fuga de agua en el sótano",
  "status": "OPEN",
  "priority": "HIGH",
  "createdAt": "2026-09-07T15:30:00.000Z",
  "updatedAt": "2026-09-07T15:30:00.000Z",
  "resident": {
    "id": "resident-uuid",
    "name": "Ana García",
    "email": "ana@example.com"
  },
  "attachments": [
    {
      "id": "attachment-uuid",
      "name": "foto-sotano.jpg",
      "url": "https://api.example.com/files/signed-url",
      "contentType": "image/jpeg"
    }
  ],
  "history": [
    {
      "id": "history-uuid",
      "from": null,
      "to": "OPEN",
      "createdAt": "2026-09-07T15:30:00.000Z",
      "actorName": "Ana García"
    }
  ]
}
```

Reglas:

- URLs de archivos preferiblemente firmadas y con expiración.
- No incluir información privada de otros residentes.
- El historial debe estar ordenado ascendentemente o documentar el orden elegido.
- El frontend muestra fechas en la zona local, pero el backend siempre almacena UTC.

## 4. Transiciones de estado

`PATCH /api/tickets/:id/status`

Request:

```json
{ "status": "IN_PROGRESS" }
```

Transiciones permitidas por el frontend:

```text
OPEN -> IN_PROGRESS
OPEN -> RESOLVED
IN_PROGRESS -> RESOLVED
RESOLVED -> ninguna
```

El backend debe ser la autoridad final y rechazar transiciones inválidas con:

```json
{
  "code": "CONFLICT",
  "message": "La transición de estado no está permitida.",
  "details": { "status": ["Una incidencia resuelta no puede reabrirse desde este flujo."] },
  "requestId": "req_01J..."
}
```

Reglas:

- Guardar actor, estado anterior, estado nuevo y fecha.
- Operaciones idempotentes cuando el nuevo estado sea igual al actual.
- No permitir que el cliente modifique directamente el historial.
- Definir un endpoint separado para reabrir si el negocio lo necesita.

## 5. Adjuntos

### Crear incidencia móvil

`POST /api/resident/tickets`

Debe aceptar `multipart/form-data` con:

```text
description: texto
priority: opcional o definida por el backend
attachments[]: imágenes
clientEventId: UUID para idempotencia offline
```

### Consultar adjuntos

Los adjuntos deben aparecer en `GET /api/tickets/:id` o mediante:

`GET /api/tickets/:id/attachments`

Requisitos:

- Validar tamaño máximo.
- Permitir solo tipos MIME definidos, por ejemplo JPEG, PNG y WEBP.
- Validar contenido real del archivo, no solo la extensión.
- Generar nombres internos seguros.
- No ejecutar archivos subidos.
- Aplicar límites por incidencia y por residente.
- Registrar subida y eliminación en auditoría.

## 6. Historial

`GET /api/tickets/:id/history`

Respuesta:

```json
[
  {
    "id": "history-uuid",
    "from": "OPEN",
    "to": "IN_PROGRESS",
    "actorName": "Administrador",
    "createdAt": "2026-09-07T16:00:00.000Z",
    "note": null
  }
]
```

El historial debe ser append-only para usuarios normales. Cualquier corrección administrativa debe generar un nuevo evento.

## 7. Autorización

| Acción | ADMIN | GUARD | RESIDENT |
| --- | --- | --- | --- |
| Listar todas | Sí | No | No |
| Ver detalle administrativo | Sí | No | Solo propios |
| Cambiar estado | Sí | No | No |
| Crear | No desde web | No | Sí, móvil |
| Adjuntar archivo | No desde web | No | Sí, propio |
| Ver historial administrativo | Sí | No | Solo propio, si se permite |

El backend debe aplicar autorización aunque el frontend oculte acciones.

## 8. Errores

| Caso | HTTP | `code` |
| --- | --- | --- |
| Descripción/prioridad inválida | `400` | `VALIDATION_ERROR` |
| No autenticado | `401` | `UNAUTHORIZED` |
| Rol insuficiente | `403` | `FORBIDDEN` |
| Incidencia inexistente | `404` | `NOT_FOUND` |
| Transición inválida | `409` | `CONFLICT` |
| Archivo rechazado | `400` | `VALIDATION_ERROR` |

## 9. Pruebas obligatorias

- El listado respeta búsqueda, estado, prioridad y paginación.
- El detalle devuelve residente, adjuntos e historial autorizados.
- No se puede modificar una incidencia inexistente.
- Se rechazan transiciones inválidas.
- Repetir una transición válida no duplica historial innecesariamente.
- Una incidencia resuelta no se modifica sin endpoint de reapertura definido.
- Archivos demasiado grandes o MIME no permitido son rechazados.
- Los URLs de archivos no exponen almacenamiento permanente sin protección.
- Cada transición y adjunto queda auditado.
- `clientEventId` evita duplicados cuando móvil sincroniza un reporte offline.

## 10. Criterio de aceptación

La fase está terminada cuando el administrador puede buscar, filtrar, paginar, abrir el detalle, consultar adjuntos e historial y avanzar incidencias por transiciones válidas; el residente puede crear reportes con imágenes desde móvil; y el backend conserva autorización, auditoría e idempotencia.
