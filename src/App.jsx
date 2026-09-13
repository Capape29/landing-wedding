import Countdown from './components/Countdown'
import DressCode from './components/DressCode'
import InvitationHero from './components/InvitationHero'
import PhotoGallery from './components/PhotoGallery'
import RSVPWizard from './components/RSVPWizard'
import WeddingDetails from './components/WeddingDetails'

function App() {
  return (
    <main className="min-h-screen bg-stone-100 text-[var(--charcoal)] selection:bg-[#debea0] selection:text-[var(--charcoal)]">
      <div className="mx-auto min-h-screen w-full max-w-xl overflow-hidden border-x border-stone-200 bg-[#fcfaf6] shadow-2xl">
        <InvitationHero />

        <section className="px-6 py-8 text-center">
          <div className="border border-[#c4a480] bg-white/90 p-8 shadow-md">
            <p className="font-serif text-base italic leading-relaxed text-stone-700">
              “Con la bendición de Dios y el amor que une nuestras vidas, queremos compartir con ustedes la alegría de este día en el que uniremos nuestros corazones para siempre.”
            </p>
            <div className="my-6 flex items-center justify-center gap-4">
              <span className="h-px w-12 bg-stone-300" />
              <span className="font-script text-3xl text-[var(--gold)]">G &amp; L</span>
              <span className="h-px w-12 bg-stone-300" />
            </div>
            <h2 className="font-serif text-xl uppercase tracking-widest">Gustavo &amp; Laura</h2>
            <p className="mt-1 font-serif text-lg font-semibold tracking-widest text-[var(--kraft-dark)]">5 · 12 · 2026</p>
            <a href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=Boda+de+Gustavo+y+Laura&dates=20261205T210000Z/20261206T080000Z" target="_blank" rel="noreferrer" className="mt-8 inline-flex rounded-full bg-[var(--kraft-dark)] px-6 py-3 font-sans text-[10px] uppercase tracking-widest text-white shadow-md transition hover:bg-[var(--charcoal)]">Añádelo a tu calendario</a>
          </div>
        </section>

        <Countdown />
        <WeddingDetails />

        <section className="py-6" aria-label="Detalles de nuestra celebración">
          <img
            src="/images/imagen2.webp"
            alt="Detalles de la celebración de la boda"
            className="h-auto w-full rounded-none object-contain shadow-sm"
          />
        </section>

        <DressCode />

        <section aria-label="Momentos de nuestra historia" className="py-6">
          <img
            src="/images/imagen4.webp"
            alt="Momento especial de la boda"
            className="h-auto w-full rounded-none object-contain shadow-sm"
          />
        </section>

        <section id="album" className="bg-[#f8f4ee] px-6 py-8">
          <PhotoGallery />
        </section>

        <section className="px-6 py-10">
          <div className="grid grid-cols-2 gap-4">
            <a href="#rsvp-section" className="rounded-[2rem] bg-[var(--kraft)] p-5 text-center text-white shadow-md transition hover:-translate-y-1">
              <span className="font-serif text-xs uppercase tracking-widest">Música</span>
              <span className="my-3 block text-3xl text-amber-200">♫</span>
              <span className="font-serif text-xs leading-relaxed">Sugiérenos una canción para la fiesta</span>
            </a>
            <a href="#album" className="rounded-[2rem] bg-[#9e6738] p-5 text-center text-white shadow-md transition hover:-translate-y-1">
              <span className="font-serif text-xs uppercase tracking-widest">Fotos</span>
              <span className="my-3 block text-3xl text-amber-200">▧</span>
              <span className="font-serif text-xs leading-relaxed">Comparte tus recuerdos con nosotros</span>
            </a>
          </div>
          <div className="mt-6 border border-[#c4a480] bg-white p-6 text-center shadow-sm">
            <span className="font-sans text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--kraft-dark)]">Recomendaciones</span>
            <p className="mt-2 font-serif text-sm italic text-stone-600">Tu presencia es muy importante para nosotros, por eso te invitamos a llegar a tiempo.</p>
          </div>
        </section>

        <section id="rsvp-section" className="bg-gradient-to-b from-transparent to-stone-200/50 px-6 py-12">
          <div className="relative rounded-b-xl border border-[#a66e40] bg-[var(--kraft)] p-4 pt-10 shadow-2xl">
            <div className="relative z-10 bg-white p-6 shadow-md sm:p-8">
              <h2 className="font-serif text-2xl uppercase tracking-widest">Confirmar asistencia</h2>
              <p className="mt-2 font-serif text-sm italic text-stone-600">Haznos saber si podremos contar contigo en este día tan especial.</p>
              <div className="mt-6"><RSVPWizard /></div>
            </div>
            <div className="relative z-20 mx-auto -mb-9 flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white bg-[var(--gold)] font-script text-xl text-amber-100 shadow-md">GL</div>
          </div>
          <div className="mt-12 text-center">
            <p className="font-script text-5xl text-[var(--kraft-dark)]">¡No faltes!</p>
            <p className="mt-2 font-serif text-xs uppercase tracking-[0.25em] text-stone-500">Esperamos celebrar contigo</p>
          </div>
        </section>

        <footer className="bg-stone-900 px-4 py-6 text-center font-serif text-xs tracking-wider text-stone-400">
          <p className="text-stone-300">Gustavo &amp; Laura · 5 de diciembre de 2026</p>
          <p className="mt-1 text-[10px] uppercase tracking-widest text-stone-500">Con amor para toda la vida</p>
        </footer>
      </div>
    </main>
  )
}

export default App
