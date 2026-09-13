import AudioPlayer from './AudioPlayer'

const couplePhoto =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAzNUmHvYS_QAlnR4MNQ3To-Hrt8qxYrtoowuTorI4llcietXina-0wuIxvgxT7UD3EE3jIxAiy150cBjSPXiq8P68SMDnxWliPM-Iqkp9RNf71VaZNjO1bn2rZ6vTPCNd9W9IU9A4hUxNxI14k1vrMe2jZwI1GlLy2D6rDxgj5zMtbvg9SgMZK2iWzG8CPtdoVyvhBqYVw-a0gTh7oy464FZpEgRCJB7h3LZTGHhv1dGdb-Z6_a-KShg'

function InvitationHero() {
  return (
    <header className="px-6 pb-8 pt-10 text-center">
      <div className="mb-3 inline-flex items-center gap-3 text-[var(--gold)]">
        <span className="h-px w-10 bg-[var(--gold-light)]" />
        <span className="font-serif text-xs uppercase tracking-[0.3em] text-stone-500">Nuestra boda</span>
        <span className="h-px w-10 bg-[var(--gold-light)]" />
      </div>
      <h1 className="font-script text-5xl leading-none text-[var(--kraft-dark)] sm:text-6xl">
        Fernando <span className="font-serif text-3xl italic text-stone-400">&amp;</span> Liliana
      </h1>
      <p className="mt-4 font-serif text-sm font-medium uppercase tracking-[0.25em] text-stone-700">22 octubre 2026</p>

      <div className="relative mx-auto mt-8 max-w-[340px] pb-2">
        <div className="absolute -right-4 -top-4 z-20 text-2xl text-[var(--gold)]">✿</div>
        <div className="relative overflow-hidden border border-[#a66e40] bg-[var(--kraft)] p-3 pb-8 pt-8 shadow-xl">
          <div className="absolute inset-x-0 top-0 h-24 bg-[var(--kraft-dark)] [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)] opacity-80" />
          <div className="relative z-10 mx-auto w-[240px] rotate-[-1deg] border border-stone-100 bg-white p-3 pb-5 shadow-md">
            <div className="aspect-[4/5] overflow-hidden bg-stone-200">
              <img src={couplePhoto} alt="Fernando y Liliana" className="h-full w-full object-cover saturate-[0.85]" />
            </div>
            <p className="mt-2 font-script text-xl text-stone-700">Fernando &amp; Liliana</p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 z-10 flex h-16 items-center justify-center border-t border-[#a8703f]/60 bg-[#b07746]">
            <span className="font-serif text-[10px] uppercase tracking-[0.25em] text-[#f3e3d3]">Boda soñada</span>
          </div>
        </div>
      </div>
      <AudioPlayer />
    </header>
  )
}

export default InvitationHero
