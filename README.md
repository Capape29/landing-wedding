# landing-wedding

SPA de invitación de boda construida con **React + Vite + Tailwind CSS**.

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Configuración RSVP (Google Sheets)

Asistencia y canciones se guardan por separado mediante códigos de invitación.
La API de Vercel conecta con Google Apps Script y una hoja privada.

La [guía de configuración](docs/CONFIRMACIONES.md) incluye la hoja preparada,
carga de invitados, generación de códigos, despliegue y pruebas.
Las variables `GOOGLE_SCRIPT_URL` y `GOOGLE_SCRIPT_SECRET` se configuran solo
en el servidor. `npm run dev` sirve la interfaz; para la conexión real usa `vercel dev`.

Ejecuta `npm test`, `npm run lint` y `npm run build` para verificar el proyecto.

Coloca la canción principal en `/public/audio/cancion.mp3`.
