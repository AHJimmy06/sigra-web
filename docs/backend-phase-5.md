# Fase 5: control de accesos y auditoría

Esta fase completa la operación de garita y la consulta administrativa de eventos de acceso. El frontend ya mejora la experiencia de escaneo y agrega una vista administrativa de historial.

## Objetivo

Validar pases QR de forma segura, registrar decisiones idempotentes y permitir que administración consulte el historial sin exponer secretos criptográficos.

## 1. Validación en garita

`POST /api/access/validate`

Request:

```json
{
  "qrPayload": "contenido-opaco-del-qr",
  "clientEventId": "uuid",
  "direction": "ENTRY"
}
```

Response:

```json
{
  "id": "event-uuid",
  "decision": "ALLOWED",
  "reason": "VALID_PASS",
  "direction": "ENTRY",
  "occurredAt": "2026-09-07T15:30:00.000Z",
  "requestId": "req_01J..."
}
```

Valores:

```text
decision: ALLOWED | DENIED
direction: ENTRY | EXIT
reason: VALID_PASS | INVALID_QR | PASS_NOT_FOUND | PASS_REVOKED | PASS_EXPIRED | ACCESS_REVOKED | INVALID_OR_EXPIRED_TOKEN
```

Reglas criptográficas:

- El backend nunca devuelve semillas TOTP, claves privadas ni material verificador.
- Verificar firma/TOTP, ventana temporal y audiencia del pase según el diseño criptográfico.
- Validar que el payload no sea reutilizable si el modelo exige uso único.
- Usar tiempo del servidor como referencia.
- No confiar en hora, rol o dirección enviados sin validarlos.

Reglas operativas:

- El guardia autenticado debe estar activo y autorizado para la garita.
- `clientEventId` debe tener restricción única para idempotencia.
- Repetir la misma solicitud debe devolver el mismo evento, no crear uno nuevo.
- La equivalencia se comprueba con una huella SHA-256 del payload, dirección y guardia. El payload QR original no se persiste.
- Reutilizar `clientEventId` con una solicitud distinta responde `409 CONFLICT` y no ejecuta otra validación.
- Registrar decisión permitida o denegada, motivo, dirección, guardia y hora.
- Responder con motivo seguro, sin revelar información que facilite ataques.

Errores:

- Código inválido o vencido: respuesta de negocio `200` con `decision: DENIED`, salvo que la solicitud sea estructuralmente inválida.
- Payload malformado: `400 VALIDATION_ERROR`.
- Sesión inválida: `401 UNAUTHORIZED`.
- Guardia sin permiso: `403 FORBIDDEN`.
- Reintento incompatible del mismo `clientEventId`: `409 CONFLICT`.

## 2. Historial administrativo

`GET /api/access/events?search=&decision=&direction=&from=&to=&page=&pageSize=`

Respuesta:

```json
{
  "items": [
    {
      "id": "event-uuid",
      "decision": "DENIED",
      "reason": "EXPIRED",
      "direction": "ENTRY",
      "occurredAt": "2026-09-07T15:30:00.000Z",
      "requestId": "req_01J...",
      "resident": {
        "name": "Ana García",
        "unitCode": "Torre A-101"
      },
      "guard": {
        "email": "guardia@example.com"
      }
    }
  ],
  "total": 1,
  "page": 1,
  "pageSize": 10
}
```

Reglas:

- Solo `ADMIN` puede consultar todo el historial.
- `search` busca residente, unidad y guardia.
- `decision` acepta `ALLOWED` o `DENIED`.
- `direction` acepta `ENTRY` o `EXIT`.
- Las fechas simples de `from` y `to` se interpretan como días completos en `RESIDENTIAL_TIME_ZONE` (`America/Guayaquil` por defecto) y se convierten a UTC. Los timestamps ISO conservan su offset explícito.
- Orden estable: `occurredAt DESC, id DESC`.
- Aplicar límites de `pageSize` e índices para consultas por fecha.

El frontend actual pagina localmente mientras recibe arreglos completos; al activar este endpoint se debe migrar a `PaginatedResponse<AccessEvent>` y enviar filtros al servidor.

## 3. Detalle opcional

`GET /api/access/events/:id`

Debe devolver:

- Decisión.
- Motivo.
- Dirección.
- Hora.
- Guardia.
- Residente y unidad, si la política permite mostrarlo.
- Identificador de solicitud.
- Estado de idempotencia.

No devolver el QR original ni secretos criptográficos.

## 4. Auditoría

Cada evento de acceso debe conservar:

```text
eventId
clientEventId
guardiaId
decision
reason
direction
residentId si fue identificado
unitId si fue identificado
occurredAt
createdAt
requestId
```

Los eventos de acceso son append-only. Las correcciones administrativas deben generar un evento adicional, nunca modificar silenciosamente el original.

## 5. Dashboard

`GET /api/dashboard/metrics`

Debe calcular con la misma fuente de eventos:

```json
{
  "today": { "allowed": 12, "denied": 3 },
  "openIncidents": 4,
  "flow": [
    { "date": "2026-09-07", "total": 15 }
  ]
}
```

Definir:

- La zona horaria es `RESIDENTIAL_TIME_ZONE`, con `America/Guayaquil` por defecto.
- “Hoy” empieza a medianoche en esa zona y se convierte a UTC para consultar.
- El flujo incluye autorizados y denegados.
- Los días sin eventos aparecen con total `0`.

## 6. Seguridad de la garita

- Tokens con expiración y renovación controlada.
- No guardar secretos criptográficos en el navegador.
- Mostrar estado de red y diferenciar sin conexión de código denegado.
- No reintentar automáticamente una validación sin conservar `clientEventId`.
- Aplicar rate limit por guardia y dispositivo.
- Registrar permisos de cámara solo en el navegador.
- No almacenar payloads QR después de validar.

La versión actual del frontend requiere API activa para validar. El modo offline de garita solo debe implementarse mediante una decisión arquitectónica explícita y almacenamiento de material verificable con rotación y revocación segura.

## 7. Pruebas obligatorias

- QR válido produce `ALLOWED` y un evento.
- QR vencido produce `DENIED` con `EXPIRED`.
- QR alterado produce `DENIED` sin filtrar detalles criptográficos.
- Entrada y salida quedan diferenciadas.
- Repetir `clientEventId` no duplica eventos.
- Guardia sin rol o inactivo recibe `403`.
- Historial filtra por decisión, dirección, fechas y texto.
- Paginación devuelve `total` después de filtros.
- Eventos son append-only.
- Dashboard coincide con los eventos almacenados.
- No aparecen secretos en respuesta, logs o auditoría.

## 8. Criterio de aceptación

La fase está terminada cuando la garita procesa decisiones claras y trazables, administración puede consultar el historial con filtros y paginación, el dashboard usa los mismos eventos y los reintentos no generan duplicados.
