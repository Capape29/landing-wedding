# Activar asistencia y canciones

## Hoja preparada

[Boda de Gustavo y Laura — Asistencia y canciones](https://docs.google.com/spreadsheets/d/1MpTY3RmTCeK0rl8u2IfCe7nzZGpMmQXrKWjS0oLe9eI/edit)

Está en la carpeta ChatGPT de `cholasbegambre@gmail.com`, propietaria de la hoja, y compartida como Editor con `bodalauraygustavo5@gmail.com`.

La conexión de producción quedó verificada el 13 de septiembre de 2026. Se probaron consultas, asistencia parcial, canciones independientes, actualización sin duplicados y eliminación de canciones. Se comprobaron los registros y totales directamente en la hoja y se retiraron los datos ficticios. Falta cargar los nombres y grupos reales y generar sus códigos.

- Página: https://landing-wedding-phi.vercel.app
- Apps Script de la cuenta propietaria: https://script.google.com/d/1lPr3mI13uUej73lP7jHeeL-k47z7cs4avSzK7krsrKrWaXHWP3EDh57i/edit
- Implementación activa: `AKfycbyYqZFUba9I20SUjjSyrJHhD9QGRUp7B1ubTp6GCD8b22RsUlU-UcZQoZQUMlUJ6iLJfg`, versión 2, sin inicialización temporal.
- `GOOGLE_SCRIPT_URL` y `GOOGLE_SCRIPT_SECRET` ya están configuradas en Vercel Production. No repetir la configuración inicial para el uso diario.
- Margen de espera: 45 segundos hacia Google, 55 segundos en el formulario y 60 segundos de duración máxima de la función de Vercel.

Los pasos siguientes sirven para mantenimiento o para recrear la instalación.

## 1. Instalar Google Apps Script

1. Abre la hoja y entra en **Extensiones → Apps Script**.
2. Sustituye el contenido de `Code.gs` por el archivo `apps-script/Code.js` de este proyecto. No lo importes como módulo: Apps Script utiliza funciones globales.
3. En Configuración del proyecto, muestra el manifiesto `appsscript.json` y usa el contenido de `apps-script/appsscript.json`.
4. Guarda y ejecuta **setup** desde el editor. Autoriza el acceso a tu hoja. Puede repetirse: no borra los datos ni cambia los cierres existentes.
5. En **Configuración del proyecto → Propiedades del script**, comprueba `SPREADSHEET_ID` y copia el valor de `API_SECRET` directamente a Vercel en el paso 3. No lo pongas en la hoja ni en el código del navegador.
6. Elige **Implementar → Nueva implementación → Aplicación web**. Ejecutar como: **Yo**. Acceso: **Cualquier persona**. Si tu cuenta de Workspace no permite esa opción, el administrador debe habilitarla o debes usar una cuenta compatible.
7. Copia la URL que termina en `/exec`. La aplicación valida un secreto enviado exclusivamente por el servidor; una llamada sin él no puede consultar ni modificar invitaciones.

La hoja continúa privada aunque el punto de entrada del script sea accesible. Los invitados usan el formulario de la boda y no necesitan cuenta de Google.

## 2. Cargar invitaciones y generar códigos

No cambies los nombres de las pestañas ni el orden de las columnas.

En **Invitaciones**, escribe una fila por grupo. `id` debe ser único y estable; `codigo` se deja vacío para generarlo:

| id | grupo | codigo |
| --- | --- | --- |
| familia-001 | Familia Pérez | |

En **Integrantes**, escribe una fila por persona. El `invitacion_id` debe corresponder a la columna `id` de Invitaciones:

| id | invitacion_id | nombre |
| --- | --- | --- |
| persona-001 | familia-001 | Ana Pérez |
| persona-002 | familia-001 | Luis Pérez |

Estos nombres son ejemplos, no se han cargado en la hoja real. No agregues filas sin identificador ni repitas identificadores. La cantidad de integrantes define los cupos; los invitados no pueden agregar personas.

Ejecuta **generateCodes** en Apps Script. Completa solo los códigos vacíos con 12 caracteres aleatorios y conserva los ya asignados. Ejecuta **refreshViews** después de cualquier cambio manual en los integrantes para actualizar pendientes y totales.

Envía a cada familia la misma URL de la boda y su código correspondiente. Cualquier persona que tenga el código puede consultar y modificar ese grupo. El navegador lo conserva en memoria mientras la página está abierta; después de recargar deberán ingresarlo otra vez.

## 3. Conectar Vercel

1. Importa este repositorio en Vercel con el preset **Vite**, instalación `npm install`, compilación `npm run build` y salida `dist`.
2. Configura en **Settings → Environment Variables**:
   - `GOOGLE_SCRIPT_URL`: URL `/exec` del paso 1.
   - `GOOGLE_SCRIPT_SECRET`: valor exacto de `API_SECRET`.
3. Configura Production. Para Preview usa preferentemente otra hoja y otro script, evitando pruebas sobre respuestas reales.
4. Despliega de nuevo después de cambiar variables. La función `/api/invitation` se despliega desde `api/invitation.js`; no requiere un servidor adicional.

No uses prefijos `VITE_` para estas variables: son privadas y solo las utiliza la función de Vercel. `.env.example` contiene los nombres sin valores. `.env`, `.env.local` y `.vercel` están ignorados por Git.

Para una prueba local completa usa `vercel dev` con esas variables. `npm run dev` por sí solo sirve la interfaz, pero no ejecuta `/api/invitation`.

## Operación y cierres

- **Configuración:** `attendanceClose` y `songsClose` contienen la primera fecha/hora en que NO se aceptan modificaciones. Ambos valores iniciales son `2026-11-06T00:00:00-05:00`: se puede responder durante todo el 5 de noviembre de 2026. Conserva el formato ISO y la zona horaria al editarlos.
- **Respuestas:** almacenamiento del sistema. Una fila por invitación; asistencia en JSON, cuatro pares título/artista y dos fechas de actualización. No edites esta pestaña manualmente durante la recepción de respuestas.
- **Control de asistencia:** una fila por integrante con Pendiente, Asistirá o No asistirá. Totales en F:G. Se reconstruye después de cada guardado o al ejecutar `refreshViews`.
- **Lista para el DJ:** una fila por canción e invitación. Las canciones repetidas entre grupos se conservan; son sugerencias, no una playlist automática. Exporta solo esta pestaña para el DJ si no quieres compartir los datos y códigos de invitados.
- Cada formulario guarda independientemente. Borrar las cuatro canciones y guardar elimina la selección sin modificar asistencia. Un rechazo completo de asistencia también se guarda.
- Después del cierre se pueden consultar las respuestas. Si una página quedó abierta, el servidor rechaza igualmente los guardados fuera del plazo.
- Se permiten 60 solicitudes por origen en 15 minutos, con contadores persistentes en Apps Script. El servidor envía un HMAC de la IP, no la IP sin procesar; personas en la misma red comparten ese límite.
- Las escrituras se serializan con `LockService`. Los reintentos actualizan la misma fila. Si dos personas del mismo grupo editan el mismo formulario, prevalece el último guardado; la asistencia y las canciones no se sobrescriben entre sí.
- Si se produce un error tras guardar la fila pero antes de regenerar las vistas, el formulario no afirma éxito: reintentar actualiza la misma fila y vuelve a construir las vistas.
- Al modificar `Code.gs`, publica una nueva versión desde **Administrar implementaciones** para mantener la URL `/exec`.

## Contrato de API

`POST /api/invitation`, JSON, con `action` y `code`:

- `lookup`: devuelve el grupo, integrantes, respuestas, canciones y cierres correspondientes a ese código.
- `attendance`: añade `attendees: [{ id, attending: true | false }]`, con todos los integrantes del grupo y sin duplicados.
- `songs`: añade `songs: [{ title, artist }]`, entre cero y cuatro, con título y artista de hasta 150 caracteres cada uno.

Éxito: `{ invitation: {...} }`. Error: `{ error, closed? }`, con HTTP 400 (datos), 401 (código), 409 (cierre), 429 (límite), 502/503 (servicio). Todas las respuestas llevan `Cache-Control: no-store`. El código nunca viaja en la URL.

## Verificación y puesta en marcha

Pruebas locales:

```sh
npm test
npm run lint
npm run build
node tests/browser-check.mjs
```

El último comando requiere Microsoft Edge en Windows; se puede indicar otra ruta Chromium con `BROWSER_PATH`. Inicia un servidor local y usa una API ficticia: no escribe en Google. Guarda capturas en `.cache/browser-check/`.

Antes de repartir códigos:

1. Crea una invitación de prueba con dos integrantes y genera su código.
2. Desde la URL de Vercel y un navegador sin sesión Google, prueba código incorrecto y correcto, asistencia parcial y guardar una canción sin tocar la asistencia.
3. Vuelve a ingresar el código y comprueba recuperación. Modifica asistencia, elimina la canción y comprueba que existe solo una fila en Respuestas y que se actualizan ambas vistas.
4. En una hoja de pruebas, cierra un formulario cambiando su fecha a una pasada. Comprueba que se puede consultar y que el otro formulario continúa habilitado. Restablece el cierre acordado.
5. Comprueba en Vercel los errores de `/api/invitation` y en Apps Script el historial de ejecuciones. No registres códigos, secretos ni cuerpos de solicitudes.
6. Retira únicamente las filas de la invitación de prueba de Invitaciones, Integrantes y Respuestas, y ejecuta `refreshViews` antes de usarla con invitados reales.

La prueba real Vercel → Apps Script → Sheets se completó el 13 de septiembre de 2026. Repetirla con datos temporales después de cambiar la hoja, el script o sus credenciales.

Referencias: [Vercel Node.js Functions](https://vercel.com/docs/functions/runtimes/node-js), [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web), [Lock Service](https://developers.google.com/apps-script/reference/lock).
