import { useState } from 'react'
import SongPicker from './SongPicker'
import { normalizeSongs, songTitle } from '../../shared/songs.js'

function label(song) {
  const element = document.createElement('textarea')
  element.innerHTML = songTitle(song)
  return element.value
}
export default function SongCollection({ songs, onChange, onDraftChange, code, disabled, closed, dirty }) {
  const [generation, setGeneration] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  function reset() { setGeneration(n => n + 1); setError(''); onDraftChange(false) }
  function add(value) {
    try {
      const normalized = normalizeSongs([value])[0]
      if (songs.some(song => (normalized.youtubeUrl ? song.youtubeUrl === normalized.youtubeUrl : !song.youtubeUrl && song.title.toLocaleLowerCase() === normalized.title.toLocaleLowerCase() && song.artist.toLocaleLowerCase() === normalized.artist.toLocaleLowerCase()))) throw new Error('Esta canción ya está en tu lista.')
      if (songs.length >= 4) throw new Error('Ya elegiste cuatro canciones. Quita una para agregar otra.')
      const selected = { ...normalized, ...(value.youtube ? { youtube: value.youtube } : {}) }
      onChange([...songs, selected])
      setMessage('No salgas sin guardar tus canciones.')
      reset()
    } catch (e) { setError(e.message) }
  }
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2"><h3 className="font-serif text-lg">Tu lista para el DJ</h3><span className="shrink-0 rounded-full bg-[#f5ead8] px-3 py-1 text-sm">{songs.length} de 4</span></div>
    {!songs.length ? <p className="text-sm text-stone-500">Busca una canción y agrégala a tu lista para empezar.</p> : <ol className={`divide-y rounded-xl border-2 px-3 transition-colors ${dirty ? 'divide-amber-200 border-amber-500 bg-amber-50/50' : 'divide-[#d6e2d7] border-[#799781] bg-[#f4f8f3]'}`}>
      {songs.map((song, index) => <li key={index} className="relative flex items-start gap-3 py-3 pr-9">
        <span className="pt-1 text-sm text-stone-500">{index + 1}.</span><div className="min-w-0 flex-1"><p className="break-words text-sm font-semibold">{label(song)}</p>{song.artist && <p className="text-xs">{song.artist}</p>}
          {song.youtubeUrl && <a href={song.youtubeUrl} target="_blank" rel="noopener noreferrer" className="inline-block py-2 text-xs underline">Abrir en YouTube</a>}
          {!closed && <button type="button" disabled={disabled} className="absolute -right-2 top-1 flex h-11 w-11 items-center justify-center rounded-full text-xl text-stone-500 hover:bg-black/5 hover:text-stone-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8e5630] disabled:opacity-50" aria-label={`Quitar canci\u00f3n ${index + 1}`} onClick={() => { onChange(songs.filter((_, i) => i !== index)); reset(); setMessage('No salgas sin guardar tus canciones.') }}><span aria-hidden="true">&times;</span></button>}
        </div>
      </li>)}
    </ol>}
    {message && dirty && <p role="status" className="rounded-xl border-l-4 border-amber-600 bg-amber-100 px-4 py-3 text-sm font-bold text-amber-950">{message}</p>}
    {!closed && songs.length < 4 && <div className="space-y-2">
      <SongPicker key={generation} song={{ title: '', artist: '' }} index={0} code={code} onSelect={add} editing={false} disabled={disabled} />
      {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    </div>}
    {!closed && songs.length === 4 && <p role="status" className="rounded-xl bg-[#f5ead8] p-3 text-sm">Tu lista está completa. Puedes quitar una para agregar otra antes de guardar.</p>}
  </div>
}
