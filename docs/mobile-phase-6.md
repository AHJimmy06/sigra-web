# Fase 6: aplicación móvil offline-first para residentes

## Alcance

La aplicación móvil no debe implementarse dentro de `sigra-web`. Este repositorio es el frontend web de administración y garita. La Fase 6 debe iniciar como un proyecto Expo independiente, por ejemplo:

```text
sigra-mobile/
  app/
  src/
    api/
    auth/
    db/
    features/
    navigation/
    stores/
    sync/
    ui/
  app.json
  package.json
```

Tecnologías previstas por la propuesta:

- React Native con Expo.
- TypeScript.
- NativeWind.
- Expo SQLite o WatermelonDB para datos estructurados.
- React Native MMKV para valores pequeños y configuración.
- Zustand para estado de sesión y sincronización.
- NetInfo para detectar conectividad.

## Objetivos funcionales

1. El residente puede iniciar sesión.
2. Puede generar pases QR temporales sin conexión.
3. Puede guardar accesos frecuentes.
4. Puede crear incidencias con texto e imágenes sin conexión.
5. Las incidencias pendientes se sincronizan al recuperar la red.
6. Puede consultar comunicados publicados aun cuando no haya red.
7. Puede consultar directorio y reglamentos almacenados en caché.
8. El usuario siempre puede ver qué datos están sincronizados y cuáles están pendientes.

## Arquitectura offline-first

La aplicación debe tratar la base local como fuente inmediata de lectura y cola de escritura. La red actualiza la base local cuando está disponible.

Flujo de escritura:

```text
Interacción del usuario
  -> Validación local
  -> Registro local con estado PENDING
  -> Intento de sincronización
  -> API
  -> CONFIRMED o FAILED_RETRYABLE / FAILED_PERMANENT
```

Estados de sincronización:

```text
PENDING
SYNCING
SYNCED
FAILED_RETRYABLE
FAILED_PERMANENT
```

Reglas:

- Nunca perder un reporte porque la red no esté disponible.
- Cada escritura debe tener `clientEventId` UUID generado en el dispositivo.
- No crear duplicados al reintentar.
- Los reintentos deben usar backoff, por ejemplo 5 s, 30 s, 2 min, 10 min.
- Los errores permanentes deben quedar visibles y permitir corregir o descartar con confirmación.
- La sincronización no debe bloquear la navegación.
- No almacenar contraseñas, access tokens permanentes ni secretos en SQLite.

## Almacenamiento local

### MMKV

Usar solo para datos pequeños y de acceso rápido:

- Estado de sesión no sensible o referencias de sesión.
- Preferencias de usuario.
- Última sincronización por recurso.
- Flags de configuración.

Los tokens deben preferir almacenamiento seguro del sistema, como SecureStore. No usar MMKV sin cifrado para tokens si existe una alternativa segura.

### SQLite o WatermelonDB

Tablas mínimas:

```text
announcements
resident_directory
regulations
frequent_accesses
tickets
sync_queue
sync_metadata
```

`sync_queue` debe contener:

```text
id
clientEventId
operation
resourceType
localPayload
status
attempts
nextAttemptAt
lastError
createdAt
updatedAt
```

No guardar secretos TOTP en texto plano. Si el diseño exige material criptográfico local, debe existir una decisión de seguridad específica, cifrado, rotación y revocación.

## Autenticación móvil

Endpoints:

```text
POST /api/resident/auth/login
POST /api/auth/refresh
POST /api/auth/logout
GET  /api/resident/me
```

Reglas:

- Solo usuarios `RESIDENT` pueden entrar al flujo móvil.
- Access token corto.
- Refresh token con rotación y almacenamiento seguro del sistema.
- Cerrar sesión debe limpiar cachés privadas y colas que contengan datos personales según la política del negocio.
- Si una cuenta es revocada, el backend debe devolver `401` o `403` según el contrato y la app debe detener sincronización privada.

## Bootstrap y sincronización de lectura

`GET /api/resident/bootstrap`

Debe devolver la información inicial necesaria:

```json
{
  "resident": {
    "id": "resident-uuid",
    "name": "Ana García",
    "unitCode": "Torre A-101"
  },
  "announcements": [],
  "directory": [],
  "regulations": [],
  "serverTime": "2026-09-07T15:30:00.000Z",
  "syncVersion": "opaque-version"
}
```

Lecturas incrementales:

```text
GET /api/resident/announcements?cursor=&limit=
GET /api/resident/directory?version=
GET /api/resident/regulations?version=
```

Reglas:

- Solo publicar anuncios visibles para residentes.
- Definir cómo se propagan retiros de anuncios ya cacheados.
- Responder con versión o cursor estable.
- Permitir reconstruir el caché sin duplicar registros.

