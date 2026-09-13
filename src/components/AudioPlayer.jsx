import { useEffect, useRef, useState } from 'react'

function AudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
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
    } catch {
      setIsPlaying(false)
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const handleLoadedMetadata = () => setDuration(audio.duration || 0)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value)
    if (audioRef.current) {
      audioRef.current.currentTime = nextTime
    }
    setCurrentTime(nextTime)
  }

  const seekBy = (seconds) => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const nextTime = Math.min(Math.max(audio.currentTime + seconds, 0), duration || Infinity)
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const formatTime = (time) => {
    if (!Number.isFinite(time)) {
      return '0:00'
    }

    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60).toString().padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  return (
    <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-stone-200 bg-stone-50/80 px-4 py-3 text-left shadow-sm backdrop-blur-sm">
      <audio ref={audioRef} src="/audio/cancion.mp3" preload="none" loop />
      <p className="mb-2 text-center font-serif text-sm italic text-stone-700">
        Dale play para escuchar nuestra canción
      </p>
      <div className="mb-3 flex items-center gap-2">
        <span className="w-8 text-right font-sans text-[10px] tabular-nums text-stone-500">
          {formatTime(currentTime)}
        </span>
        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={Math.min(currentTime, duration || 0)}
          onChange={handleSeek}
          aria-label="Progreso de la canción"
          className="h-1.5 w-full cursor-pointer accent-[var(--kraft-dark)]"
        />
        <span className="w-8 font-sans text-[10px] tabular-nums text-stone-500">
          {formatTime(duration)}
        </span>
      </div>
      <div className="flex items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => seekBy(-5)}
          aria-label="Retroceder 5 segundos"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs text-stone-600 transition hover:bg-stone-200 hover:text-[var(--kraft-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <span aria-hidden="true" className="relative font-semibold">↶<small className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px]">5</small></span>
        </button>
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
        <button
          type="button"
          onClick={() => seekBy(5)}
          aria-label="Adelantar 5 segundos"
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs text-stone-600 transition hover:bg-stone-200 hover:text-[var(--kraft-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <span aria-hidden="true" className="relative font-semibold">↷<small className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[7px]">5</small></span>
        </button>
      </div>
    </div>
  )
}

export default AudioPlayer
