# Canciones de YouTube

Actualización de interfaz: los invitados ahora solo pueden buscar y seleccionar videos de YouTube. Se retiraron las opciones de pegar enlaces y escribir canciones manualmente. Los datos anteriores siguen siendo compatibles en el servidor. Cuando el buscador falla o agota su cuota, se muestra cuándo volver a intentarlo. Las descripciones de opciones manuales que aparecen abajo corresponden a la implementación inicial.

Publicada el 15 de septiembre de 2026. Clave configurada en Vercel y búsqueda real verificada; los enlaces se comprobaron en PostgreSQL, panel privado, Respuestas y Lista para el DJ. Apps Script usa la versión 6. La compilación, las 24 pruebas automatizadas y la prueba de navegador móvil/escritorio pasaron.

Cada invitación conserva hasta cuatro canciones. «Buscar en YouTube» muestra cinco videos; seleccionar cambia el borrador, y «Guardar canciones» confirma el envío. También se puede pegar un enlace sin consultar YouTube o escribir título y artista. El canal del video no se considera el artista.

La interfaz usa un solo módulo para agregar canciones y una lista compacta con contador. «Agregar» incorpora un resultado de búsqueda a la lista; enlaces y texto usan «Agregar a mi lista». Cada elemento permite cambiarlo o quitarlo. Al llegar a cuatro, el módulo se oculta hasta quitar una canción o editar una existente. Un borrador manual sin agregar bloquea el guardado para evitar que quede fuera por accidente.

## Activación

1. En Google Cloud, habilitar **YouTube Data API v3** y crear una clave de API restringida a esa API. Las peticiones salen del servidor: no usar restricciones de sitios web para esta clave.
2. Guardar `YOUTUBE_API_KEY` como variable privada/sensible de Production en Vercel y desplegar. Nunca usar el prefijo `VITE_` ni incluir la clave en Git.
3. Aplicar `node scripts/migrate-youtube.mjs --apply`: comprueba primero el DDL en un esquema aislado y lo revierte; después crea únicamente las tres tablas nuevas. Usa `.cache/neon.env` y una conexión directa con TLS.
4. Publicar Apps Script antes de la aplicación. Se agregan cuatro columnas al final de Respuestas y una columna YouTube en Lista para el DJ. Las posiciones anteriores se conservan.

Sin clave, el buscador ofrece un mensaje y las alternativas siguen funcionando. El panel privado muestra los enlaces. El guardado no realiza llamadas a YouTube ni espera a Sheets.

## Límites y conservación

`POST /api/youtube-search` recibe `{ code, query }` y devuelve `{ results }`. Requiere invitación activa y plazo de canciones abierto. La búsqueda tiene entre 3 y 150 caracteres, límite de diez intentos por invitación cada quince minutos, caché compartida durante 24 horas y presupuesto máximo de cien llamadas por día de America/Los_Angeles. La reserva del presupuesto es atómica e incluye llamadas fallidas. Las consultas a Google tienen ocho segundos de timeout; no se reintentan automáticamente. Los registros solo incluyen estado/consumo, sin claves, consultas ni códigos.

Las canciones conservan `{ title, artist }` y admiten `youtubeUrl` opcional, normalizado a `https://www.youtube.com/watch?v=VIDEO_ID`. Una canción con enlace no necesita título ni artista. Los metadatos `youtube` son proporcionados por el servidor a partir de resultados recientes, nunca confiados al navegador. Las canciones antiguas no requieren migración.

La tarea diaria de `/api/sheets-sync` elimina caché vencida y metadatos del proveedor con más de 29 días, incluyendo los copiados en las canciones, y luego actualiza Sheets. Conserva enlaces elegidos y texto escrito por el invitado; sin metadatos muestra «Video de YouTube». Revisar los fallos de esta tarea y la sincronización pendiente si Google falla.

La limpieza no marca una nueva copia cuando no hay canciones vencidas. Si Google responde 404 al descargar la confirmación de una copia, el servidor reintenta únicamente ese GET, sin repetir el POST que ya pudo haberse guardado.

Pruebas: `npm test`, `npm run build`, `npm run lint` y `node tests/browser-check.mjs`. La prueba de navegador usa respuestas simuladas y no modifica invitados reales.
