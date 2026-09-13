import RevealImage from './RevealImage'

function DressCode() {
  return (
    <section className="relative overflow-hidden bg-stone-50 px-6 py-10 text-center">
      <div className="relative z-10">
        <h2 className="font-script text-5xl text-[var(--gold)]">Dress code</h2>
        <p className="mb-6 font-serif text-xs uppercase tracking-[0.2em] text-stone-500">Rigurosa etiqueta</p>
      </div>

      <div className="relative z-10 mx-auto max-w-5xl overflow-hidden rounded-[1.5rem] bg-[#f7f3ee]/5 p-6">
        <RevealImage
          as="div"
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            backgroundImage: "url('/images/dresscode.webp')",
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            opacity: 0.3,
          }}
        />

        <div className="relative z-10 grid gap-4 md:grid-cols-2">
          <div className="flex items-center justify-center p-4">
            <p className="font-serif text-[28px] leading-[1.1] text-stone-700 italic">
              <span className="font-medium text-stone-900 not-italic">Damas:</span> Monos formales, largos o cortos, que reflejen elegancia y sofisticación.
            </p>
          </div>

          <div className="flex items-center justify-center p-4">
            <p className="font-serif text-[28px] leading-[1.1] text-stone-700 italic">
              <span className="font-medium text-stone-900 not-italic">Caballeros:</span> Camisa manga larga con cuello mao y pantalón formal
            </p>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-6 max-w-[440px] rounded-md bg-[#8c5333] px-5 py-4 text-center text-[15px] font-serif italic text-amber-100 shadow-none">
          El color blanco está reservado exclusivamente para la novia.
          <br />
          Colores prohibidos: beige y azul pastel.
        </div>
      </div>
    </section>
  )
}

export default DressCode
