import { createHmac } from 'node:crypto'
import { waitUntil } from '@vercel/functions'
import { database } from '../server/database.js'
import { handleInvitation } from '../server/invitation-store.js'
import { syncSheets } from '../server/sheets-mirror.js'

export default async function handler(req, res) {
  const started = Date.now()
  let phase = 'validation'
  let upstreamStatus
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido.' })
  }
  if (process.env.RSVP_STORAGE === 'postgres') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      if (!body || JSON.stringify(body).length > 12000) return res.status(400).json({ error: 'Revisa los datos de tu invitación.' })
      if (!process.env.GOOGLE_SCRIPT_SECRET) return res.status(503).json({ error: 'Servicio no configurado.' })
      const ip = String(req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0].trim()
      const key = createHmac('sha256', process.env.GOOGLE_SCRIPT_SECRET).update(ip).digest('hex')
      const pool = database()
      const invitation = await handleInvitation(pool, body, key)
      res.status(200).json({ invitation })
      waitUntil(syncSheets(pool).catch(() => { console.error('sheets_mirror_pending') }))
      return
    } catch (error) {
      const status = error.status || (error instanceof SyntaxError ? 400 : 503)
      if (status === 429) res.setHeader('Retry-After', '900')
      return res.status(status).json({ error: error.status ? error.message : 'No pudimos confirmar el guardado. Tus cambios siguen aquí.', closed: error.closed })
    }
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
    phase = 'google_fetch'
    const signal = AbortSignal.timeout(45000)
    let upstream = await fetch(url, {
      method: 'POST',
      redirect: 'manual',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: body.action, code: body.code.trim().toUpperCase(), attendees: body.attendees, songs: body.songs, secret, clientKey }),
      signal,
    })
    upstreamStatus = upstream.status
    console.info(JSON.stringify({ event: 'invitation_google_post', status: upstream.status, elapsedMs: Date.now() - started }))
    if ([302, 303].includes(upstream.status)) {
      const location = new URL(upstream.headers.get('location'), url)
      if (location.protocol !== 'https:' || location.hostname !== 'script.googleusercontent.com' || location.username || location.password || location.port) throw new Error('Unexpected redirect')
      await upstream.body?.cancel()
      phase = 'google_download'
      // Only retry the response download. Never repeat a POST that may have committed.
      for (let attempt = 0; attempt < 2; attempt++) {
        const downloadStarted = Date.now()
        upstream = await fetch(location, { method: 'GET', redirect: 'follow', signal })
        upstreamStatus = upstream.status
        console.info(JSON.stringify({ event: 'invitation_google_download', attempt: attempt + 1, status: upstream.status, elapsedMs: Date.now() - downloadStarted }))
        if (upstream.status !== 404 || attempt === 1) break
        await upstream.body?.cancel()
      }
    }
    if (!upstream.ok) throw new Error('upstream')
    phase = 'google_response'
    const result = await upstream.json().catch(() => { throw new Error('Invalid upstream response') })
    if (result.ok === false) {
      const status = [400, 401, 409, 429, 503].includes(result.status) ? result.status : 502
      if (status === 429) res.setHeader('Retry-After', '900')
      return res.status(status).json({ error: result.error, closed: result.closed })
    }
    if (result.ok !== true || !result.invitation) throw new Error('invalid response')
    return res.status(200).json({ invitation: result.invitation })
  } catch (error) {
    // Diagnostics only: never log URLs, secrets, codes, bodies, or raw error messages.
    console.error(JSON.stringify({ event: 'invitation_request_failed', phase, elapsedMs: Date.now() - started, upstreamStatus,
      errorType: error.name, networkCode: /^[A-Z_0-9]+$/.test(error.cause?.code || '') ? error.cause.code : undefined }))
    const badJson = error instanceof SyntaxError
    return res.status(badJson ? 400 : 502).json({ error: badJson ? 'No pudimos leer los datos enviados.' : 'No pudimos confirmar el guardado. Tus datos siguen en pantalla; vuelve a intentarlo.' })
  }
}
