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
    <>
      <audio ref={audioRef} src="/audio/cancion.mp3" preload="none" loop />
      <button
        type="button"
        onClick={handleToggle}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-[#c5ab84] bg-[#f5ead8] px-5 py-3 text-sm font-medium text-[#5a472f] shadow-lg shadow-[#bca178]/30 transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#f0e1ca] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c5ab84]"
      >
        <span className={isPlaying ? 'animate-pulse' : ''}>
          {isPlaying ? '⏸️ Pausar' : '🎵 Nuestra Canción'}
        </span>
        {hasInteracted ? null : (
          <span className="ml-2 text-xs text-[#83694a]">Toca para escuchar</span>
        )}
      </button>
    </>
  )
}

export default AudioPlayer
