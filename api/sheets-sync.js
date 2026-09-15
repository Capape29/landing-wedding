import { timingSafeEqual } from 'node:crypto'
import { database } from '../server/database.js'
import { syncSheets } from '../server/sheets-mirror.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  const expected = process.env.CRON_SECRET && `Bearer ${process.env.CRON_SECRET}`
  const supplied = req.headers.authorization || ''
  if (!expected || Buffer.byteLength(supplied) !== Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(401).json({ error: 'No autorizado.' })
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (process.env.RSVP_STORAGE !== 'postgres') return res.status(503).json({ error: 'Migración no activada.' })
  try { return res.status(200).json(await syncSheets(database())) } catch {
    console.error('sheets_mirror_pending')
    return res.status(503).json({ error: 'La copia de Sheets está pendiente; los datos siguen guardados en la base.' })
  }
}
