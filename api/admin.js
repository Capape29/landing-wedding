import { waitUntil } from '@vercel/functions'
import { database } from '../server/database.js'
import { syncSheets } from '../server/sheets-mirror.js'
import { createInvitation, updateInvitation, deleteInvitation, loginLimit, passwordMatches, sessionToken, validSession } from '../server/admin.js'

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  const secret = process.env.ADMIN_PASSWORD
  if (!secret || secret.length < 20) return res.status(503).json({ error: 'El acceso de administración aún no está configurado.' })
  if (!['GET', 'POST'].includes(req.method)) return res.status(405).end()
  const cookie = (value, age) => res.setHeader('Set-Cookie', `wedding_admin=${value}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=${age}`)
  try {
    let body = {}
    if (req.method === 'POST') {
      const origin = req.headers.origin
      if (!origin || new URL(origin).host !== req.headers.host || !req.headers['content-type']?.startsWith('application/json')) return res.status(403).json({ error: 'Solicitud no autorizada.' })
      if (Number(req.headers['content-length'] || 0) > 16000) return res.status(413).json({ error: 'Solicitud demasiado grande.' })
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
      if (!body || JSON.stringify(body).length > 16000) return res.status(400).json({ error: 'Solicitud inválida.' })
      if (body.action === 'logout') { cookie('', 0); return res.json({ ok: true }) }
      if (body.action === 'login') {
        await loginLimit(database(), req.headers['x-vercel-forwarded-for'] || req.socket?.remoteAddress || 'unknown', secret)
        if (!passwordMatches(body.password, secret)) return res.status(401).json({ error: 'Contraseña incorrecta.' })
        cookie(sessionToken(secret), 28800)
        return res.json({ ok: true })
      }
    }
    const token = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('wedding_admin='))?.slice(14)
    if (!validSession(token, secret)) return res.status(401).json({ error: 'Inicia sesión para continuar.' })
    const pool = database()
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM wedding_invitations ORDER BY group_name, id')
      return res.json({ invitations: rows })
    }
    if (!['create', 'update', 'delete'].includes(body.action)) return res.status(400).json({ error: 'Acción inválida.' })
    const operation = { create: createInvitation, update: updateInvitation, delete: deleteInvitation }[body.action]
    const invitation = await operation(pool, body)
    waitUntil(syncSheets(pool).catch(() => console.error('admin_sheets_mirror_pending')))
    return res.status(body.action === 'create' ? 201 : 200).json({ invitation })
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return res.status(400).json({ error: 'Solicitud inválida.' })
    return res.status(error.status || 503).json({ error: error.status ? error.message : 'No pudimos completar la operación. Actualiza la lista antes de volver a guardar.' })
  }
}
