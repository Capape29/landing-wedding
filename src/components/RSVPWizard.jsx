import { useMemo, useState } from 'react'

const GOOGLE_SCRIPT_URL =
  import.meta.env.VITE_GOOGLE_SCRIPT_URL ??
  'https://script.google.com/macros/s/REEMPLAZAR_CON_TU_SCRIPT_ID/exec'

const GOOGLE_CALENDAR_URL =
  'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Boda+de+la+Pareja&dates=20270921T160000Z/20270921T220000Z&details=Nos+encantar%C3%ADa+contar+contigo+en+nuestro+d%C3%ADa+especial.&location=Por+confirmar'

const guestCountByMode = {
  Soltero: 1,
  Pareja: 2,
  Familia: 4,
}

const initialSongs = Array.from({ length: 4 }, () => ({ title: '', artist: '' }))

function RSVPWizard() {
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [formData, setFormData] = useState({
    guestName: '',
    mode: 'Soltero',
    attendees: [{ name: '', attending: true }],
    songs: initialSongs,
  })

  const progress = useMemo(() => (step / 4) * 100, [step])

  const goToNextStep = () => setStep((current) => Math.min(4, current + 1))
  const goToPreviousStep = () => setStep((current) => Math.max(1, current - 1))

  const handleModeChange = (mode) => {
    const totalGuests = guestCountByMode[mode]
    setFormData((current) => {
      const updatedAttendees = Array.from({ length: totalGuests }, (_, index) => {
        const existing = current.attendees[index]
        return (
          existing ?? {
            name: index === 0 ? current.guestName : '',
            attending: true,
          }
        )
      })

      return {
        ...current,
        mode,
        attendees: updatedAttendees,
      }
    })
  }

  const handleFirstStepSubmit = (event) => {
    event.preventDefault()
    if (!formData.guestName.trim()) {
      return
    }

    setFormData((current) => {
      const attendees = [...current.attendees]
      attendees[0] = {
        ...(attendees[0] ?? { attending: true }),
        name: current.guestName.trim(),
      }
      return { ...current, attendees }
    })

    goToNextStep()
  }

  const handleAttendeeChange = (index, key, value) => {
    setFormData((current) => {
      const attendees = current.attendees.map((attendee, attendeeIndex) =>
        attendeeIndex === index ? { ...attendee, [key]: value } : attendee,
      )

      return { ...current, attendees }
    })
  }

  const handleSongChange = (index, key, value) => {
    setFormData((current) => {
      const songs = current.songs.map((song, songIndex) =>
        songIndex === index ? { ...song, [key]: value } : song,
      )
      return { ...current, songs }
    })
  }

  const areSongsComplete = formData.songs.every(
    (song) => song.title.trim() && song.artist.trim(),
  )

  const handleFinalSubmit = async () => {
    if (!areSongsComplete) {
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    const payload = {
      guestName: formData.guestName.trim(),
      mode: formData.mode,
      attendees: formData.attendees.map((attendee) => ({
        name: attendee.name.trim(),
        attending: attendee.attending,
      })),
      songs: formData.songs.map((song, index) => ({
        order: index + 1,
        title: song.title.trim(),
        artist: song.artist.trim(),
      })),
      submittedAt: new Date().toISOString(),
    }

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error('Error al enviar RSVP')
      }

      goToNextStep()
    } catch {
      setSubmitError(
        'No pudimos enviar tu confirmación en este momento. Inténtalo nuevamente.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h2 className="font-serif text-3xl text-[#4e3f2d]">Confirma tu asistencia</h2>
        <p className="text-sm text-[#6b5b45] sm:text-base">
          Completa este wizard en pocos pasos para confirmar y ayudarnos con la
          playlist.
        </p>
      </header>

      <div className="space-y-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#e8dcc8]">
          <div
            className="h-full rounded-full bg-[#c5ab84] transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#8c7553]">
          Paso {step} de 4
        </p>
      </div>

      {step === 1 && (
        <form className="space-y-4 animate-fade-in" onSubmit={handleFirstStepSubmit}>
          <div className="space-y-2">
            <label htmlFor="guest-name" className="text-sm font-medium text-[#5a472f]">
              Nombre del invitado o familia
            </label>
            <input
              id="guest-name"
              type="text"
              value={formData.guestName}
              onChange={(event) =>
                setFormData((current) => ({ ...current, guestName: event.target.value }))
              }
              required
              className="w-full rounded-xl border border-[#d8c9b2] bg-white px-4 py-3 text-sm outline-none transition-all focus:ring-2 focus:ring-[#ccb592]"
              placeholder="Ej: Familia Pérez"
            />
          </div>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium text-[#5a472f]">Modalidad</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {Object.keys(guestCountByMode).map((mode) => (
                <label
                  key={mode}
                  className="flex cursor-pointer items-center justify-between rounded-xl border border-[#d8c9b2] bg-white px-3 py-2 text-sm"
                >
                  <span>{mode}</span>
                  <input
                    type="radio"
                    name="mode"
                    checked={formData.mode === mode}
                    onChange={() => handleModeChange(mode)}
                  />
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            className="rounded-full bg-[#c5ab84] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[#b99d74]"
          >
            Siguiente
          </button>
        </form>
      )}

      {step === 2 && (
        <section className="space-y-4 animate-fade-in">
          {formData.attendees.map((attendee, index) => (
            <div
              key={`${index}-${attendee.name}`}
              className="space-y-3 rounded-2xl border border-[#dcccb5] bg-[#fffdf9] p-4"
            >
              <div className="space-y-1">
                <label className="text-sm font-medium text-[#5a472f]" htmlFor={`attendee-${index}`}>
                  Integrante {index + 1}
                </label>
                <input
                  id={`attendee-${index}`}
                  type="text"
                  value={attendee.name}
                  onChange={(event) =>
                    handleAttendeeChange(index, 'name', event.target.value)
                  }
                  placeholder={index === 0 ? 'Invitado principal' : 'Nombre del acompañante'}
                  className="w-full rounded-lg border border-[#d8c9b2] bg-white px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-[#ccb592]"
                />
              </div>

              <label className="inline-flex items-center gap-3 text-sm text-[#5a472f]">
                <input
                  type="checkbox"
                  checked={attendee.attending}
                  onChange={(event) =>
                    handleAttendeeChange(index, 'attending', event.target.checked)
                  }
                  className="h-4 w-4 accent-[#c5ab84]"
                />
                Confirmo asistencia
              </label>
            </div>
          ))}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={goToPreviousStep}
              className="rounded-full border border-[#c5ab84] px-5 py-2 text-sm font-medium text-[#6b5b45] transition-all hover:bg-[#f5ead8]"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={goToNextStep}
              className="rounded-full bg-[#c5ab84] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[#b99d74]"
            >
              Siguiente
            </button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-4 animate-fade-in">
          <p className="rounded-xl bg-[#f5ead8] p-3 text-sm text-[#6b5b45]">
            Modo DJ: completa obligatoriamente 4 canciones para la fiesta.
          </p>

          {formData.songs.map((song, index) => (
            <div
              key={`song-${index}`}
              className="grid gap-3 rounded-2xl border border-[#dcccb5] bg-[#fffdf9] p-4 sm:grid-cols-2"
            >
              <input
                type="text"
                value={song.title}
                onChange={(event) => handleSongChange(index, 'title', event.target.value)}
                placeholder={`Canción ${index + 1}`}
                className="w-full rounded-lg border border-[#d8c9b2] bg-white px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-[#ccb592]"
                required
              />
              <input
                type="text"
                value={song.artist}
                onChange={(event) => handleSongChange(index, 'artist', event.target.value)}
                placeholder="Artista"
                className="w-full rounded-lg border border-[#d8c9b2] bg-white px-3 py-2 text-sm outline-none transition-all focus:ring-2 focus:ring-[#ccb592]"
                required
              />
            </div>
          ))}

          {submitError && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {submitError}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={goToPreviousStep}
              disabled={isSubmitting}
              className="rounded-full border border-[#c5ab84] px-5 py-2 text-sm font-medium text-[#6b5b45] transition-all hover:bg-[#f5ead8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleFinalSubmit}
              disabled={isSubmitting || !areSongsComplete}
              className="rounded-full bg-[#c5ab84] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[#b99d74] disabled:cursor-not-allowed disabled:bg-[#d9c8ad]"
            >
              {isSubmitting ? 'Enviando...' : 'Confirmar RSVP'}
            </button>
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-4 rounded-2xl border border-[#dcccb5] bg-[#fffdf9] p-5 text-center animate-fade-in">
          <div className="animate-pop text-4xl">🎉</div>
          <h3 className="font-serif text-2xl text-[#4e3f2d]">¡Gracias por confirmar!</h3>
          <p className="text-sm text-[#6b5b45]">
            Te esperamos con mucha ilusión. Este es el resumen de tu RSVP:
          </p>

          <dl className="space-y-2 rounded-xl bg-[#f9f2e7] p-4 text-left text-sm text-[#5a472f]">
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Invitado principal</dt>
              <dd>{formData.guestName}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Modalidad</dt>
              <dd>{formData.mode}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="font-semibold">Asistentes confirmados</dt>
              <dd>{formData.attendees.filter((attendee) => attendee.attending).length}</dd>
            </div>
          </dl>

          <a
            href={GOOGLE_CALENDAR_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full bg-[#c5ab84] px-6 py-2 text-sm font-semibold text-white transition-all hover:bg-[#b99d74]"
          >
            Agendar en Google Calendar
          </a>
        </section>
      )}
    </div>
  )
}

export default RSVPWizard
