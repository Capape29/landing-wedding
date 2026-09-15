import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto'

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
