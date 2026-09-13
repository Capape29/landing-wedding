import AudioPlayer from './AudioPlayer'
import RevealImage from './RevealImage'

const couplePhoto = '/images/imagen_1.webp'

function InvitationHero() {
  return (
    <header className="px-6 pb-8 pt-10 text-center">
      <div className="mb-3 inline-flex items-center gap-3 text-[var(--gold)]">
        <span className="h-px w-10 bg-[var(--gold-light)]" />
        <span className="font-serif text-xs uppercase tracking-[0.3em] text-stone-500">Nuestra boda</span>
        <span className="h-px w-10 bg-[var(--gold-light)]" />
      </div>
      <h1 className="font-script text-5xl leading-none text-[var(--kraft-dark)] sm:text-6xl">
        Gustavo <span className="font-serif text-3xl italic text-stone-400">&amp;</span> Laura
      </h1>
      <p className="mt-4 font-serif text-sm font-medium uppercase tracking-[0.25em] text-stone-700">5 diciembre 2026</p>

      <div className="relative mx-auto mt-8 max-w-[calc(100vw-3rem)] pb-2 sm:max-w-[440px]">
        <div className="relative overflow-visible border-0 bg-transparent p-0 shadow-none">
          <div className="relative z-10 mx-auto w-full max-w-[360px] rotate-[-1deg] sm:max-w-[400px]">
            <div className="aspect-[4/5] overflow-hidden">
              <RevealImage src={couplePhoto} alt="Gustavo y Laura" className="h-full w-full object-cover saturate-[0.85]" />
            </div>
          </div>
        </div>
      </div>
      <AudioPlayer />
    </header>
  )
}

export default InvitationHero
