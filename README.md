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

## Configuración RSVP (PostgreSQL)

Asistencia y canciones se guardan por separado mediante códigos de invitación.
La API de Vercel guarda directamente en PostgreSQL (Neon). Google Sheets se actualiza en segundo plano como copia de consulta.

La [guía actual](docs/BASE-DE-DATOS.md) explica administración de invitados, sincronización, pruebas y recuperación.
Las variables `DATABASE_URL`, `RSVP_STORAGE`, `CRON_SECRET`, `GOOGLE_SCRIPT_URL` y `GOOGLE_SCRIPT_SECRET` se configuran solo
en el servidor. `npm run dev` sirve la interfaz; para la conexión real usa `vercel dev`.

Ejecuta `npm test`, `npm run lint` y `npm run build` para verificar el proyecto.

Coloca la canción principal en `/public/audio/cancion.mp3`.
