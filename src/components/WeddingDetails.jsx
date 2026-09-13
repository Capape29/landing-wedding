function LocationButton({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="mt-4 inline-flex rounded-full border border-[var(--gold)] px-5 py-2 font-sans text-[10px] uppercase tracking-wider text-[var(--kraft-dark)] transition hover:bg-[var(--gold)] hover:text-white">
      {children}
    </a>
  )
}

function WeddingDetails() {
  return (
    <section className="px-6 py-10">
      <div className="mb-8 text-center">
        <span className="font-serif text-xs font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">El gran día</span>
        <h2 className="mt-1 font-serif text-3xl text-[var(--charcoal)]">Nuestra celebración</h2>
        <p className="mt-5 font-serif text-2xl text-[var(--kraft-dark)]">Bonanza Restaurante Bar</p>
        <p className="mt-2 font-serif text-stone-600">Compartiremos la ceremonia y la recepción en un mismo lugar.</p>
      </div>
      <div className="relative mx-auto max-w-md py-2 before:absolute before:bottom-10 before:left-5 before:top-10 before:w-px before:bg-[var(--gold-light)] sm:before:left-1/2">
        <article className="relative mb-10 pl-14 sm:pr-[calc(50%+2rem)] sm:text-right">
          <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#fcfaf6] bg-[var(--gold)] text-sm text-amber-100 shadow-md sm:left-1/2 sm:-translate-x-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M14.504 8.522l-1.758 -4.032a.814 .814 0 0 0 -1.492 0l-1.759 4.032c-.19 .436 -.537 .784 -.973 .973l-4.032 1.759a.814 .814 0 0 0 0 1.492l4.033 1.758c.436 .19 .784 .538 .973 .974l1.759 4.033a.814 .814 0 0 0 1.492 0l1.758 -4.033c.19 -.436 .538 -.784 .974 -.974l4.033 -1.758a.814 .814 0 0 0 0 -1.492l-4.033 -1.759a1.88 1.88 0 0 1 -.974 -.973" />
              <path d="M3 3l2 2" />
              <path d="M21 3l-2 2" />
              <path d="M3 21l2 -2" />
              <path d="M21 21l-2 -2" />
            </svg>
          </div>
          <p className="font-sans text-xl font-semibold uppercase tracking-wide text-[var(--gold)]">5:00 pm</p>
          <h3 className="mt-1 font-serif text-3xl text-[var(--charcoal)]">Ceremonia</h3>
          <p className="mt-2 font-serif leading-relaxed text-stone-600">Al aire libre</p>
        </article>
        <article className="relative pl-14 sm:pl-[calc(50%+2rem)]">
          <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full border-4 border-[#fcfaf6] bg-[var(--kraft)] text-xl text-amber-100 shadow-md sm:left-1/2 sm:-translate-x-1/2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M8 21l8 0" />
              <path d="M12 15l0 6" />
              <path d="M17 3l1 7c0 3.012 -2.686 5 -6 5s-6 -1.988 -6 -5l1 -7h10" />
              <path d="M6 10a5 5 0 0 1 6 0a5 5 0 0 0 6 0" />
            </svg>
          </div>
          <p className="font-sans text-xl font-semibold uppercase tracking-wide text-[var(--kraft-dark)]">7:00 pm</p>
          <h3 className="mt-1 font-serif text-3xl text-[var(--charcoal)]">Recepción</h3>
          <p className="mt-2 font-serif leading-relaxed text-stone-600">Dentro del restaurante</p>
        </article>
      </div>
      <div className="mx-auto mt-6 flex max-w-md flex-wrap justify-center gap-x-4">
        <LocationButton href="https://www.google.com/maps/place/Bonanza+Restaurante+Bar/@6.8835088,-73.0532176,940m/data=!3m2!1e3!4b1!4m6!3m5!1s0x8e684990892fd8c3:0xec2bcd0d8999e108!8m2!3d6.8835088!4d-73.0532176!16s%2Fg%2F11c2085qsr?entry=ttu&g_ep=EgoyMDI2MDkwOS4wIKXMDSoASAFQAw%3D%3D">
          Ver ubicación
        </LocationButton>
        <LocationButton href="https://www.instagram.com/s/aGlnaGxpZ2h0OjE4MDczNTgyNzIxMzIwMjMw?story_media_id=3868689329472560017_3223901438&stkn=MW90YmQ4YWxtMno5aQ%3D%3D">
          Cómo llegar
        </LocationButton>
      </div>
    </section>
  )
}

export default WeddingDetails
