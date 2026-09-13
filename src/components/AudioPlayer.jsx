import { useEffect, useRef, useState } from 'react'

function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [hasInteracted, setHasInteracted] = useState(false)
  const audioRef = useRef(null)

  const handleToggle = async () => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    try {
      if (isPlaying) {
        audio.pause()
        setIsPlaying(false)
      } else {
        await audio.play()
        setIsPlaying(true)
      }
      setHasInteracted(true)
    } catch {
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const handleEnded = () => setIsPlaying(false)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm">
      <audio ref={audioRef} src="/audio/cancion.mp3" preload="none" loop />
      <p className="mb-2 text-center font-serif text-sm italic text-stone-700">
        Dale play para escuchar nuestra canción
      </p>
      <div className="flex items-center justify-center gap-4">
        <span aria-hidden="true" className="text-sm text-[var(--gold)]">♫</span>
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isPlaying ? 'Pausar nuestra canción' : 'Reproducir nuestra canción'}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--charcoal)] text-lg text-stone-100 shadow-md transition-all hover:scale-105 hover:bg-[var(--kraft-dark)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <span aria-hidden="true" className={isPlaying ? 'animate-pulse' : ''}>
            {isPlaying ? 'Ⅱ' : '▶'}
          </span>
        </button>
        <span className="min-w-24 text-left text-xs text-stone-500">
          {hasInteracted ? (isPlaying ? 'Reproduciendo' : 'En pausa') : 'Toca para escuchar'}
        </span>
      </div>
    </div>
  )
}

export default AudioPlayer
