# Fase 3: cartelera digital y comunicación

Esta fase amplía la cartelera administrativa para que los comunicados sean editables, publicables, retirables y consumibles por la futura aplicación móvil de residentes.

## Objetivo

Permitir que un administrador publique información oficial con autoría, fechas, estado y trazabilidad, sin perder el historial de cambios.

## 1. Modelo de anuncio

Campos mínimos:

```text
id
 title
body
publishedAt
createdAt
updatedAt
authorId
author { id, name, email }
status: DRAFT | PUBLISHED | ARCHIVED
```

Si se mantiene el modelo actual, `status` puede derivarse de `publishedAt`, pero se recomienda un estado explícito para soportar retiro, archivado y futuras programaciones.

No incluir credenciales ni datos sensibles del autor.

## 2. Endpoints administrativos

### Listar

`GET /api/announcements?search=&status=&page=&pageSize=`

Respuesta:

```json
{
  "items": [
    {
      "id": "announcement-uuid",
      "title": "Mantenimiento del ascensor",
      "body": "El ascensor estará fuera de servicio el sábado.",
      "status": "PUBLISHED",
      "publishedAt": "2026-09-07T15:30:00.000Z",
      "createdAt": "2026-09-07T14:00:00.000Z",
      "updatedAt": "2026-09-07T15:00:00.000Z",
      "author": {
        "id": "user-uuid",
        "name": "Administración SIGRA",
        "email": "admin@example.com"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

Reglas:

- Solo `ADMIN` puede consultar el listado administrativo.
- `search` debe consultar título y contenido.
- `status` acepta `DRAFT`, `PUBLISHED` y `ARCHIVED`.
- Orden estable recomendado: `updatedAt DESC, id DESC`.
- El frontend actual tolera `author` y `updatedAt` opcionales durante la transición.

### Crear

`POST /api/announcements`

Request:

```json
{
  "title": "Mantenimiento del ascensor",
  "body": "El ascensor estará fuera de servicio el sábado.",
  "published": true
}
```

Validaciones:

- `title`: obligatorio, entre 5 y 160 caracteres.
- `body`: obligatorio, entre 10 y 2000 caracteres.
- `published`: booleano; si es `true`, establecer `publishedAt` en UTC.
- El autor se obtiene del token, no del body.
- Sanitizar o escapar contenido antes de mostrarlo en clientes.

Respuesta: `201` con el anuncio completo sin información sensible.

### Editar contenido

`PATCH /api/announcements/:id`

El frontend envía:

```json
{
  "title": "Nuevo título",
  "body": "Contenido actualizado."
}
```

Reglas:

- Actualización parcial; rechazar cuerpo vacío.
- Validar los campos enviados.
- Conservar `createdAt` y autor original.
- Actualizar `updatedAt`.
- Registrar los campos modificados.
- Definir si editar un anuncio publicado mantiene su publicación o lo devuelve a borrador. Recomendación: mantenerlo publicado y actualizar `updatedAt`, dejando auditoría.

### Publicar o retirar

`PATCH /api/announcements/:id`

Publicar:

```json
{ "published": true }
```

Retirar:

```json
{ "published": false }
```

Reglas:

- Operaciones idempotentes.
- `publishedAt` se establece al publicar.
- Al retirar, conservar `publishedAt` histórica si el modelo usa historial; usar `status` para el estado actual.
- Solo `ADMIN` puede cambiar el estado.
- Registrar actor, acción, fecha y estado anterior/nuevo.

### Archivado opcional

`DELETE /api/announcements/:id` o endpoint explícito:

`POST /api/announcements/:id/archive`

Preferir archivado lógico. No eliminar físicamente comunicados que ya fueron visibles para residentes.

## 3. Endpoint para residentes móviles

`GET /api/resident/announcements?cursor=&limit=`

Debe devolver solo anuncios publicados y visibles para residentes.

Respuesta recomendada:

```json
{
  "items": [],
  "nextCursor": "opaque-cursor-or-null",
  "syncedAt": "2026-09-07T15:30:00.000Z"
}
```

Reglas:

- Exigir rol `RESIDENT`.
- No devolver borradores, archivados ni notas internas.
- Permitir sincronización incremental por cursor o `updatedAt`.
- Mantener orden por fecha de publicación descendente.
- Definir política de anuncios retirados que ya fueron sincronizados: recomendación, incluir evento de retiro o endpoint de cambios para que móvil pueda ocultarlos.

## 4. Notificaciones futuras

Si se agregan notificaciones push:

- `POST /api/resident/devices` para registrar token del dispositivo.
- `DELETE /api/resident/devices/:id` para revocarlo.
- Enviar notificación solo después de confirmar la transacción de publicación.
- No incluir información sensible en el texto push.
- Registrar entrega o error sin bloquear la publicación.

## 5. Errores

| Caso | HTTP | `code` |
| --- | --- | --- |
| Título/contenido inválido | `400` | `VALIDATION_ERROR` |
| Sin sesión | `401` | `UNAUTHORIZED` |
| No administrador | `403` | `FORBIDDEN` |
| Anuncio inexistente | `404` | `NOT_FOUND` |
| Estado incompatible | `409` | `CONFLICT` |

Ejemplo:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "El anuncio contiene datos no válidos.",
  "details": { "body": ["Debe tener entre 10 y 2000 caracteres."] },
  "requestId": "req_01J..."
}
```

## 6. Auditoría

Registrar como mínimo:

- Creación.
- Edición.
- Publicación.
- Retiro.
- Archivado.
- Lectura/sincronización móvil, si el proyecto requiere métricas.

Guardar valores anterior/nuevo de forma segura y sin datos de autenticación.

## 7. Pruebas obligatorias

- Solo `ADMIN` puede crear, editar, publicar, retirar y archivar.
- Campos inválidos devuelven `details` por campo.
- Publicar dos veces no duplica eventos ni cambia incorrectamente la fecha.
- Retirar dos veces es idempotente.
- Editar un anuncio conserva autor y creación.
- Listado respeta búsqueda, estado, paginación y orden estable.
- Residentes móviles solo reciben publicados.
- Un anuncio retirado se maneja correctamente en sincronización móvil.
- Ningún contenido permite inyección al renderizarlo.
- Cada acción administrativa queda auditada.

## 8. Criterio de aceptación

La fase está terminada cuando un administrador puede crear, buscar, filtrar, paginar, editar, publicar, retirar y archivar anuncios; los residentes pueden recibir únicamente comunicados publicados; y todas las operaciones tienen autorización, validación, auditoría y sincronización definida.
