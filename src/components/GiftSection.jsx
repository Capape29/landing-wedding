function GiftSection() {
  return (
    <section id="regalos" className="bg-[#f7efe5] px-6 py-10">
      <div className="mx-auto max-w-md text-center">
        <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--gold)]">
          Regalos
        </p>
        <h2 className="mt-2 font-serif text-4xl text-[var(--charcoal)]">
          Tu presencia es nuestro regalo
        </h2>

        <div className="mt-5 rounded-[2rem] border border-[#d7c2a0] bg-white/80 p-6 shadow-sm">
          <p className="font-serif text-lg leading-relaxed text-stone-700">
            Lo más valioso para nosotros es compartir este momento contigo. Si deseas hacernos un detalle, con cariño lo recibiremos como un gesto de apoyo a nuestro nuevo comienzo.
          </p>

          <div className="mt-5 border-t border-[#eadfc8] pt-4">
            <p className="font-sans text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--kraft-dark)]">
              Nota
            </p>
            <p className="mt-2 font-serif text-base italic text-stone-600">
              Tu compañía y tus buenos deseos son el mejor regalo de todos.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default GiftSection
