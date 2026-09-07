# Hoja de ruta de implementación SIGRA

## 1. Alcance actual

Este repositorio implementa el frontend web de SIGRA para dos perfiles:

- Administrador: dashboard, residentes, unidades, cartelera e incidencias.
- Guardia: escáner QR y validación de accesos.

La aplicación móvil para residentes no está dentro de este repositorio. Para cumplir completamente la propuesta será necesario crear un proyecto Expo independiente, conectado a los contratos de la misma API.

## 2. Estado frente a los requisitos funcionales

| Requisito | Estado | Alcance pendiente |
| --- | --- | --- |
| RF01 Autenticación por roles | Parcialmente implementado | Falta completar expiración de sesión, recuperación de contraseña, gestión de sesiones y pruebas por rol. |
| RF02 QR temporal offline con TOTP | Parcial en web | La garita escanea y valida contra la API; falta la generación offline en la app móvil y definir la política criptográfica completa. |
| RF03 CRUD de residentes y unidades | Parcialmente implementado | Existen creación, lectura y activación/revocación; faltan edición, eliminación lógica, detalle y paginación del servidor. |
| RF04 Ticket móvil con texto e imagen | No implementado | Requiere aplicación móvil, carga de archivos y endpoint de creación. |
| RF05 Cola offline de tickets | No implementado | Requiere almacenamiento local, cola durable, reintentos y sincronización en móvil. |
| RF06 Validación QR y registro de acceso | Parcialmente implementado | La interfaz está lista; falta garantizar contrato de validación, auditoría, idempotencia y modo offline de garita si se decide soportarlo. |
| RF07 Comunicados web consumidos en móvil | Parcialmente implementado | El administrador puede publicar; falta endpoint/cliente móvil para lectura, sincronización y notificaciones. |

## 3. División por fases

### Fase 0. Base técnica y contratos

Objetivo: estabilizar las reglas comunes antes de añadir módulos.

Frontend web:

- Crear tipos compartidos para respuestas paginadas, errores y estados.
- Centralizar cliente HTTP, manejo de `401`, timeouts y cancelación de solicitudes.
- Definir estados de carga, vacío, error, guardado y reintento.
- Añadir pruebas de formularios, permisos y acciones críticas.
- Mantener los filtros y la paginación actuales listos para migrar al servidor.

Backend:

- Publicar contratos OpenAPI.
- Estandarizar errores con `code`, `message` y `details`.
- Definir paginación con `page`, `pageSize`, `total` e `items`.
- Definir auditoría y autorización por rol.

Criterio de terminado: los contratos principales están documentados y las respuestas tienen una forma estable.

### Fase 1. Identidad y seguridad

Estado actual: frontend implementado para login, expiración de sesión, solicitud y restablecimiento de contraseña; refresh token, revocación persistida y pruebas backend quedan pendientes. El contrato está en [backend-phase-1.md](backend-phase-1.md).

Frontend web:

- Expiración automática de sesión y redirección al login.
- Estado de sesión persistente y recuperación tras recarga.
- Protección visual y de rutas por rol.
- Pantallas de cambio y recuperación de contraseña, si el alcance académico las incluye.

