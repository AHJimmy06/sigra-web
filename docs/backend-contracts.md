# Contratos pendientes del backend

## Reactivar o revocar acceso

La pantalla de residentes usa `PATCH /api/residents/:id` con el cuerpo `{ "active": true }` para activar nuevamente una cuenta y `{ "active": false }` para revocarla.

El backend debe validar permisos de administrador, actualizar el estado de la cuenta de forma atómica y devolver el residente actualizado. Si una cuenta no puede reactivarse por una regla de negocio, responder con `409` y un mensaje de error traducible.

## Listados con búsqueda y filtros

Los filtros actuales funcionan localmente como prototipo. Para producción, los listados deberían aceptar parámetros:

- `GET /api/residents?search=&status=&unitId=&page=&pageSize=`
- `GET /api/units?search=&status=&page=&pageSize=`
- `GET /api/announcements?search=&status=&page=&pageSize=`
- `GET /api/tickets?search=&status=&page=&pageSize=`

Cada respuesta debería incluir `{ items, total, page, pageSize }`. El front ya tiene los controles de paginación en `src/components/Pagination.tsx`; actualmente pagina localmente los arreglos completos que recibe.

## Pasos para activar paginación del servidor en el front

Cuando el backend esté listo, para cada listado (`ResidentsPage`, `UnitsPage`, `AnnouncementsPage` y `TicketsPage`) se debe:

1. Cambiar el tipo de respuesta de `api<T[]>` a `api<PaginatedResponse<T>>`.
2. Enviar `page`, `pageSize` y los filtros activos (`search`, `status`, `unitId`) en la URL.
3. Guardar `response.items` en el estado de la lista y usar `response.total` para el componente `Pagination`.
4. Eliminar el `slice()` local y dejar que cada cambio de página vuelva a solicitar los datos al servidor.
5. Mantener el reinicio a la página 1 cuando cambie un filtro.

Ejemplo de contrato TypeScript:

```ts
interface PaginatedResponse<T> {
	items: T[]
	total: number
	page: number
	pageSize: number
}
```

La interfaz visual no necesita cambiar: solo cambia la fuente de datos y el cálculo del total.