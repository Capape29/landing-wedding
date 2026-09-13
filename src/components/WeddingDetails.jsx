function LocationButton({ href }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-[var(--gold)] px-5 py-2 font-sans text-[10px] uppercase tracking-wider text-[var(--kraft-dark)] transition hover:bg-[var(--gold)] hover:text-white">
      Ver ubicación
    </a>
  )
}

function WeddingDetails() {
  return (
    <section className="px-6 py-10">
      <div className="mb-8 text-center">
        <span className="font-serif text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">El gran día</span>
        <h2 className="mt-1 font-serif text-3xl text-[var(--charcoal)]">Nuestra celebración</h2>
      </div>
      <div className="space-y-8">
        <article className="relative rounded-lg border border-stone-200 bg-white p-6 pt-9 text-center shadow-md">
          <div className="absolute -top-6 left-1/2 flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-2 border-dashed border-white bg-[var(--gold)] text-lg text-amber-100 shadow-md">✦</div>
          <span className="font-serif text-xs font-semibold uppercase tracking-[0.25em] text-[var(--kraft-dark)]">Momento sagrado</span>
          <h3 className="mt-1 font-serif text-2xl tracking-wide">Ceremonia</h3>
          <p className="mt-2 font-serif leading-relaxed text-stone-600">Parroquia Nuestra Señora de la Salud<br /><strong className="font-medium text-stone-800">Bojacá · 4:00 pm</strong></p>
          <div className="my-4 text-4xl text-stone-500">♜</div>
          <LocationButton href="https://maps.google.com/?q=Parroquia+Nuestra+Señora+de+la+Salud+Bojaca" />
        </article>
        <article className="relative overflow-hidden rounded-[2.5rem] border-2 border-white bg-[var(--kraft)] p-8 text-center text-white shadow-lg">
          <h3 className="font-serif text-2xl uppercase tracking-widest text-amber-50">Recepción</h3>
          <p className="mt-1 font-serif text-lg italic text-stone-100">Finca Villa Luz</p>
          <p className="font-serif text-sm uppercase tracking-wider text-amber-100">6:00 pm</p>
          <div className="my-5 text-5xl text-white/90">⌂</div>
          <a href="https://maps.google.com/?q=Finca+Villa+Luz+Bojaca" target="_blank" rel="noreferrer" className="inline-flex rounded-full border border-white/40 bg-white/20 px-5 py-2 font-sans text-[10px] uppercase tracking-wider text-white transition hover:bg-white hover:text-[var(--kraft-dark)]">Ver ubicación</a>
        </article>
      </div>
    </section>
  )
}

export default WeddingDetails
