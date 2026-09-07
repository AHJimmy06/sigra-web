# Fase 1: identidad y seguridad

Esta fase completa la base de autenticación de SIGRA para web, garita y futura aplicación móvil. El frontend ya incluye manejo de sesión vencida y la pantalla `/forgot-password`; el backend debe implementar los contratos descritos aquí.

## Objetivo

Garantizar que:

- Cada usuario solo acceda a las operaciones de su rol.
- Las sesiones tengan expiración y revocación controladas.
- Las credenciales nunca se expongan.
- La recuperación de contraseña no permita enumerar usuarios.
- Los intentos abusivos sean limitados y auditables.

## Roles

Valores permitidos:

```text
ADMIN
GUARD
RESIDENT
```

El rol debe provenir del registro persistido y no de datos enviados por el cliente. Nunca aceptar `role` en un endpoint público para cambiar privilegios.

## Endpoints

### Inicio de sesión

`POST /api/auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "ContraseñaSegura"
}
```

Response `200`:

```json
{
  "accessToken": "access-token",
  "expiresAt": "2026-09-07T18:00:00.000Z",
  "user": {
    "sub": "user-uuid",
    "email": "admin@example.com",
    "role": "ADMIN",
    "residentId": null
  }
}
```

Reglas:

- Normalizar el correo con `trim` y minúsculas.
- Responder el mismo mensaje ante correo inexistente o contraseña incorrecta.
- Nunca devolver hashes, secretos, preguntas de seguridad ni datos internos.
- Aplicar rate limit por IP y por identificador de usuario.
- Registrar el resultado sin guardar la contraseña.
- Definir una expiración corta para el access token, recomendada entre 15 y 30 minutos.

### Usuario actual

`GET /api/auth/me`

Requiere Bearer token y devuelve el mismo modelo `user` del login. Un token vencido, inválido o revocado debe responder `401`.

### Renovación de sesión

`POST /api/auth/refresh`

Request recomendado mediante cookie `HttpOnly`, `Secure` y `SameSite` apropiado. Si se usa cuerpo JSON, nunca guardar el refresh token en `localStorage`.

Response:

```json
{
  "accessToken": "new-access-token",
  "expiresAt": "2026-09-07T18:30:00.000Z"
}
```

Reglas:

- Rotar refresh tokens.
- Detectar reutilización de un refresh token ya rotado.
- Poder revocar una sesión individual.
- No devolver refresh tokens en JSON si se usan cookies seguras.

### Cerrar sesión

`POST /api/auth/logout`

Debe invalidar la sesión o refresh token actual. El frontend también limpia el token localmente, pero el backend debe revocarlo cuando exista una estrategia de sesiones revocables.

### Solicitar recuperación

`POST /api/auth/forgot-password`

Request:

```json
{ "email": "persona@example.com" }
```

Response siempre `202` o `200` con un mensaje genérico:

```json
{
  "message": "Si existe una cuenta asociada, recibirá instrucciones para recuperar el acceso."
}
```

Reglas:

- No revelar si el correo existe.
- Generar token aleatorio criptográficamente seguro.
- Guardar únicamente el hash del token.
- Expirar el token en un plazo corto, recomendado 15 a 30 minutos.
- Invalidar tokens anteriores al emitir uno nuevo.
- Aplicar rate limit por correo e IP.
- No incluir el token en logs.

### Restablecer contraseña

`POST /api/auth/reset-password`

Request:

```json
{
  "token": "token-recibido-por-correo",
  "password": "NuevaContraseñaSegura"
}
```

Response `204` o `200` sin datos sensibles.

Validaciones:

- Contraseña entre 8 y 72 caracteres.
- Token existente, no usado y no expirado.
- Invalidar el token inmediatamente después de usarlo.
- Revocar todas las sesiones activas del usuario después del cambio.
- No permitir reutilizar la contraseña anterior si la política del proyecto lo exige.

## Autorización por endpoint

| Endpoint | ADMIN | GUARD | RESIDENT |
| --- | --- | --- | --- |
| `POST /auth/login` | Sí | Sí | Sí |
| `GET /auth/me` | Sí | Sí | Sí |
| `POST /auth/refresh` | Sesión propia | Sesión propia | Sesión propia |
| `POST /auth/logout` | Sesión propia | Sesión propia | Sesión propia |
| `POST /auth/forgot-password` | Público | Público | Público |
| `POST /auth/reset-password` | Público con token | Público con token | Público con token |

Los demás endpoints deben aplicar guards de autenticación y autorización propios del recurso. Ocultar una ruta en el frontend nunca reemplaza las guards del backend.

## Modelo de sesión recomendado

```text
id
userId
refreshTokenHash
userAgent
ipAddress
createdAt
lastUsedAt
expiresAt
revokedAt
```

No guardar access tokens en texto plano si el backend mantiene sesiones persistidas.

## Seguridad adicional

- Hash de contraseñas con Argon2id o bcrypt configurado con costo apropiado.
- Validación de DTOs con whitelist y rechazo de propiedades desconocidas.
- CORS restringido a orígenes configurados.
- Headers de seguridad en producción.
- Logs estructurados sin credenciales ni tokens.
- Rate limiting para login y recuperación.
- Mensajes de error que no permitan enumerar usuarios.
- Auditoría de login, logout, recuperación y cambio de contraseña.

## Pruebas obligatorias

- Login correcto para cada rol.
- Login fallido con correo inexistente y contraseña incorrecta con la misma respuesta.
- Token vencido responde `401`.
- Token válido con rol incorrecto responde `403`.
- Refresh rota e invalida el token anterior.
- Logout revoca la sesión correspondiente.
- Recuperación siempre devuelve la misma respuesta para correos existentes y no existentes.
- Token de recuperación expirado o reutilizado es rechazado.
- Cambio de contraseña revoca sesiones anteriores.
- Rate limit funciona para intentos repetidos.
- Ninguna respuesta ni log contiene contraseñas, hashes o tokens.

## Criterio de aceptación de Fase 1

La fase está terminada cuando:

1. Login, `me`, refresh, logout y recuperación están implementados.
2. Las tres roles están protegidos en backend.
3. La web redirige al login cuando recibe `401`.
4. La contraseña puede recuperarse sin revelar existencia de cuentas.
5. Las pruebas de seguridad anteriores pasan en CI.
6. El contrato OpenAPI y las variables de entorno están actualizados.
