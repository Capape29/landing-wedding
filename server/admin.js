import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'
import { transaction } from './database.js'

const fail = (status, message) => { throw Object.assign(new Error(message), { status }) }
const sign = (value, secret) => createHmac('sha256', secret).update(value).digest('hex')
export function passwordMatches(value, secret) {
  return typeof value === 'string' && timingSafeEqual(Buffer.from(sign(value, secret)), Buffer.from(sign(secret, secret)))
}
export function sessionToken(secret, now = Date.now()) {
  const expires = String(now + 8 * 60 * 60 * 1000)
  return `${expires}.${sign(expires, secret)}`
}
export function validSession(token, secret, now = Date.now()) {
  if (typeof token !== 'string' || !/^\d{13}\.[a-f0-9]{64}$/.test(token)) return false
  const [expires, signature] = token.split('.')
  return Number(expires) > now && timingSafeEqual(Buffer.from(signature), Buffer.from(sign(expires, secret)))
}
export async function loginLimit(pool, ip, secret) {
  const key = sign(`admin:${ip}`, secret)
  const { rows: [row] } = await pool.query(`INSERT INTO wedding_rate_limits(client_key,count,expires_at)
    VALUES($1,1,now()+interval '15 minutes') ON CONFLICT(client_key) DO UPDATE SET
    count=CASE WHEN wedding_rate_limits.expires_at<=now() THEN 1 ELSE wedding_rate_limits.count+1 END,
    expires_at=CASE WHEN wedding_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE wedding_rate_limits.expires_at END RETURNING count`, [key])
  if (row.count > 10) fail(429, 'Demasiados intentos. Espera 15 minutos.')
}
export async function createInvitation(pool, payload) {
  const group = typeof payload.group === 'string' ? payload.group.trim() : ''
  const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : ''
  if (!group || group.length > 150 || !/^[A-Z0-9]{6,32}$/.test(code)) fail(400, 'Indica la familia y un código de 6 a 32 letras o números.')
  if (!Array.isArray(payload.members) || !payload.members.length || payload.members.length > 30 || payload.members.some(name => typeof name !== 'string' || !name.trim() || name.trim().length > 150)) fail(400, 'Agrega entre 1 y 30 integrantes con nombres válidos.')
  const members = payload.members.map(name => ({ id: randomUUID(), name: name.trim() }))
  try {
    const { rows: [row] } = await pool.query('INSERT INTO wedding_invitations(id,group_name,code,members) VALUES($1,$2,$3,$4::jsonb) RETURNING *', [randomUUID(), group, code, JSON.stringify(members)])
    return row
  } catch (error) {
    if (error.code === '23505') fail(409, 'Ese código ya existe. Usa otro o revisa la lista si ya guardaste esta invitación.')
    throw error
  }
}

export async function updateInvitation(pool, payload) {
  const group = typeof payload.group === 'string' ? payload.group.trim() : ''
  const code = typeof payload.code === 'string' ? payload.code.trim().toUpperCase() : ''
  if (typeof payload.id !== 'string' || !payload.id || !group || group.length > 150 || !/^[A-Z0-9]{6,32}$/.test(code)) fail(400, 'Indica la invitación, familia y un código válido.')
  if (!Array.isArray(payload.members) || !payload.members.length || payload.members.length > 30 || payload.members.some(m => !m || typeof m.name !== 'string' || !m.name.trim() || m.name.trim().length > 150 || (m.id !== undefined && typeof m.id !== 'string'))) fail(400, 'Agrega entre 1 y 30 integrantes con nombres válidos.')
  try {
    return await transaction(pool, async client => {
      const { rows: [existing] } = await client.query('SELECT * FROM wedding_invitations WHERE id=$1 FOR UPDATE', [payload.id])
      if (!existing) fail(404, 'La invitación ya no existe. Actualiza la lista.')
      const known = new Set(existing.members.map(m => m.id))
      const used = new Set()
      const members = payload.members.map(m => {
        if (m.id !== undefined && (!known.has(m.id) || used.has(m.id))) fail(400, 'Los integrantes no corresponden a esta invitación.')
        const id = m.id ?? randomUUID()
        used.add(id)
        return { id, name: m.name.trim() }
      })
      const attendance = existing.attendance.filter(a => used.has(a.id))
      const { rows: [row] } = await client.query(`UPDATE wedding_invitations SET group_name=$2,code=$3,members=$4::jsonb,attendance=$5::jsonb WHERE id=$1 RETURNING *`, [payload.id, group, code, JSON.stringify(members), JSON.stringify(attendance)])
      return row
    })
  } catch (error) {
    if (error.code === '23505') fail(409, 'Ese código ya existe. Usa otro.')
    throw error
  }
}

export async function deleteInvitation(pool, payload) {
  if (typeof payload.id !== 'string' || !payload.id) fail(400, 'Indica la invitación que deseas eliminar.')
  const { rows: [row] } = await pool.query('DELETE FROM wedding_invitations WHERE id=$1 RETURNING id', [payload.id])
  if (!row) fail(404, 'La invitación ya no existe. Actualiza la lista.')
  return row
}
