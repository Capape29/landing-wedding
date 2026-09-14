// Pegar aquí el enlace del álbum de Google Photos con colaboración activada.
const GOOGLE_PHOTOS_ALBUM_URL = 'https://photos.app.goo.gl/KCYiQEM9m7xJpbzo7'

function PhotoGallery() {
  const buttonClassName = 'inline-flex min-h-11 items-center justify-center rounded-full bg-[#c5ab84] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#b99d74] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#8e5630]'

  return (
    <div className="grid grid-cols-[2rem_minmax(0,1fr)_2rem] items-center gap-2 sm:grid-cols-[3rem_minmax(0,1fr)_3rem] sm:gap-4">
      <img src="/images/camara.svg" alt="" className="h-auto w-full -rotate-12 sepia saturate-50" />
      <div className="min-w-0 space-y-6 text-center">
      <div className="space-y-2">
        <h2 className="font-serif text-3xl text-[#4e3f2d]">Álbum colaborativo</h2>
        <p className="text-sm text-[#6b5b45] sm:text-base">
          Tu mirada, nuestro recuerdo. 
        </p>
        <p className="text-sm text-[#6b5b45] sm:text-base">Sube tus mejores fotos y videos de nuestra boda.
        </p> 
        <p className="text-sm text-[#6b5b45] sm:text-base">¡Queremos revivir este día desde tus ojos!
        </p>
      </div>

      <div className="space-y-3">
        {GOOGLE_PHOTOS_ALBUM_URL ? (
          <a
            href={GOOGLE_PHOTOS_ALBUM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClassName}
            aria-describedby="album-help"
          >
            Compartir fotos
          </a>
        ) : (
          <button
            type="button"
            disabled
            className={`${buttonClassName} cursor-not-allowed opacity-60`}
            aria-describedby="album-status album-help"
          >
            Compartir fotos
          </button>
        )}
        {!GOOGLE_PHOTOS_ALBUM_URL && (
          <p id="album-status" className="text-sm text-[#6b5b45]">
            El álbum estará disponible próximamente.
          </p>
        )}
        <p id="album-help" className="mx-auto max-w-sm text-xs leading-relaxed text-[#6b5b45]">
          Se abrirá Google Photos. Inicia sesión con tu cuenta de Google para añadir tus fotos.
        </p>
      </div>
      </div>
      <img src="/images/camara.svg" alt="" className="h-auto w-full -scale-x-100 rotate-12 sepia saturate-50" />
    </div>
  )
}

export default PhotoGallery
