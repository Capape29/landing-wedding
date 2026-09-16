import SongCollection from './SongCollection'
import { hasSong, normalizeSongs, sameSongs } from '../../shared/songs.js'
import { request } from '../invitationRequest'
import { useState } from 'react'

const inputClass = 'w-full rounded-xl border border-[#d8c9b2] bg-white px-4 py-3 text-sm focus-visible:outline-2 focus-visible:outline-[#8e5630]'
const buttonClass = 'min-h-11 rounded-full bg-[var(--kraft-dark)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--charcoal)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8e5630]'
const saveButtonClass = 'min-h-11 rounded-xl bg-[var(--kraft-dark)] px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8e5630]'
const emptySongs = () => Array.from({ length: 4 }, () => ({ title: '', artist: '' }))

function Feedback({ state }) {
  if (!state.busy && !state.message) return null
  return <div role={state.error ? 'alert' : 'status'} className={`flex items-center gap-3 rounded-xl border-2 p-4 text-sm ${state.error ? 'border-red-200 bg-red-50 text-red-800' : state.busy ? 'border-[#dcccb5] bg-[#f7f3ee] text-[#5a472f]' : 'border-green-600 bg-green-50 text-green-900'}`}>
    {state.busy && <span aria-hidden="true" className="h-5 w-5 shrink-0 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />}
    {!state.busy && <span aria-hidden="true" className="text-3xl font-bold">{state.error ? '!' : '✓'}</span>}
    <div>{!state.busy && <p className="text-lg font-bold">{state.error ? 'No se pudo completar' : '¡Listo! Guardado'}</p>}<p>{state.busy ? (state.message || 'Estamos procesando tu solicitud. Espera un momento…') : state.message}</p></div>
  </div>
}

function SavedStatus({ saved, dirty, busy, title }) {
  if (busy || (!saved && !dirty)) return null
  return <p role="status" aria-live="polite" className={`min-w-0 rounded-lg px-3 py-2 text-xs leading-relaxed ${saved && !dirty ? 'bg-green-50 text-green-900' : 'bg-amber-50 text-amber-900'}`}>
    {saved && !dirty ? '\u2713 ' + title : 'Cambios sin guardar'}
  </p>
}

function RSVPWizard() {
  const [code, setCode] = useState('')
  const [invitation, setInvitation] = useState(null)
  const [attendees, setAttendees] = useState([])
  const [songs, setSongs] = useState(emptySongs)
  const [songDraft, setSongDraft] = useState(false)
  const [access, setAccess] = useState({ busy: false, message: '', error: false })
  const [attendanceState, setAttendanceState] = useState({ busy: false, message: '', error: false })
  const [songsState, setSongsState] = useState({ busy: false, message: '', error: false })
  const attendanceDirty = !!invitation && JSON.stringify(attendees) !== JSON.stringify(invitation.attendees)
  const songsDirty = !!invitation && !sameSongs(songs.filter(hasSong), invitation.songs)

  async function unlock(event) {
    event.preventDefault()
    setAccess({ busy: true, message: '', error: false })
    try {
      const result = await request('lookup', code.trim().toUpperCase())
      setInvitation(result)
      setSongDraft(false)
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
    const selected = songs.filter(hasSong)
    if (action === 'songs' && songDraft) {
      setState({ busy: false, error: true, message: 'Agrega la canción a la lista o termina el cambio antes de guardar.' })
      return
    }
    if (action === 'attendance' && attendees.some(person => typeof person.attending !== 'boolean')) {
      setState({ busy: false, error: true, message: 'Indica si asistirá cada integrante.' })
      return
    }
    if (action === 'songs') {
      try { normalizeSongs(selected) } catch (error) { setState({ busy: false, error: true, message: error.message }); return }
    }
    setState({ busy: true, message: '', error: false })
    try {
      const data = action === 'attendance'
        ? { attendees: attendees.map(({ id, attending }) => ({ id, attending })) }
        : { songs: selected }
      const result = await request(action, code.trim().toUpperCase(), data, () => setState({ busy: true, error: false, message: 'Estamos comprobando si tus cambios quedaron guardados…' }))
      // Merge only the saved form: a concurrent response must not erase the other draft.
      setInvitation(current => ({ ...current,
        attendanceClosed: current.attendanceClosed || result.attendanceClosed,
        songsClosed: current.songsClosed || result.songsClosed,
        ...(action === 'attendance' ? { attendanceUpdatedAt: result.attendanceUpdatedAt, attendees: result.attendees } : { songsUpdatedAt: result.songsUpdatedAt, songs: result.songs }),
      }))
      if (action === 'songs') setSongs(emptySongs().map((song, index) => result.songs[index] || song))
      else setAttendees(result.attendees)
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
          <input id="invitation-code" className={inputClass} value={code} onChange={event => setCode(event.target.value)} autoCapitalize="characters" autoComplete="off" spellCheck={false} maxLength={32} minLength={6} pattern="[A-Za-z0-9]{6,32}" required disabled={access.busy} aria-describedby="code-help" />
          <p id="code-help" className="text-xs">Encontrarás tu código en el mensaje de la invitación.</p>
          <button className={buttonClass} disabled={access.busy}>{access.busy ? 'Consultando…' : 'Ver mi invitación'}</button>
          <Feedback state={access} />
        </form>
      ) : (
        <>
          <div className="space-y-3 border-b border-[#e4d6bf] pb-4">
            <p className="font-serif text-2xl">{invitation.group}</p>
            <button type="button" disabled={attendanceState.busy || songsState.busy} className="text-sm underline underline-offset-4 disabled:opacity-50" onClick={() => {
              setInvitation(null); setCode(''); setAttendees([]); setSongs(emptySongs()); setSongDraft(false)
              setAttendanceState({ busy: false, message: '', error: false }); setSongsState({ busy: false, message: '', error: false })
            }}>Cambiar invitación</button>
          </div>
          <form onSubmit={event => save(event, 'attendance')} className="space-y-4" aria-busy={attendanceState.busy}>
            <p className="text-sm">Indica quiénes podrán acompañarnos.</p>
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
              <div className="grid grid-cols-2 items-center gap-2">
              <button className={saveButtonClass} disabled={attendanceState.busy || invitation.attendanceClosed || (!!invitation.attendanceUpdatedAt && !attendanceDirty)}>{attendanceState.busy ? 'Guardando…' : 'Guardar asistencia'}</button>
              <SavedStatus saved={invitation.attendanceUpdatedAt} dirty={attendanceDirty} busy={attendanceState.busy} title="Tu respuesta ya fue enviada." />
              </div>
            </fieldset>
            {(attendanceState.error || (attendanceState.busy && attendanceState.message)) && <Feedback state={attendanceState} />}
          </form>
        </>
      )}

      <section id="songs-section" className="scroll-mt-6 border-t border-[#e4d6bf] pt-8" aria-labelledby="songs-heading">
        <div className="space-y-4">
        <div className="flex items-center justify-center gap-3">
          <h2 id="songs-heading" className="min-w-0 text-center font-script text-4xl leading-tight text-[var(--gold)] sm:text-5xl">¡DJ, pon mi canción!</h2>
          <img src="/images/disco%20de%20vinilo.svg" alt="" className="h-12 w-12 shrink-0 object-contain sm:h-14 sm:w-14" />
        </div>
        {!invitation && <p className="font-serif text-lg leading-relaxed">La pista de baile nos espera y queremos saber cuál es esa canción que no puede faltar.</p>}
        <p className="text-sm">{invitation ? 'Elige hasta 4 canciones.' : 'Ingresa el código de tu invitación para sugerir hasta cuatro canciones. No necesitas confirmar asistencia para hacerlo.'}</p>
        {!invitation ? (
          <button type="button" className={buttonClass} disabled={access.busy} onClick={() => {
            const input = document.getElementById('invitation-code')
            input?.focus({ preventScroll: true })
            input?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'center' })
          }}>
            Ingresar código
          </button>
        ) : (
          <form onSubmit={event => save(event, 'songs')} className="space-y-4" aria-busy={songsState.busy}>
            {invitation.songsClosed && <p role="status" className="rounded-xl bg-[#f5ead8] p-3 text-sm">El plazo para sugerir canciones ha terminado. Puedes consultar tu selección.</p>}
            <fieldset disabled={songsState.busy || invitation.songsClosed} className="space-y-4">
              <legend className="sr-only">Hasta cuatro canciones</legend>
              <SongCollection songs={songs.filter(hasSong)} dirty={songsDirty} onDraftChange={setSongDraft} code={code.trim().toUpperCase()} disabled={songsState.busy} closed={invitation.songsClosed} onChange={value => {
                setSongs(value)
                setSongsState({ busy: false, message: '', error: false })
              }} />
              <div className="grid grid-cols-2 items-center gap-2">
              <button className={saveButtonClass} disabled={songDraft || songsState.busy || invitation.songsClosed || (!!invitation.songsUpdatedAt && !songsDirty)}>{songsState.busy ? 'Guardando…' : 'Guardar canciones'}</button>
              <SavedStatus saved={invitation.songsUpdatedAt} dirty={songsDirty || songDraft} busy={songsState.busy} title="Tus canciones ya fueron enviadas." />
              </div>
            </fieldset>
            {(songsState.error || (songsState.busy && songsState.message)) && <Feedback state={songsState} />}
          </form>
        )}
        </div>
      </section>
    </div>
  )
}

export default RSVPWizard
