import { createHmac } from 'node:crypto'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  }
  const url = process.env.GOOGLE_SCRIPT_URL
  const secret = process.env.GOOGLE_SCRIPT_SECRET
  if (!url || !secret) return res.status(503).json({ error: 'Los formularios aún no están disponibles. Inténtalo más tarde.' })
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
    if (!body || JSON.stringify(body).length > 12000 || !['lookup', 'attendance', 'songs'].includes(body.action) || typeof body.code !== 'string' || !/^[A-Z0-9]{12}$/.test(body.code.trim().toUpperCase())) {
      return res.status(400).json({ error: 'Revisa el código y los datos de tu invitación.' })
    }
    // Vercel supplies this header. Do not use a client-supplied identifier.
    const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim()
    const clientKey = createHmac('sha256', secret).update(ip).digest('hex')
    const upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: body.action, code: body.code.trim().toUpperCase(), attendees: body.attendees, songs: body.songs, secret, clientKey }),
      signal: AbortSignal.timeout(20000),
    })
    if (!upstream.ok) throw new Error('upstream')
    const result = await upstream.json().catch(() => { throw new Error('Invalid upstream response') })
    if (result.ok === false) {
      const status = [400, 401, 409, 429, 503].includes(result.status) ? result.status : 502
      if (status === 429) res.setHeader('Retry-After', '900')
      return res.status(status).json({ error: result.error, closed: result.closed })
    }
    if (result.ok !== true || !result.invitation) throw new Error('invalid response')
    return res.status(200).json({ invitation: result.invitation })
  } catch (error) {
    const badJson = error instanceof SyntaxError
    return res.status(badJson ? 400 : 502).json({ error: badJson ? 'No pudimos leer los datos enviados.' : 'No pudimos confirmar el guardado. Tus datos siguen en pantalla; vuelve a intentarlo.' })
  }
}
