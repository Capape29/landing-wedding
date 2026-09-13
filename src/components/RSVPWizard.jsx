import { useState } from 'react'

const inputClass = 'w-full rounded-xl border border-[#d8c9b2] bg-white px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-[#8e5630]'
const buttonClass = 'min-h-11 rounded-full bg-[var(--kraft-dark)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8e5630]'
const emptySongs = () => Array.from({ length: 4 }, () => ({ title: '', artist: '' }))

async function request(action, code, data = {}) {
  const response = await fetch('/api/invitation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, code, ...data }),
    signal: AbortSignal.timeout(25000),
  })
  let result
  try { result = await response.json() } catch { throw new Error('El servicio no está disponible. Inténtalo más tarde.') }
  if (!response.ok) throw Object.assign(new Error(result.error || 'No pudimos guardar. Inténtalo de nuevo.'), { closed: result.closed })
  if (!result.invitation) throw new Error('No pudimos confirmar el guardado. Inténtalo de nuevo.')
  return result.invitation
}

function Feedback({ state }) {
  return <p role={state.error ? 'alert' : 'status'} className={`text-sm ${state.error ? 'text-red-700' : 'text-[#6b5b45]'}`}>{state.message}</p>
}

function closeLabel(value) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(new Date(value).getTime() - 1))
}

