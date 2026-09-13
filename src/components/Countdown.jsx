import { useEffect, useState } from 'react'

const weddingDate = new Date('2026-10-22T16:00:00-05:00').getTime()

function getTimeLeft() {
  const distance = Math.max(0, weddingDate - Date.now())
  return [
    Math.floor(distance / 86400000),
    Math.floor((distance % 86400000) / 3600000),
    Math.floor((distance % 3600000) / 60000),
    Math.floor((distance % 60000) / 1000),
  ]
}

function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft)

  useEffect(() => {
    const timer = window.setInterval(() => setTimeLeft(getTimeLeft()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  return (
    <section className="px-6 py-12 text-center">
      <blockquote className="mx-auto mb-8 max-w-md font-serif text-sm italic leading-relaxed text-stone-600 sm:text-base">
        “Y ahora permanecen la fe, la esperanza y el amor, estos tres; pero el mayor de ellos es el amor.”
        <footer className="mt-2 font-sans text-[10px] uppercase tracking-widest text-[var(--gold)]">1 Corintios 13:13</footer>
      </blockquote>
      <h2 className="mb-6 font-serif text-2xl uppercase tracking-[0.25em] text-[var(--charcoal)]">Faltan</h2>
      <div className="mx-auto grid max-w-xs grid-cols-4 gap-2">
        {timeLeft.map((value, index) => (
          <div key={index} className="rounded-lg border border-stone-200 bg-white p-2.5 shadow-sm">
            <span className="block font-serif text-2xl font-bold text-stone-800">{String(value).padStart(2, '0')}</span>
            <span className="font-sans text-[9px] uppercase tracking-wider text-stone-500">{['Días', 'Horas', 'Minutos', 'Segundos'][index]}</span>
          </div>
        ))}
      </div>
      <p className="mt-6 font-script text-3xl text-stone-600">Para nuestro gran día</p>
    </section>
  )
}

export default Countdown
