import AudioPlayer from './components/AudioPlayer'
import PhotoGallery from './components/PhotoGallery'
import RSVPWizard from './components/RSVPWizard'

function App() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f1e7,_#f3ece2_40%,_#eee5d9)] px-4 py-10 text-[#3f3528] sm:px-6 lg:px-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 animate-fade-in">
        <header className="rounded-3xl border border-[#d8c9b2]/60 bg-white/70 px-6 py-10 text-center shadow-lg shadow-[#d8c9b2]/20 backdrop-blur sm:px-10">
          <p className="text-xs uppercase tracking-[0.45em] text-[#9d835f]">Boda</p>
          <h1 className="mt-4 font-serif text-4xl text-[#4e3f2d] sm:text-5xl">
            Nuestra Invitación
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-[#6b5b45] sm:text-base">
            Gracias por acompañarnos en el día más especial de nuestras vidas.
            Confirma tu asistencia, comparte tus canciones favoritas y súmate al
            álbum colaborativo.
          </p>
        </header>

        <section className="rounded-3xl border border-[#d8c9b2]/60 bg-white/75 p-6 shadow-md shadow-[#d8c9b2]/15 backdrop-blur sm:p-8">
          <RSVPWizard />
        </section>

        <section className="rounded-3xl border border-[#d8c9b2]/60 bg-white/75 p-6 shadow-md shadow-[#d8c9b2]/15 backdrop-blur sm:p-8">
          <PhotoGallery />
        </section>
      </div>

      <AudioPlayer />
    </main>
  )
}

export default App