function RSVPWizard() {
  const [code, setCode] = useState('')
  const [invitation, setInvitation] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [songs, setSongs] = useState(emptySongs)
  const [access, setAccess] = useState({ busy: false, message: '', error: false })
  const [attendanceState, setAttendanceState] = useState({ busy: false, message: '', error: false })
  const [songsState, setSongsState] = useState({ busy: false, message: '', error: false })

  async function unlock(event) {
    event.preventDefault()
    setAccess({ busy: true, message: '', error: false })
    try {
      const result = await request('lookup', code.trim().toUpperCase())
      setInvitation(result)
      setAttendees(result.attendees)
      setSongs(emptySongs().map((song, index) => result.songs[index] || song))
      setAccess({ busy: false, message: '', error: false })
    } catch (error) {
      setAccess({ busy: false, message: error.message || 'No pudimos consultar tu invitación.', error: true })
    }
  }

  async function save(event, action) {
    event.preventDefault()
    const setState = action === 'attendance' ? setAttendanceState : setSongsState
    const selected = songs.filter(song => song.title.trim() || song.artist.trim())
    if (action === 'attendance' && attendees.some(person => typeof person.attending !== 'boolean')) {
      setState({ busy: false, error: true, message: 'Indica si asistirá cada integrante.' })
      return
    }
    if (action === 'songs' && selected.some(song => !song.title.trim() || !song.artist.trim())) {
      setState({ busy: false, error: true, message: 'Completa el título y artista de cada canción, o deja ambos campos vacíos.' })
      return
    }
    setState({ busy: true, message: '', error: false })
    try {
      const data = action === 'attendance'
        ? { attendees: attendees.map(({ id, attending }) => ({ id, attending })) }
        : { songs: selected }
      const result = await request(action, code.trim().toUpperCase(), data)
      // Merge only the saved form: a concurrent response must not erase the other draft.
      setInvitation(current => ({ ...current,
        attendanceClosed: current.attendanceClosed || result.attendanceClosed,
        songsClosed: current.songsClosed || result.songsClosed,
        ...(action === 'attendance' ? { attendanceUpdatedAt: result.attendanceUpdatedAt } : { songsUpdatedAt: result.songsUpdatedAt }),
      }))
      if (action === 'songs') setSongs(emptySongs().map((song, index) => result.songs[index] || song))
      setState({ busy: false, error: false, message: action === 'attendance' ? 'Tu respuesta de asistencia quedó guardada. Gracias por avisarnos.' : 'Tus sugerencias quedaron guardadas.' })
    } catch (error) {
      if (error.closed) setInvitation(current => ({ ...current, [error.closed === 'attendance' ? 'attendanceClosed' : 'songsClosed']: true }))
      setState({ busy: false, error: true, message: error.message || 'No pudimos confirmar el guardado. Vuelve a intentarlo.' })
    }
  }

  return (
    <div className="space-y-8 text-[#5a472f]">
      {!invitation ? (
        <form onSubmit={unlock} className="space-y-4" aria-busy={access.busy}>
          <p className="text-sm">Ingresa el código de tu invitación para confirmar asistencia y sugerir hasta cuatro canciones para tu grupo.</p>
          <label htmlFor="invitation-code" className="block text-sm font-medium">Código de invitación</label>
          <input id="invitation-code" className={inputClass} value={code} onChange={event => setCode(event.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={12} minLength={12} pattern="[A-Za-z0-9]{12}" required disabled={access.busy} aria-describedby="code-help" />
          <p id="code-help" className="text-xs">Encontrarás el código de 12 caracteres en el mensaje de tu invitación.</p>
          <button className={buttonClass} disabled={access.busy}>{access.busy ? 'Consultando…' : 'Ver mi invitación'}</button>
          <Feedback state={access} />
        </form>
      ) : (
        <>
          <div className="space-y-3 border-b border-[#e4d6bf] pb-4">
            <p className="font-serif text-2xl">{invitation.group}</p>
            <button type="button" disabled={attendanceState.busy || songsState.busy} className="text-sm underline underline-offset-4 disabled:opacity-50" onClick={() => {
              setInvitation(null); setCode(''); setAttendees([]); setSongs(emptySongs())
              setAttendanceState({ busy: false, message: '', error: false }); setSongsState({ busy: false, message: '', error: false })
            }}>Cambiar invitación</button>
          </div>
          <form onSubmit={event => save(event, 'attendance')} className="space-y-4" aria-busy={attendanceState.busy}>
            <p className="text-sm">Indica quiénes podrán acompañarnos.</p>
            <p className="text-xs">Disponible hasta: {closeLabel(invitation.attendanceClose)} (hora de Colombia).</p>
            {invitation.attendanceClosed && <p role="status" className="rounded-xl bg-[#f5ead8] p-3 text-sm">El plazo para confirmar asistencia ha terminado. Puedes consultar tu respuesta.</p>}
            <fieldset disabled={attendanceState.busy || invitation.attendanceClosed} className="space-y-4">
              <legend className="sr-only">Asistencia de los integrantes</legend>
              {attendees.map(person => (
                <fieldset key={person.id} className="rounded-xl border border-[#dcccb5] p-4">
                  <legend className="px-1 font-medium">{person.name}</legend>
                  <div className="flex flex-wrap gap-x-5 gap-y-2">
                    {[[true, 'Asistirá'], [false, 'No asistirá']].map(([value, label]) => (
                      <label key={label} className="flex min-h-11 items-center gap-2 text-sm">
                        <input type="radio" name={`attendance-${person.id}`} checked={person.attending === value} required onChange={() => {
                          setAttendees(current => current.map(item => item.id === person.id ? { ...item, attending: value } : item))
                          setAttendanceState({ busy: false, message: '', error: false })
                        }} className="h-4 w-4 accent-[#8e5630]" />{label}
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              <button className={buttonClass} disabled={attendanceState.busy || invitation.attendanceClosed}>{attendanceState.busy ? 'Guardando…' : 'Guardar asistencia'}</button>
            </fieldset>
            {invitation.attendanceUpdatedAt && <p className="text-xs">Ya tienes una respuesta guardada. {invitation.attendanceClosed ? '' : 'Puedes actualizarla hasta el cierre.'}</p>}
            <Feedback state={attendanceState} />
          </form>
        </>
      )}

      <section id="songs-section" className="scroll-mt-6 space-y-4 border-t border-[#e4d6bf] pt-8" aria-labelledby="songs-heading">
        <h2 id="songs-heading" className="font-serif text-3xl">Sugerir canciones</h2>
        <p className="text-sm">Elige hasta cuatro canciones para tu invitación. Puedes agregarlas ahora o volver después; no son necesarias para confirmar asistencia.</p>
        {!invitation ? <a href="#invitation-code" className="inline-block py-3 text-sm underline underline-offset-4">Ingresa tu código arriba para sugerir canciones</a> : (
          <form onSubmit={event => save(event, 'songs')} className="space-y-4" aria-busy={songsState.busy}>
            <p className="text-xs">Disponible hasta: {closeLabel(invitation.songsClose)} (hora de Colombia).</p>
            {invitation.songsClosed && <p role="status" className="rounded-xl bg-[#f5ead8] p-3 text-sm">El plazo para sugerir canciones ha terminado. Puedes consultar tu selección.</p>}
            <fieldset disabled={songsState.busy || invitation.songsClosed} className="space-y-4">
              <legend className="sr-only">Hasta cuatro canciones</legend>
              {songs.map((song, index) => (
                <fieldset key={index} className="space-y-3 rounded-xl border border-[#dcccb5] p-4">
                  <legend className="px-1 text-sm font-medium">Canción {index + 1}</legend>
                  {['title', 'artist'].map(key => (
                    <div key={key} className="space-y-1">
                      <label htmlFor={`song-${index}-${key}`} className="block text-sm">{key === 'title' ? 'Título' : 'Artista'}</label>
                      <input id={`song-${index}-${key}`} className={inputClass} value={song[key]} maxLength={150} onChange={event => {
                        setSongs(current => current.map((item, i) => i === index ? { ...item, [key]: event.target.value } : item))
                        setSongsState({ busy: false, message: '', error: false })
                      }} />
                    </div>
                  ))}
                  <button type="button" className="min-h-11 text-sm underline underline-offset-4" onClick={() => {
                    setSongs(current => current.map((item, i) => i === index ? { title: '', artist: '' } : item))
                    setSongsState({ busy: false, message: '', error: false })
                  }}>Quitar canción {index + 1}</button>
                </fieldset>
              ))}
              <button className={buttonClass} disabled={songsState.busy || invitation.songsClosed}>{songsState.busy ? 'Guardando…' : 'Guardar canciones'}</button>
            </fieldset>
            {invitation.songsUpdatedAt && <p className="text-xs">Ya tienes una selección guardada. {invitation.songsClosed ? '' : 'Puedes actualizarla hasta el cierre.'}</p>}
            <Feedback state={songsState} />
          </form>
        )}
      </section>
    </div>
  )
}

export default RSVPWizard
