# Asistencia y canciones en PostgreSQL

La migración se activó el 15 de septiembre de 2026. El proyecto `wedding-rsvp` de Neon usa el plan gratuito y la región iad1. La API de Vercel consulta y guarda en PostgreSQL. Google Sheets es únicamente una copia visual; editarla ya no cambia lo que ven los invitados.

Se conservaron los dos grupos, siete integrantes y códigos existentes. Los códigos se comparan sin distinguir mayúsculas. Las respuestas anteriores eran pruebas y, por instrucción del usuario, la migración empezó con todos los integrantes pendientes y sin canciones. Hay una copia local anterior en `.cache/pre-database-backup.json`, excluida de Git.

## Uso diario

### Panel privado

Abre https://landing-wedding-phi.vercel.app/admin e ingresa con la contraseña de administración. Puedes crear una invitación indicando familia, código único e integrantes (uno por línea). Al guardar queda disponible inmediatamente para los invitados; Sheets se actualiza en segundo plano.

La lista del panel permite buscar por familia, código o integrante, consultar asistencia y canciones, y actualizar las respuestas. Usa «Cerrar sesión» al terminar. La sesión dura ocho horas. El panel permite crear y consultar; la edición y desactivación de invitaciones existentes se mantiene en Neon.

El servidor requiere `ADMIN_PASSWORD` (mínimo 20 caracteres), una variable privada de Vercel, nunca `VITE_ADMIN_PASSWORD`. Cambiarla y desplegar invalida las sesiones anteriores. La contraseña inicial se entrega en `.cache/admin-access.txt`, excluido de Git. La sesión usa una cookie HttpOnly/Secure/SameSite y el inicio de sesión admite 10 intentos cada 15 minutos por origen. No se necesitan tablas nuevas.

- Invitados: la misma URL y sus mismos códigos.
- Organizador: consultar asistencia y canciones en la hoja existente. La base de datos es la fuente principal.
- Administrar invitados: abrir la base `wedding-rsvp` desde Storage/Integrations del proyecto en Vercel. La tabla `wedding_invitations` contiene grupo, código y miembros. Mantener los identificadores estables y los códigos únicos en mayúsculas. El campo `members` es una lista JSON de objetos `{ "id": "identificador", "name": "Nombre" }`; no incluir `attending` en ella. No cambiar los IDs de personas que ya respondieron.
- Cierres: `wedding_config`, campos `attendance_close` y `songs_close`. Actualmente ambos son el 6 de noviembre de 2026 a las 00:00 de Colombia, por lo que se aceptan respuestas hasta el día anterior.
- Desactivar una invitación: `active=false`. No borrar registros con respuestas que se deban conservar.

## Copia de Sheets

Después de cada consulta o guardado correcto, Vercel intenta copiar los cambios en segundo plano. El invitado recibe su resultado antes de esa copia. Las tablas principales y las listas visuales se reflejan en Sheets; no se reciben ediciones desde la hoja.

La revisión pendiente se conserva en `wedding_sync_state`. Una tarea diaria a las 10:00 UTC (05:00 Colombia, sujeta a la ventana horaria de Vercel Hobby) reintenta la copia cuando no hay actividad. Si Google falla, Sheets puede quedar atrasado hasta otra petición o hasta ese reintento. Se puede ejecutar manualmente `/api/sheets-sync` con autorización `Bearer CRON_SECRET`; no compartir ese secreto ni ponerlo en el navegador.

`version = synced_version` indica que Google confirmó la última copia; `last_ack_at` indica cuándo. Si no coinciden, la copia sigue pendiente. Una respuesta perdida de Google puede dejarla pendiente aunque los valores ya se vean en la hoja; el reintento es idempotente. El bloqueo temporal evita dos copias simultáneas y expira si se interrumpe la función. Apps Script rechaza versiones anteriores y ya no acepta guardados del sistema antiguo después de la primera copia.

## Configuración

- `DATABASE_URL`: conexión PostgreSQL solo del servidor.
- `RSVP_STORAGE=postgres`: activa el backend nuevo.
- `GOOGLE_SCRIPT_URL` y `GOOGLE_SCRIPT_SECRET`: solo para la copia de Sheets y el hash del límite de solicitudes.
- `CRON_SECRET`: autentica la tarea de sincronización.
- Apps Script: versión 5 de la misma implementación. No ejecutar de nuevo la configuración inicial ni generar códigos en Sheets.

La API mantiene el límite de 60 solicitudes por origen cada 15 minutos, verifica los cierres en el servidor y bloquea únicamente la invitación afectada durante un guardado. Asistencia y canciones se actualizan por separado dentro de transacciones.

## Verificación de producción

Con un grupo temporal se midieron: consulta 565 ms, primer guardado de canciones 409 ms, modificación 168 ms, asistencia 150 ms, borrado de canciones 169 ms y consulta final 142 ms. Las respuestas coincidieron con la lectura directa de PostgreSQL. El grupo temporal fue retirado y se confirmó la copia final de Sheets. Son mediciones de una prueba, no una garantía de latencia; Neon gratuito puede suspender el cómputo por inactividad.

## Mantenimiento y recuperación

El esquema está en `db/schema.sql`. `scripts/migrate-database.mjs` importa solo catálogo y cierres desde un archivo JSON y se niega a sobrescribir una base con invitaciones. `scripts/apply-schema.mjs` aplica el esquema usando una conexión directa. Probar cambios de esquema en un entorno aislado antes de producción.

No volver simplemente a `RSVP_STORAGE` antiguo: desde la migración, Sheets puede estar atrasado y Apps Script bloquea las escrituras antiguas. Una reversión exige exportar primero las respuestas actuales de PostgreSQL, verificar su copia completa y retirar deliberadamente el bloqueo de migración en Apps Script. Mantener una exportación segura antes de cambios importantes y revisar los límites/restauración del plan en Neon.
