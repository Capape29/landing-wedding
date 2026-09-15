import { database } from '../server/database.js'
import { searchYoutube } from '../server/youtube.js'
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).end()
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!body || JSON.stringify(body).length > 2000) return res.status(400).json({ error: 'Solicitud inválida.' })
    return res.json({ results: await searchYoutube(database(), body) })
  } catch (error) {
    const status = error.status || (error instanceof SyntaxError ? 400 : 503)
    if (status === 429) res.setHeader('Retry-After', '900')
    return res.status(status).json({ error: error.status ? error.message : 'No pudimos buscar. Inténtalo de nuevo más tarde.' })
  }
}
