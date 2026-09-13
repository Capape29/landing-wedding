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
      <div className="relative mx-auto max-w-md py-2 before:absolute before:bottom-10 before:left-5 before:top-10 before:w-px before:bg-[var(--gold-light)] sm:before:left-1/2">
        <article className="relative mb-10 pl-14 sm:pr-[calc(50%+2rem)] sm:text-right">
          <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#fcfaf6] bg-[var(--gold)] text-sm text-amber-100 shadow-md sm:left-1/2 sm:-translate-x-1/2">✦</div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--gold)]">4:00 pm · Momento sagrado</p>
          <h3 className="mt-1 font-serif text-3xl text-[var(--charcoal)]">Ceremonia</h3>
          <p className="mt-2 font-serif leading-relaxed text-stone-600">Parroquia Nuestra Señora de la Salud<br /><strong className="font-medium text-stone-800">Bojacá</strong></p>
          <div className="mt-3 text-3xl text-stone-500">♜</div>
          <LocationButton href="https://maps.google.com/?q=Parroquia+Nuestra+Señora+de+la+Salud+Bojaca" />
        </article>
        <article className="relative pl-14 sm:pl-[calc(50%+2rem)]">
          <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#fcfaf6] bg-[var(--kraft)] text-xl text-amber-100 shadow-md sm:left-1/2 sm:-translate-x-1/2">⌂</div>
          <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--kraft-dark)]">6:00 pm · Celebración</p>
          <h3 className="mt-1 font-serif text-3xl text-[var(--charcoal)]">Recepción</h3>
          <p className="mt-2 font-serif text-lg italic text-stone-600">Finca Villa Luz</p>
          <LocationButton href="https://maps.google.com/?q=Finca+Villa+Luz+Bojaca" />
        </article>
      </div>
    </section>
  )
}

export default WeddingDetails
