import Countdown from './components/Countdown'
import RevealImage from './components/RevealImage'
import DressCode from './components/DressCode'
import GiftSection from './components/GiftSection'
import InvitationHero from './components/InvitationHero'
import PhotoGallery from './components/PhotoGallery'
import RSVPWizard from './components/RSVPWizard'
import WeddingDetails from './components/WeddingDetails'

function App() {
  return (
    <main className="min-h-screen bg-stone-100 text-[var(--charcoal)] selection:bg-[#debea0] selection:text-[var(--charcoal)]">
      <div className="mx-auto min-h-screen w-full max-w-xl overflow-hidden border-x border-stone-200 bg-[#fcfaf6] shadow-2xl">
        <InvitationHero />

        <Countdown />
        <WeddingDetails />

        <section className="py-6" aria-label="Detalles de nuestra celebración">
          <RevealImage
            src="/images/imagen10.webp"
            alt="Detalles de la celebración de la boda"
            className="fade-edge-image h-auto w-full rounded-none object-contain shadow-sm"
          />
        </section>

        <DressCode />

        <section aria-label="Momentos de nuestra historia" className="py-6">
          <RevealImage
            src="/images/imagen6.webp"
            alt="Momento especial de la boda"
            className="fade-edge-image h-auto w-full rounded-none object-contain shadow-sm"
          />
        </section>

        <GiftSection />

        <section id="album" className="px-6 py-8">
          <PhotoGallery />
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