## Generación de pases QR

La generación offline necesita un contrato criptográfico cerrado antes de programar.

Propuesta de flujo:

1. El backend entrega una autorización o configuración temporal al residente autenticado.
2. La app genera el pase con periodo, audiencia, dirección y nonce.
3. El QR contiene un payload opaco firmado o basado en TOTP según la decisión final.
4. La garita verifica sin consultar la base central solo si la política de seguridad lo permite.
5. Las claves, ventanas de tiempo, revocación y renovación deben estar documentadas.

No implementar una semilla compartida improvisada. Deben definirse:

- Algoritmo.
- Longitud y formato del código.
- Ventana de tolerancia temporal.
- Identificador de conjunto/garita.
- Uso único o reutilizable.
- Revocación.
- Rotación de claves.
- Protección contra replay.
- Qué sucede durante una pérdida prolongada de conectividad.

Endpoint de configuración recomendado:

```text
GET /api/resident/access-config
```

Nunca devolver secretos de otros residentes ni material de administración.

## Billetera de accesos frecuentes

Modelo local:

```text
id
label
visitorName
category
encodedAccessReference
expiresAt
lastUsedAt
createdAt
```

Reglas UX:

- Mostrar vencimiento claramente.
- Permitir eliminar con confirmación.
- No mostrar secretos completos en logs ni soporte.
- Indicar cuándo un pase requiere renovación.
- No confundir pase guardado con pase actualmente válido.

## Incidencias offline

`POST /api/resident/tickets`

Debe aceptar `multipart/form-data` o un flujo de carga separado.

Payload lógico:

```text
description
priority
attachments[]
clientEventId
createdAtClient
```

Flujo móvil:

1. Validar descripción e imágenes localmente.
2. Comprimir imágenes respetando calidad y límite.
3. Guardar ticket y adjuntos localmente.
4. Mostrar estado `Pendiente de sincronización`.
5. Intentar envío al recuperar red.
6. Persistir respuesta server-side.
7. Mostrar error accionable si la API rechaza los datos.

El backend debe aceptar idempotencia por `clientEventId`.

## Directorio y reglamentos

Datos cacheables:

- Emergencias.
- Administración.
- Seguridad.
- Mantenimiento.
- Reglamentos vigentes.

UX:

- Mostrar fecha de última actualización.
- Indicar si el contenido puede estar desactualizado.
- Permitir llamadas o acciones solo con confirmación cuando corresponda.
- No borrar el último contenido válido si una actualización falla.

## UX/UI móvil

Pantallas mínimas:

- Inicio/resumen.
- Generar pase QR.
- Billetera.
- Crear incidencia.
- Mis incidencias.
- Cartelera.
- Directorio y reglamentos.
- Estado de sincronización.
- Perfil y cierre de sesión.

Estados obligatorios:

- Sin conexión.
- Sincronizando.
- Sincronizado.
- Error recuperable.
- Error permanente.
- Sesión vencida.
- Permiso de cámara/fotos denegado.
- Datos vacíos.

Buenas prácticas:

- No esconder la condición offline.
- Usar mensajes concretos y accionables.
- Mantener acciones primarias visibles.
- Evitar bloquear toda la app durante sincronización.
- Soportar lectores de pantalla y tamaños de fuente del sistema.
- No depender únicamente de color para estados.

## Seguridad y privacidad

- Usar almacenamiento seguro para credenciales.
- Cifrar información personal local si la base lo requiere.
- Evitar capturas de pantalla en vistas sensibles si el alcance lo exige.
- No registrar payloads QR, tokens o imágenes privadas en logs.
- Limpiar datos al cerrar sesión según la política definida.
- Aplicar límites de tamaño y tipo a fotografías.
- Permitir revocación server-side del dispositivo o sesión.

## Pruebas obligatorias

- Abrir la app sin red con contenido previamente sincronizado.
- Crear incidencia sin red y comprobar que permanece después de cerrar y abrir la app.
- Recuperar red y sincronizar exactamente una vez.
- Reintentar una solicitud sin duplicarla.
- Fallar una sincronización y mostrar estado accionable.
- Resolver conflicto de versión del contenido cacheado.
- Expirar sesión durante una cola pendiente.
- Denegar permisos de cámara/fotos sin dejar la pantalla bloqueada.
- Probar tamaños de imagen y tipos MIME inválidos.
- Validar generación de QR en cambios de hora y zona horaria.

## Criterio de aceptación

La Fase 6 está terminada cuando la app móvil funciona con conectividad intermitente, conserva los datos del residente, sincroniza de forma idempotente, muestra estados comprensibles y no expone secretos criptográficos ni información personal innecesaria.
