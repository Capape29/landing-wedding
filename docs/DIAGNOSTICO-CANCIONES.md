# Prueba de guardado del 15 de septiembre de 2026

Se creó una invitación temporal independiente y se llamó a la API pública de producción. No se modificaron respuestas de invitados reales.

| Operación | Duración | HTTP |
| --- | ---: | ---: |
| Consultar grupo temporal | 5,47 s | 200 |
| Guardar canción inicial | 22,60 s | 502 |
| Modificar canción | 33,94 s | 502 |
| Consultar modificación | 26,57 s | 502 |
| Borrar canciones de prueba | 6,25 s | 200 |
| Comprobar borrado | 5,90 s | 200 |
| Guardar canción final para verificar en Sheets | 15,50 s | 502 |

Los registros de Vercel de los dos primeros guardados indican `phase: google_response`, `upstreamStatus: 404`, con 22154 y 33588 ms dentro del servidor. No son errores de validación del formulario ni prueban por sí solos un timeout.

Tras el último HTTP 502, la lectura directa de Sheets confirmó el título y artista enviados tanto en Respuestas como en Lista para el DJ. Por tanto, al menos esa operación terminó sus escrituras y falló la entrega de la confirmación.

Google ContentService utiliza una redirección para entregar el contenido. Todavía no se ha instrumentado cada salto: no se puede atribuir el 404 a un host concreto ni asegurar que reintentar la redirección lo resuelva. Referencia: https://developers.google.com/apps-script/reference/content/content-service

Siguiente paso técnico: medir por separado la petición inicial y la descarga de la respuesta redirigida, sin registrar URLs temporales ni credenciales. No repetir automáticamente el POST de escritura. Si el fallo está en la descarga, evaluar una recuperación limitada de esa respuesta o una consulta de confirmación con un identificador de operación.

Se retiraron los valores de la invitación temporal, su integrante, su respuesta y su entrada en la lista del DJ, conservando las filas y el formato existentes.

## Seguimiento: redirecciones

Se instrumentó la petición POST con redirección manual y la descarga GET por separado. La consulta de prueba recibió 302 en 2815 ms; la descarga devolvió 404 después de 10075 ms. Otra escritura recibió 302 después de 14501 ms y descargó su confirmación en 205 ms. Hay variabilidad en ambas etapas.

Se publicó una recuperación limitada: un único reintento GET después de un 404, siguiendo las redirecciones de lectura y compartiendo el límite total de 45 segundos. No se repite el POST ni se envían su cuerpo o secreto a la descarga. La primera URL de descarga debe ser HTTPS en script.googleusercontent.com.

Las 16 pruebas locales pasaron. La prueba inicial en producción detectó una redirección adicional en el reintento; el ajuste final permite seguirla. La ejecución de la verificación final fue rechazada por el usuario, por lo que el ajuste final está publicado pero su eficacia real permanece sin verificar. Se retiraron y verificaron nuevamente los registros temporales.

## Verificación posterior autorizada

La verificación pendiente se ejecutó después, con las seis respuestas HTTP 200:

| Operación | Tiempo |
| --- | ---: |
| Consulta inicial | 4,081 s |
| Guardado | 4,758 s |
| Modificación | 4,094 s |
| Consulta de modificación | 3,436 s |
| Borrado de canciones | 4,670 s |
| Consulta de borrado | 37,064 s |

Las consultas devolvieron la canción editada y luego la selección vacía esperadas. La última consulta registró 36487 ms hasta la respuesta POST 302 y 189 ms en la descarga GET 200. La lentitud intermitente persiste antes de la descarga; esta prueba no separa arranque, cola, bloqueo y ejecución de Apps Script. Los registros de esta ronda muestran descargas exitosas al primer intento, así que no demuestran recuperación real de un 404 por reintento. Se retiraron y verificaron todos los registros temporales sin modificar respuestas reales.
