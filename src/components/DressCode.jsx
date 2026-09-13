function DressCode() {
  return (
    <section className="bg-stone-50 px-6 py-10 text-center">
      <h2 className="font-script text-5xl text-[var(--gold)]">Dress code</h2>
      <p className="mb-6 font-serif text-xs uppercase tracking-[0.2em] text-stone-500">Rigurosa etiqueta</p>
      <div className="border border-stone-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center justify-center gap-8 py-2 text-5xl text-stone-700">
          <span aria-label="Vestido de noche" role="img">♧</span>
          <span className="h-16 w-px bg-stone-200" />
          <span aria-label="Traje formal" role="img">♤</span>
        </div>
        <div className="space-y-1 font-serif text-sm text-stone-700">
          <p><strong className="font-medium text-stone-900">Caballeros:</strong> Traje formal o esmoquin</p>
          <p><strong className="font-medium text-stone-900">Damas:</strong> Vestido largo de noche</p>
        </div>
        <div className="mt-6 inline-block rounded-md bg-[#8c5333] px-5 py-3 font-serif text-xs italic text-amber-100 shadow-inner">El color blanco está reservado exclusivamente para la novia</div>
      </div>
    </section>
  )
}

export default DressCode
