import { sameSongs } from '../shared/songs.js'
async function send(action, code, data = {}) {
  const response = await fetch('/api/invitation', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, code, ...data }), signal: AbortSignal.timeout(55000),
  })
  const result = await response.json()
  if (!response.ok) throw Object.assign(new Error(result.error || 'No pudimos completar la solicitud.'), { status: response.status, closed: result.closed })
  if (!result.invitation) throw new Error('Respuesta incompleta del servidor.')
  return result.invitation
}

export async function request(action, code, data = {}, onVerify = () => {}) {
  try { return await send(action, code, data) } catch (error) {
    if (action === 'lookup' || (error.status && error.status < 500)) throw error
    onVerify()
    try {
      const stored = await send('lookup', code)
      const matches = action === 'songs'
        ? stored.songsUpdatedAt && sameSongs(stored.songs, data.songs)
        : stored.attendanceUpdatedAt && stored.attendees.length === data.attendees.length && data.attendees.every(person => stored.attendees.some(saved => saved.id === person.id && saved.attending === person.attending))
      if (matches) return stored
    } catch { /* A failed verification cannot establish whether the write completed. */ }
    throw new Error('No pudimos verificar si se guardó. Tus cambios siguen aquí. Consulta de nuevo tu invitación antes de volver a enviarlos.')
  }
}
