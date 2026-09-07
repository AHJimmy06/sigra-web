# Fase 7: calidad, despliegue y entrega

## Estado

La Fase 7 puede iniciarse ahora para el frontend web, pero no puede cerrarse por completo hasta que existan el backend de staging y la aplicación móvil. Esta primera entrega incorpora una barrera de errores de renderizado, configuración de producción y un comando unificado de validación.

## 1. Ya implementado en web

- Error Boundary con referencia de incidente y acción de reintento.
- Diferenciación de URL API de desarrollo y producción.
- `npm run validate` para ejecutar lint y build.
- Documentación inicial de `VITE_API_URL` y publicación.
- Manejo de errores HTTP, red, timeout y sesión vencida.
- Estados de carga, vacío, error y confirmación en módulos principales.

## 2. Pruebas que deben añadirse

### Unitarias

- `toQueryString` construye parámetros sin incluir valores vacíos.
- `ApiError` conserva código, estado, detalles y requestId.
- Validaciones de formularios producen mensajes específicos.
- Reglas de transición de incidencias.
- Filtros locales y paginación.

### Componentes

- Login y recuperación de contraseña.
- Modal y ConfirmDialog.
- Paginación.
- Residentes y unidades.
- Cartelera.
- Incidencias.
- Historial de accesos.
- Estados online/offline de la garita.

### Integración y contrato

Deben ejecutarse contra un backend de staging:

- Login por cada rol.
- `401` limpia sesión y redirige.
- `403` no permite operaciones fuera del rol.
- Errores de campo aparecen en el formulario correcto.
- Respuestas paginadas alimentan las tablas.
- Reintentos QR no duplican eventos.
- Incidencias con adjuntos conservan idempotencia.

### End-to-end

Flujos mínimos:

1. Administrador inicia sesión y crea/edita un residente.
2. Administrador activa y revoca acceso con confirmación.
3. Administrador crea, edita, publica y retira un anuncio.
4. Administrador consulta y cambia una incidencia.
5. Guardia inicia cámara, escanea y obtiene decisión.
6. Administrador filtra historial de accesos.
7. Sesión vencida devuelve al login.

## 3. Accesibilidad

- Navegación completa por teclado.
- Foco visible y foco inicial correcto en modales.
- Escape cierra diálogos no bloqueados.
- Tablas con encabezados semánticos.
- Estados comunicados mediante `role="status"` o `role="alert"`.
- `aria-label` en iconos y controles sin texto.
- No depender únicamente del color para autorizado, denegado, prioridad o estado.
- Revisar contraste y zoom al 200%.
- Probar con lector de pantalla.

## 4. Seguridad de entrega

Antes de producción:

- No incluir secretos reales en `.env`, logs ni bundles.
- Revisar `localStorage` y migrar refresh tokens a cookies seguras cuando backend esté preparado.
- Ejecutar auditoría de dependencias.
- Activar HTTPS.
- Restringir CORS en backend.
- Aplicar CSP y headers de seguridad en el hosting.
- Verificar que sourcemaps no expongan información sensible.
- Confirmar que los errores visibles no muestren stack traces.

## 5. Ambientes

Definir al menos:

```text
.env.development
.env.staging
.env.production
```

Cada ambiente debe configurar:

```text
VITE_API_URL
```

No poner claves privadas en variables `VITE_*`: Vite las expone al navegador.

## 6. Pipeline recomendado

```text
Instalar dependencias
  -> lint
  -> typecheck/build
  -> pruebas unitarias
  -> pruebas de componentes
  -> pruebas E2E contra staging
  -> auditoría de dependencias
  -> artefacto de producción
  -> despliegue
  -> smoke test
```

El pipeline debe bloquear publicación si falla lint, build, pruebas o auditoría crítica.

## 7. Documentación de entrega

Debe acompañar la versión final:

- Manual de administrador.
- Manual de guardia.
- Manual de residente móvil.
- Matriz de requisitos RF01-RF07.
- Variables de entorno por ambiente.
- Guía de despliegue.
- Guía de recuperación ante errores.
- Evidencias de pruebas.
- Contratos OpenAPI.
- Lista de decisiones de seguridad.

## 8. Bloqueos para cerrar toda la fase

No se puede declarar Fase 7 completamente terminada hasta contar con:

- Backend de staging estable.
- Pruebas de contrato backend.
- Proyecto móvil Expo implementado.
- Pruebas offline reales.
- Política final de refresh tokens.
- Hosting y dominio definidos.
- Evidencias de accesibilidad y seguridad.

## 9. Criterio de aceptación

La Fase 7 está terminada cuando el frontend, backend y móvil pasan validaciones automatizadas, pueden desplegarse por ambiente, tienen documentación de operación y existe evidencia reproducible de cada requisito funcional.
