import { transaction } from './database.js'

function fail(status, message, closed) { throw Object.assign(new Error(message), { status, closed }) }
function iso(value) { return value ? new Date(value).toISOString() : null }

export function invitationView(row, config, now) {
  return {
    id: row.id, group: row.group_name,
    attendees: row.members.map(member => ({ ...member, attending: row.attendance.find(answer => answer.id === member.id)?.attending ?? null })),
    songs: row.songs, attendanceUpdatedAt: iso(row.attendance_updated_at), songsUpdatedAt: iso(row.songs_updated_at),
    attendanceClose: iso(config.attendance_close), songsClose: iso(config.songs_close),
    attendanceClosed: now >= new Date(config.attendance_close), songsClosed: now >= new Date(config.songs_close),
  }
}

export async function handleInvitation(pool, payload, clientKey) {
  if (!payload || !['lookup', 'attendance', 'songs'].includes(payload.action) || typeof payload.code !== 'string' || !/^[A-Z0-9]{6,32}$/.test(payload.code.trim().toUpperCase())) fail(400, 'Revisa el código de invitación.')
  if (!/^[a-f0-9]{64}$/.test(clientKey)) fail(400, 'Solicitud inválida.')
  // Persist the limit independently so failed codes/validation also consume an attempt.
  const { rows: [bucket] } = await pool.query(`INSERT INTO wedding_rate_limits(client_key,count,expires_at)
    VALUES ($1,1,now()+interval '15 minutes') ON CONFLICT (client_key) DO UPDATE SET
    count=CASE WHEN wedding_rate_limits.expires_at<=now() THEN 1 ELSE wedding_rate_limits.count+1 END,
    expires_at=CASE WHEN wedding_rate_limits.expires_at<=now() THEN now()+interval '15 minutes' ELSE wedding_rate_limits.expires_at END RETURNING count`, [clientKey])
  if (bucket.count > 60) fail(429, 'Has realizado muchos intentos. Espera 15 minutos e inténtalo de nuevo.')
  return transaction(pool, async client => {
    const { rows: [config] } = await client.query('SELECT *, clock_timestamp() AS current_time FROM wedding_config WHERE singleton=true')
    if (!config) fail(503, 'No se ha configurado el cierre. Contacta a los organizadores.')
    const { rows: [row] } = await client.query('SELECT * FROM wedding_invitations WHERE code=$1 AND active=true FOR UPDATE', [payload.code.trim().toUpperCase()])
    if (!row) fail(401, 'No encontramos esa invitación. Revisa tu código.')
    // Evaluate the clock after acquiring the row lock, including time spent waiting.
    const { rows: [clock] } = await client.query('SELECT clock_timestamp() AS current_time')
    const now = new Date(clock.current_time)
    const view = invitationView(row, config, now)
    if (payload.action === 'lookup') return view
    if (payload.action === 'attendance') {
      if (view.attendanceClosed) fail(409, 'El plazo para confirmar asistencia ha terminado.', 'attendance')
      const answers = payload.attendees
      if (!Array.isArray(answers) || answers.length !== row.members.length || new Set(answers.map(a => a?.id)).size !== row.members.length || answers.some(a => !a || typeof a.attending !== 'boolean' || !row.members.some(m => m.id === a.id))) fail(400, 'Indica si asistirá cada integrante de tu invitación.')
      row.attendance = answers.map(({ id, attending }) => ({ id, attending }))
      row.attendance_updated_at = now
      await client.query('UPDATE wedding_invitations SET attendance=$2::jsonb,attendance_updated_at=$3 WHERE id=$1', [row.id, JSON.stringify(row.attendance), now])
    } else {
      if (view.songsClosed) fail(409, 'El plazo para sugerir canciones ha terminado.', 'songs')
      if (!Array.isArray(payload.songs) || payload.songs.length > 4 || payload.songs.some(s => !s || typeof s.title !== 'string' || typeof s.artist !== 'string' || !s.title.trim() || !s.artist.trim() || s.title.length > 150 || s.artist.length > 150)) fail(400, 'Puedes guardar hasta cuatro canciones con título y artista (máximo 150 caracteres por campo).')
      row.songs = payload.songs.map(s => ({ title: s.title.trim(), artist: s.artist.trim() }))
      row.songs_updated_at = now
      await client.query('UPDATE wedding_invitations SET songs=$2::jsonb,songs_updated_at=$3 WHERE id=$1', [row.id, JSON.stringify(row.songs), now])
    }
    return invitationView(row, config, now)
  })
}