Backend:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/refresh` o estrategia equivalente.
- `POST /api/auth/logout` si se mantienen sesiones revocables.
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Criterio de terminado: ningún usuario puede acceder a una operación fuera de su rol y las sesiones vencidas se manejan sin estados inconsistentes.

### Fase 2. Administración de unidades y residentes

Estado actual: iniciada en frontend. Residentes y unidades ya tienen creación, edición, filtros, paginación local, activación/revocación y confirmaciones. Falta migrar listados al servidor y completar las reglas backend descritas en [backend-phase-2.md](backend-phase-2.md).

Frontend web:

- Cambiar listados a paginación del servidor.
- Añadir edición mediante modal.
- Confirmar revocación, activación y desactivación.
- Añadir detalle del residente: correo, teléfono, unidad y estado.
- Añadir validación de duplicados mostrada junto al campo correspondiente.
- Mantener filtros por búsqueda, estado y unidad.

Backend:

- `GET /api/residents?search=&status=&unitId=&page=&pageSize=`
- `POST /api/residents`
- `GET /api/residents/:id`
- `PATCH /api/residents/:id`
- `DELETE /api/residents/:id` como eliminación lógica, si se requiere explícitamente.
- `GET /api/units?search=&status=&page=&pageSize=`
- `POST /api/units`
- `GET /api/units/:id`
- `PATCH /api/units/:id`
- `DELETE /api/units/:id` como eliminación lógica.

Reglas mínimas:

- El correo debe ser único.
- El código de unidad debe ser único.
- No se debe eliminar una unidad con residentes o accesos dependientes sin una regla explícita.
- Reactivar y revocar deben ser operaciones autorizadas y auditadas.

Criterio de terminado: un administrador puede crear, consultar, editar, activar, revocar y desactivar sin perder información histórica.

### Fase 3. Cartelera y comunicación

Estado actual: iniciada en frontend. La cartelera ya permite crear, editar, buscar, filtrar, paginar y confirmar publicación/retiro. Falta migrar la paginación al servidor, enriquecer autoría/fechas y habilitar el consumo móvil según [backend-phase-3.md](backend-phase-3.md).

Frontend web:

- Paginación del servidor.
- Edición de anuncios.
- Confirmación para retirar publicaciones.
- Estados publicado/borrador con fechas y autor.
- Preparar lectura de comunicados para móvil.

Backend:

- `GET /api/announcements?search=&status=&page=&pageSize=`
- `POST /api/announcements`
- `GET /api/announcements/:id`
- `PATCH /api/announcements/:id`
- `DELETE /api/announcements/:id` o retiro lógico.
- `GET /api/resident/announcements?cursor=` para móvil.

Criterio de terminado: los comunicados publicados son visibles para residentes, conservan autoría y no desaparecen del historial administrativo.

### Fase 4. Incidencias de mantenimiento

Estado actual: iniciada en frontend. La web ya permite buscar, filtrar por estado y prioridad, paginar, consultar detalle, adjuntos, historial y avanzar estados permitidos. Falta conectar el contrato server-side y completar creación móvil, carga de archivos y sincronización según [backend-phase-4.md](backend-phase-4.md).

Frontend web:

- Paginación y filtros del servidor.
- Detalle de incidencia.
- Estados y transiciones permitidas.
- Historial de cambios.
- Vista de imagen adjunta.
- Indicadores de prioridad y fecha límite, si el negocio los necesita.

Backend:

- `GET /api/tickets?search=&status=&priority=&page=&pageSize=`
- `POST /api/tickets`
- `GET /api/tickets/:id`
- `PATCH /api/tickets/:id/status`
- `POST /api/tickets/:id/attachments`
- `GET /api/tickets/:id/history`

Criterio de terminado: una incidencia se puede crear, consultar, asignar, actualizar y cerrar conservando trazabilidad.

### Fase 5. Generación y control de accesos

Estado actual: iniciada en frontend. La garita tiene estados de cámara, mensajes de error claros, decisiones enriquecidas y la administración cuenta con historial filtrable de accesos. Falta conectar paginación server-side, auditoría e idempotencia con el backend según [backend-phase-5.md](backend-phase-5.md).

Frontend web:

- Mejorar el flujo de garita para estados de cámara, permisos y desconexión.
- Mostrar identificador de evento, hora, dirección y motivo de rechazo.
- Crear historial de accesos para administración.
- Añadir filtros por fecha, dirección y decisión.
- Manejar reintentos sin duplicar eventos.

Backend:

- `POST /api/access/validate`
- `GET /api/access/events?from=&to=&decision=&direction=&page=&pageSize=`
- `GET /api/access/events/:id`
- `POST /api/access/events/:id/retry` solo si el negocio lo requiere.

Criterio de terminado: cada lectura produce una decisión explicable, auditable e idempotente.

### Fase 6. Aplicación móvil offline-first

Proyecto nuevo Expo:

- Login de residentes.
- Generador TOTP/QR sin conexión.
- Billetera de accesos frecuentes.
- Cola local de incidencias con fotografía.
- Sincronización al recuperar conectividad.
- Directorio y reglamentos en caché.
- Estado de sincronización visible y reintentos controlados.

Backend adicional:

- `POST /api/resident/auth/login`
- `GET /api/resident/bootstrap`
- `GET /api/resident/announcements?cursor=`
- `POST /api/resident/tickets`
- `POST /api/resident/sync`
- `GET /api/resident/directory`
- `GET /api/resident/regulations`

Criterio de terminado: las funciones esenciales de generación de pases, consulta de información y creación de incidencias funcionan sin red y sincronizan de forma segura.

### Fase 7. Calidad, despliegue y entrega

- Pruebas unitarias y de integración de cada requisito funcional.
- Pruebas de permisos por rol.
- Pruebas de conectividad intermitente.
- Pruebas de duplicación e idempotencia.
- Revisión de accesibilidad con teclado y lector de pantalla.
- Auditoría de secretos, tokens y datos sensibles.
- Variables de entorno separadas por ambiente.
- Build de producción y guía de despliegue.
- Manual de usuario y evidencias para la presentación.

## 4. Orden recomendado de trabajo

1. Contratos y seguridad.
2. Paginación real del backend y migración del frontend.
3. CRUD completo de residentes y unidades.
4. Cartelera consumible desde móvil.
5. Incidencias completas con archivos.
6. Auditoría de accesos y robustez de garita.
7. Aplicación móvil offline-first.
8. Pruebas, despliegue y documentación final.

Este orden reduce retrabajo: los contratos de identidad, paginación, errores e idempotencia son dependencias de casi todos los módulos.
